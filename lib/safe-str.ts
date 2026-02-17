/** Safe string extraction — replaces String() for AI-extracted fields.
 *  Recursively unwraps objects to find the best string value.
 *  NEVER returns "[object Object]". */
export function safeStr(val: any, fallback: string = ""): string {
  if (!val) return fallback;
  if (typeof val === "string") return val === "[object Object]" ? fallback : val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object" && "value" in val) return safeStr(val.value, fallback);
  if (typeof val === "object" && "name" in val) return safeStr(val.name, fallback);
  if (typeof val === "object" && "label" in val) return safeStr(val.label, fallback);
  if (typeof val === "object" && "address" in val) return safeStr(val.address, fallback);
  if (typeof val === "object" && "title" in val) return safeStr(val.title, fallback);
  return fallback;
}
