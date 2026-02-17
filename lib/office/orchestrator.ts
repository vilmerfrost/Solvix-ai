import * as XLSX from "xlsx";
import { createServiceRoleClient } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/audit";
import { dispatchWebhook } from "@/lib/webhooks";
import { classifyOfficeDocument } from "./classification";
import { getPublishedSchemaForDocType, persistClassification } from "./schema-store";
import { extractOfficeStructuredData } from "./extraction";
import { validateOfficeExtraction } from "./validation";
import { createOrUpdateReviewTask } from "./workflow";
import { evaluateSlaForDocument } from "./sla";
import type { OfficeExtractionResult, OfficeProcessingOptions } from "./types";

const DEFAULT_OPTIONS: OfficeProcessingOptions = {
  autoApproveThreshold: 90,
  highConfidenceThreshold: 0.85,
  lowConfidenceThreshold: 0.5,
};

function readBufferToText(filename: string, data: ArrayBuffer): string {
  if (filename.toLowerCase().endsWith(".pdf")) {
    return Buffer.from(data).toString("utf8");
  }
  if (filename.toLowerCase().endsWith(".xlsx") || filename.toLowerCase().endsWith(".xls")) {
    const workbook = XLSX.read(data);
    const parts: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as Array<Array<string | number>>;
      parts.push(
        rows
          .map((r) => r.map((c) => String(c)).join(" | "))
          .join("\n")
      );
    }
    return parts.join("\n\n");
  }
  return "";
}

function mapOfficeResultToLegacy(extracted: OfficeExtractionResult): Record<string, unknown> {
  return {
    documentDomain: extracted.documentDomain,
    docType: extracted.docType,
    schemaId: extracted.schemaId || null,
    schemaVersion: extracted.schemaVersion || 1,
    classification: extracted.classification,
    fields: extracted.fields,
    tables: extracted.tables,
    links: extracted.links,
    statusSignals: extracted.statusSignals,
    _validation: {
      completeness: extracted.validation.completeness,
      confidence: extracted.validation.confidence,
      issues: [...extracted.validation.blockingIssues, ...extracted.validation.warningIssues],
      blockingIssues: extracted.validation.blockingIssues,
      warningIssues: extracted.validation.warningIssues,
    },
    lineItems: extracted.tables.find((t) => t.key === "line_items")?.rows || [],
    documentType: extracted.docType,
    aiSummary: `Office/IT extraction for ${extracted.docType} with ${extracted.validation.confidence}% confidence`,
    metadata: {
      processedRows: extracted.tables.reduce((sum, t) => sum + t.rows.length, 0),
      confidence: extracted.validation.confidence / 100,
      model: "office-orchestrator-v1",
      provider: "rules+heuristics",
    },
  };
}

function readNumberSetting(
  settings: Record<string, unknown> | undefined,
  key: string,
  fallback: number
): number {
  const value = settings?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readStringSetting(
  settings: Record<string, unknown> | undefined,
  key: string
): string | null {
  const value = settings?.[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export async function processOfficeDocument(params: {
  documentId: string;
  userId: string;
  filename: string;
  fileBuffer: ArrayBuffer;
  settings?: Record<string, unknown>;
  userEmail?: string | null;
  options?: Partial<OfficeProcessingOptions>;
}): Promise<{
  status: "approved" | "needs_review";
  extractedData: Record<string, unknown>;
  classification: OfficeExtractionResult["classification"];
}> {
  const cfg: OfficeProcessingOptions = { ...DEFAULT_OPTIONS, ...(params.options || {}) };
  const rawText = readBufferToText(params.filename, params.fileBuffer);
  const classification = await classifyOfficeDocument({
    userId: params.userId,
    documentId: params.documentId,
    filename: params.filename,
    rawText,
  });

  const schemaData = await getPublishedSchemaForDocType({
    userId: params.userId,
    docType: classification.finalDocType,
    schemaId: classification.schemaId,
  });

  await persistClassification({
    documentId: params.documentId,
    userId: params.userId,
    modelDocType: classification.modelDocType,
    modelConfidence: classification.modelConfidence,
    ruleDocType: classification.ruleDocType,
    finalDocType: classification.finalDocType,
    schemaId: schemaData.schemaId,
    decisionSource: classification.decisionSource,
  });

  await logAuditEvent({
    userId: params.userId,
    documentId: params.documentId,
    action: "document.classified",
    description: `Classified as ${classification.finalDocType}`,
    metadata: {
      modelDocType: classification.modelDocType,
      modelConfidence: classification.modelConfidence,
      ruleDocType: classification.ruleDocType || null,
      finalDocType: classification.finalDocType,
      decisionSource: classification.decisionSource,
    },
  });

  let extracted = extractOfficeStructuredData({
    docType: classification.finalDocType,
    schema: schemaData.definition,
    rawText,
    schemaId: schemaData.schemaId,
    schemaVersion: schemaData.version,
    classification,
  });
  extracted = validateOfficeExtraction(extracted, schemaData.definition);

  const confidence = extracted.validation.confidence;
  const autoApproveThreshold = readNumberSetting(
    params.settings,
    "auto_approve_threshold",
    cfg.autoApproveThreshold
  );

  const shouldApprove =
    extracted.validation.blockingIssues.length === 0 &&
    extracted.validation.completeness >= autoApproveThreshold &&
    confidence >= Math.round(cfg.highConfidenceThreshold * 100);

  const status: "approved" | "needs_review" = shouldApprove ? "approved" : "needs_review";
  const reviewTask = await createOrUpdateReviewTask({
    documentId: params.documentId,
    userId: params.userId,
    status: shouldApprove ? "approved" : "new",
    dueAt: readStringSetting(params.settings, "review_due_at"),
  });

  const supabase = createServiceRoleClient();
  const { data: docRow } = await supabase
    .from("documents")
    .select("created_at")
    .eq("id", params.documentId)
    .maybeSingle();

  await evaluateSlaForDocument({
    documentId: params.documentId,
    userId: params.userId,
    docType: classification.finalDocType,
    createdAt: docRow?.created_at || new Date().toISOString(),
    taskId: reviewTask.id,
    userEmail: params.userEmail || null,
  });

  const normalized = mapOfficeResultToLegacy(extracted);
  await logAuditEvent({
    userId: params.userId,
    documentId: params.documentId,
    action: "document.processed",
    description: `Office/IT extraction (${classification.finalDocType})`,
    metadata: {
      documentDomain: "office_it",
      docType: classification.finalDocType,
      schemaId: schemaData.schemaId || null,
      schemaVersion: schemaData.version,
      confidence,
      completeness: extracted.validation.completeness,
      autoApproved: shouldApprove,
    },
  });

  await dispatchWebhook(params.userId, "document.processed", {
    eventVersion: 1,
    documentId: params.documentId,
    documentDomain: "office_it",
    docType: classification.finalDocType,
    schemaId: schemaData.schemaId || null,
    schemaVersion: schemaData.version,
    classification,
    status,
  });
  await dispatchWebhook(params.userId, "document.classified", {
    eventVersion: 1,
    documentId: params.documentId,
    documentDomain: "office_it",
    docType: classification.finalDocType,
    schemaId: schemaData.schemaId || null,
    classification,
  });

  return {
    status,
    extractedData: normalized,
    classification,
  };
}
