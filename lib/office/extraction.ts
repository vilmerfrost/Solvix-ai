import type { DocType, OfficeExtractionResult, SchemaTemplateDefinition } from "./types";

function readMatch(pattern: RegExp, text: string): string | null {
  const match = text.match(pattern);
  return match?.[1]?.trim() || null;
}

function parseAmount(text: string): number | null {
  const match = text.match(/(?:total|summa|amount)[^\d-]*([\d\s.,]+)/i);
  if (!match) return null;
  const normalized = match[1].replace(/\s/g, "").replace(",", ".");
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) ? value : null;
}

function extractByDocType(docType: DocType, text: string): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  fields.date = readMatch(/(?:date|datum)\s*[:\-]?\s*([0-9]{4}[-/.][0-9]{2}[-/.][0-9]{2})/i, text);
  fields.due_date = readMatch(/(?:due date|förfallodatum)\s*[:\-]?\s*([0-9]{4}[-/.][0-9]{2}[-/.][0-9]{2})/i, text);
  fields.amount = parseAmount(text);
  fields.currency = readMatch(/\b(SEK|EUR|USD|NOK|DKK)\b/i, text) || "SEK";

  if (docType === "invoice" || docType === "po" || docType === "credit_note" || docType === "receipt") {
    fields.supplier = readMatch(/(?:supplier|leverantör)\s*[:\-]?\s*([^\n]+)/i, text);
    fields.customer = readMatch(/(?:customer|kund)\s*[:\-]?\s*([^\n]+)/i, text);
    fields.document_id = readMatch(/(?:invoice|faktura|po|ordernummer|receipt|kvitto)\s*(?:nr|no|number)?\s*[:\-]?\s*([A-Z0-9\-\/]+)/i, text);
  }

  if (docType === "contract" || docType === "nda" || docType === "employment_agreement") {
    fields.party_a = readMatch(/(?:party a|part 1|leverantör|employer)\s*[:\-]?\s*([^\n]+)/i, text);
    fields.party_b = readMatch(/(?:party b|part 2|customer|employee)\s*[:\-]?\s*([^\n]+)/i, text);
    fields.renewal_date = readMatch(/(?:renewal|förnyelse|notice)\s*[:\-]?\s*([0-9]{4}[-/.][0-9]{2}[-/.][0-9]{2})/i, text);
  }

  if (docType === "ticket_incident" || docType === "ticket_change") {
    fields.ticket_id = readMatch(/(?:ticket|incident|change)\s*(?:id|nr|number)?\s*[:\-]?\s*([A-Z0-9\-]+)/i, text);
    fields.severity = readMatch(/(?:severity|prioritet)\s*[:\-]?\s*([^\n]+)/i, text);
    fields.affected_system = readMatch(/(?:system|affected system)\s*[:\-]?\s*([^\n]+)/i, text);
    fields.status = readMatch(/(?:status)\s*[:\-]?\s*([^\n]+)/i, text);
  }

  return fields;
}

function buildTables(schema: SchemaTemplateDefinition, text: string): Array<{ key: string; rows: Record<string, unknown>[] }> {
  // First iteration keeps table output deterministic and lightweight.
  // Line extraction is mostly manual review for low-confidence docs.
  return schema.tables.map((table) => {
    const hasContentHint = /line item|description|qty|quantity|amount|artikel|rad/i.test(text);
    return {
      key: table.key,
      rows: hasContentHint ? [{}] : [],
    };
  });
}

export function extractOfficeStructuredData(params: {
  docType: DocType;
  schema: SchemaTemplateDefinition;
  rawText: string;
  schemaId?: string;
  schemaVersion?: number;
  classification: OfficeExtractionResult["classification"];
}): OfficeExtractionResult {
  const fields = extractByDocType(params.docType, params.rawText);
  const tables = buildTables(params.schema, params.rawText);

  return {
    documentDomain: "office_it",
    docType: params.docType,
    schemaId: params.schemaId,
    schemaVersion: params.schemaVersion,
    classification: params.classification,
    fields,
    tables,
    links: {
      invoice_po: null,
      asset_id: typeof fields.affected_system === "string" ? String(fields.affected_system) : null,
      ticket_id: typeof fields.ticket_id === "string" ? String(fields.ticket_id) : null,
    },
    statusSignals: {
      status: (fields.status as string) || null,
      severity: (fields.severity as string) || null,
      approved: false,
      passed: false,
    },
    validation: {
      completeness: 0,
      confidence: Math.round(params.classification.modelConfidence * 100),
      blockingIssues: [],
      warningIssues: [],
    },
    rawText: params.rawText.slice(0, 12000),
  };
}
