import type { OfficeExtractionResult, SchemaTemplateDefinition } from "./types";

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "number") return Number.isNaN(value);
  return false;
}

export function validateOfficeExtraction(
  extracted: OfficeExtractionResult,
  schema: SchemaTemplateDefinition
): OfficeExtractionResult {
  const blockingIssues: string[] = [];
  const warningIssues: string[] = [];

  const requiredFields = schema.fields.filter((f) => f.required);
  for (const field of requiredFields) {
    if (isEmptyValue(extracted.fields[field.key])) {
      blockingIssues.push(`Missing required field: ${field.label}`);
    }
  }

  for (const rule of schema.rules || []) {
    if (rule.expression?.type === "required" && typeof rule.expression.field === "string") {
      const key = rule.expression.field;
      if (isEmptyValue(extracted.fields[key])) {
        if (rule.severity === "blocking") blockingIssues.push(rule.message);
        else warningIssues.push(rule.message);
      }
    }
  }

  const totalFields = Math.max(schema.fields.length, 1);
  const populatedFields = schema.fields.filter((f) => !isEmptyValue(extracted.fields[f.key])).length;
  const completeness = Math.round((populatedFields / totalFields) * 100);

  return {
    ...extracted,
    validation: {
      completeness,
      confidence: extracted.validation.confidence,
      blockingIssues,
      warningIssues,
    },
  };
}
