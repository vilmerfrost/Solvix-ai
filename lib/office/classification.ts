import { createServiceRoleClient } from "@/lib/supabase";
import type { ClassificationDecision, DocType } from "./types";

const DOC_TYPE_KEYWORDS: Array<{ docType: DocType; terms: string[] }> = [
  { docType: "invoice", terms: ["invoice", "faktura", "ocr", "iban", "bankgiro"] },
  { docType: "po", terms: ["purchase order", "po", "beställning", "ordernummer"] },
  { docType: "credit_note", terms: ["credit note", "kreditnota", "credit memo"] },
  { docType: "receipt", terms: ["receipt", "kvitto"] },
  { docType: "contract", terms: ["contract", "agreement", "avtal", "renewal"] },
  { docType: "nda", terms: ["nda", "non-disclosure", "sekretess"] },
  { docType: "employment_agreement", terms: ["employment", "anställning", "anställningsavtal"] },
  { docType: "ticket_incident", terms: ["incident", "ticket", "severity", "root cause", "support"] },
  { docType: "ticket_change", terms: ["change request", "change", "approval status", "scheduled"] },
];

function classifyWithKeywords(filename: string, text: string): { docType: DocType; confidence: number } {
  const haystack = `${filename} ${text}`.toLowerCase();
  let best: { docType: DocType; score: number } = { docType: "unknown_office", score: 0 };

  for (const item of DOC_TYPE_KEYWORDS) {
    const score = item.terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    if (score > best.score) {
      best = { docType: item.docType, score };
    }
  }

  if (best.score === 0) {
    return { docType: "unknown_office", confidence: 0.35 };
  }

  const confidence = Math.min(0.5 + best.score * 0.1, 0.95);
  return { docType: best.docType, confidence };
}

interface ClassificationRule {
  id: string;
  priority: number;
  conditions: Record<string, unknown>;
  target_doc_type?: DocType;
  target_schema_id?: string;
}

async function loadRules(userId: string): Promise<ClassificationRule[]> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("classification_rules")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("priority", { ascending: true });
  return (data || []) as ClassificationRule[];
}

function firstMatchingRule(
  rules: ClassificationRule[],
  filename: string,
  text: string
): ClassificationRule | null {
  const filenameLc = filename.toLowerCase();
  const textLc = text.toLowerCase();

  for (const rule of rules) {
    const cond = rule.conditions || {};
    const filenamePattern = typeof cond.filename_pattern === "string" ? cond.filename_pattern : null;
    const keyword = typeof cond.keyword === "string" ? cond.keyword.toLowerCase() : null;

    const filenameOk = filenamePattern ? filenameLc.includes(filenamePattern.toLowerCase()) : true;
    const keywordOk = keyword ? textLc.includes(keyword) || filenameLc.includes(keyword) : true;
    if (filenameOk && keywordOk) return rule;
  }

  return null;
}

export async function classifyOfficeDocument(params: {
  userId: string;
  documentId: string;
  filename: string;
  rawText: string;
}): Promise<ClassificationDecision> {
  const { userId, filename, rawText } = params;
  const modelResult = classifyWithKeywords(filename, rawText);
  const rules = await loadRules(userId);
  const matchedRule = firstMatchingRule(rules, filename, rawText);

  let decision: ClassificationDecision = {
    modelDocType: modelResult.docType,
    modelConfidence: modelResult.confidence,
    finalDocType: modelResult.docType,
    decisionSource: "model",
  };

  if (matchedRule?.target_doc_type) {
    decision = {
      ...decision,
      ruleDocType: matchedRule.target_doc_type,
      finalDocType: matchedRule.target_doc_type,
      schemaId: matchedRule.target_schema_id || undefined,
      decisionSource: "rule_override",
    };
  }

  if (decision.finalDocType === "unknown_office" && decision.modelConfidence < 0.45) {
    decision = { ...decision, decisionSource: "fallback" };
  }

  return decision;
}
