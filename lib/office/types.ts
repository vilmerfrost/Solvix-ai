export type DocumentDomain = "waste" | "office_it";

export type DocType =
  | "invoice"
  | "po"
  | "credit_note"
  | "receipt"
  | "contract"
  | "nda"
  | "employment_agreement"
  | "ticket_incident"
  | "ticket_change"
  | "unknown_office";

export type SchemaFieldType =
  | "text"
  | "long_text"
  | "number"
  | "currency"
  | "date"
  | "datetime"
  | "boolean"
  | "enum"
  | "email"
  | "phone"
  | "org_number"
  | "iban"
  | "bg_pg"
  | "id_ref";

export interface SchemaFieldDefinition {
  key: string;
  label: string;
  type: SchemaFieldType;
  required?: boolean;
  enumValues?: string[];
  validators?: Record<string, unknown>;
  aliases?: string[];
}

export interface SchemaTableDefinition {
  key: string;
  label: string;
  rowFields: SchemaFieldDefinition[];
}

export interface SchemaTemplateDefinition {
  version: number;
  docType: DocType;
  fields: SchemaFieldDefinition[];
  tables: SchemaTableDefinition[];
  rules: Array<{
    key: string;
    severity: "warning" | "blocking";
    expression: Record<string, unknown>;
    message: string;
  }>;
}

export interface ClassificationDecision {
  modelDocType: DocType;
  modelConfidence: number;
  ruleDocType?: DocType;
  finalDocType: DocType;
  schemaId?: string;
  decisionSource: "model" | "rule_override" | "fallback";
}

export interface OfficeExtractionResult {
  documentDomain: "office_it";
  docType: DocType;
  schemaId?: string;
  schemaVersion?: number;
  classification: ClassificationDecision;
  fields: Record<string, unknown>;
  tables: Array<{
    key: string;
    rows: Record<string, unknown>[];
  }>;
  links: Record<string, string | null>;
  statusSignals: Record<string, string | number | boolean | null>;
  validation: {
    completeness: number;
    confidence: number;
    blockingIssues: string[];
    warningIssues: string[];
  };
  rawText?: string;
}

export interface OfficeProcessingOptions {
  autoApproveThreshold: number;
  highConfidenceThreshold: number;
  lowConfidenceThreshold: number;
}

export type ReviewTaskStatus =
  | "new"
  | "assigned"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "rejected";
