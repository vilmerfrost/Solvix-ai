import { createServiceRoleClient } from "@/lib/supabase";
import type { DocType, SchemaTemplateDefinition } from "./types";

function buildDefaultSchema(docType: DocType): SchemaTemplateDefinition {
  return {
    version: 1,
    docType,
    fields: [
      { key: "document_id", label: "Document ID", type: "id_ref", required: true },
      { key: "supplier", label: "Supplier", type: "text" },
      { key: "customer", label: "Customer", type: "text" },
      { key: "date", label: "Date", type: "date" },
      { key: "due_date", label: "Due Date", type: "date" },
      { key: "amount", label: "Amount", type: "currency" },
      { key: "currency", label: "Currency", type: "enum", enumValues: ["SEK", "EUR", "USD"] },
      { key: "status", label: "Status", type: "text" },
    ],
    tables: [
      {
        key: "line_items",
        label: "Line items",
        rowFields: [
          { key: "description", label: "Description", type: "text" },
          { key: "quantity", label: "Quantity", type: "number" },
          { key: "unit_price", label: "Unit price", type: "currency" },
          { key: "amount", label: "Amount", type: "currency" },
        ],
      },
    ],
    rules: [
      {
        key: "required_date",
        severity: "blocking",
        expression: { type: "required", field: "date" },
        message: "Document date is required",
      },
    ],
  };
}

export async function getPublishedSchemaForDocType(params: {
  userId: string;
  docType: DocType;
  schemaId?: string;
}): Promise<{ schemaId?: string; definition: SchemaTemplateDefinition; version: number }> {
  const supabase = createServiceRoleClient();

  let schemaQuery = supabase
    .from("schema_templates")
    .select("*")
    .eq("user_id", params.userId)
    .eq("document_domain", "office_it")
    .eq("status", "published");

  if (params.schemaId) {
    schemaQuery = schemaQuery.eq("id", params.schemaId).limit(1);
  } else {
    schemaQuery = schemaQuery.eq("doc_type", params.docType).order("updated_at", { ascending: false }).limit(1);
  }

  const { data: schema } = await schemaQuery.maybeSingle();
  if (!schema) {
    return {
      definition: buildDefaultSchema(params.docType),
      version: 1,
    };
  }

  const { data: versionRow } = await supabase
    .from("schema_template_versions")
    .select("*")
    .eq("schema_id", schema.id)
    .eq("version", schema.current_version)
    .maybeSingle();

  if (!versionRow?.definition) {
    return {
      schemaId: schema.id,
      definition: buildDefaultSchema(params.docType),
      version: schema.current_version || 1,
    };
  }

  return {
    schemaId: schema.id,
    definition: versionRow.definition as SchemaTemplateDefinition,
    version: schema.current_version || 1,
  };
}

export async function persistClassification(params: {
  documentId: string;
  userId: string;
  modelDocType: string;
  modelConfidence: number;
  ruleDocType?: string;
  finalDocType: string;
  schemaId?: string;
  decisionSource: string;
}): Promise<void> {
  const supabase = createServiceRoleClient();
  await supabase.from("document_classifications").insert({
    document_id: params.documentId,
    user_id: params.userId,
    model_doc_type: params.modelDocType,
    model_confidence: params.modelConfidence,
    rule_doc_type: params.ruleDocType || null,
    final_doc_type: params.finalDocType,
    schema_id: params.schemaId || null,
    decision_source: params.decisionSource,
  });
}
