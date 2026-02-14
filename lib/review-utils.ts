// Utility functions for the review page data processing
// Extracted to module scope to avoid bundler TDZ issues

/** Get the underlying value from a wrapped {value, confidence} field or return as-is.
 *  If the result is still an object (e.g. {name, email, phone, address}), flatten to string. */
export function getValue(field: any): any {
  if (!field) return null;
  let val = field;
  if (typeof val === 'object' && 'value' in val) {
    val = val.value;
  }
  // If the unwrapped value is still an object, flatten to its most useful string
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    return val.name || val.label || val.title || JSON.stringify(val);
  }
  return val;
}

/** Check if a value is a placeholder that should be replaced with fallback */
export function isPlaceholderValue(val: string | null | undefined): boolean {
  if (!val || typeof val !== 'string') return true;
  const trimmed = val.trim().toLowerCase();
  return (
    trimmed === '' ||
    trimmed === 'okänd mottagare' ||
    trimmed === 'okänd adress' ||
    trimmed === 'okänt material' ||
    trimmed === 'saknas' ||
    trimmed === 'unknown'
  );
}

/** Build export preview rows with fallback values applied */
export function buildExportPreviewRows(
  lineItems: any[],
  docDate: string,
  docAddress: string,
  docReceiver: string
) {
  return lineItems.map((item: any, idx: number) => {
    const rowReceiver = getValue(item.receiver);
    const rowLocation = getValue(item.location) || getValue(item.address);
    return {
      rowNum: idx + 1,
      date: getValue(item.date) || docDate,
      location: isPlaceholderValue(rowLocation) ? docAddress : rowLocation,
      material: getValue(item.material) || "Okänt material",
      weightKg: parseFloat(String(getValue(item.weightKg) || getValue(item.weight) || 0)),
      unit: getValue(item.unit) || "Kg",
      receiver: isPlaceholderValue(rowReceiver) ? (docReceiver || "Okänd mottagare") : rowReceiver,
      isHazardous: getValue(item.isHazardous) || false,
    };
  });
}

/** Calculate unique counts and totals from line items */
export function calculateStats(lineItems: any[], extractedData: any) {
  const uniqueAddresses = new Set(
    lineItems.map((item: any) => {
      const addr = getValue(item.address) || getValue(item.location);
      return addr && addr !== "SAKNAS" ? addr : null;
    }).filter(Boolean)
  ).size;

  const uniqueReceivers = new Set(
    lineItems.map((item: any) => getValue(item.receiver) || null).filter(Boolean)
  ).size;

  const uniqueMaterials = new Set(
    lineItems.map((item: any) => getValue(item.material) || null).filter(Boolean)
  ).size;

  const totalWeightKg = lineItems.reduce(
    (sum: number, item: any) => sum + (Number(getValue(item.weightKg)) || 0), 0
  );

  const totalCost = lineItems.reduce(
    (sum: number, item: any) => sum + (Number(getValue(item.costSEK) || getValue(item.cost)) || 0),
    Number(getValue(extractedData.costSEK) || getValue(extractedData.cost)) || 0
  );

  const totalCo2 = lineItems.reduce(
    (sum: number, item: any) => sum + (Number(getValue(item.co2Saved) || getValue(item.co2)) || 0), 0
  );

  return { uniqueAddresses, uniqueReceivers, uniqueMaterials, totalWeightKg, totalCost, totalCo2 };
}

/** Detect which columns exist in the data */
export function detectExistingColumns(items: any[], extractedData: any) {
  if (!items || items.length === 0) {
    return { mandatory: [] as string[], optional: [] as string[] };
  }

  const MANDATORY_FIELDS = ["date", "address", "material", "weightKg", "unit", "receiver"];
  const OPTIONAL_FIELDS = ["wasteCode", "cost", "costSEK", "co2Saved", "co2", "notes", "quantity", "container", "handling", "isHazardous", "percentage", "referensnummer", "fordon", "avfallskod"];

  const existingOptional = OPTIONAL_FIELDS.filter(field =>
    items.some(item => {
      const value = item[field];
      if (value && typeof value === 'object' && 'value' in value) {
        const val = value.value;
        return val !== undefined && val !== null && val !== "" && val !== 0 && val !== "0" && val !== false;
      }
      return value !== undefined && value !== null && value !== "" && value !== 0 && value !== "0" && value !== false;
    })
  );

  if (extractedData.cost?.value) {
    if (!existingOptional.includes("cost") && !existingOptional.includes("costSEK")) {
      existingOptional.push("cost");
    }
  }

  return { mandatory: MANDATORY_FIELDS, optional: existingOptional };
}

/** Find duplicate primary keys in line items */
export function findDuplicateKeys(lineItems: any[], extractedData: any) {
  const primaryKeys = new Map<string, number[]>();
  lineItems.forEach((item: any, index: number) => {
    const address = getValue(item.address) || getValue(item.location) || getValue(extractedData.address) || "";
    const receiver = getValue(item.receiver) || getValue(extractedData.receiver) || "";
    const material = getValue(item.material) || "";
    const date = getValue(extractedData.date) || "";
    const key = `${address}|${receiver}|${material}|${date}`;
    if (!primaryKeys.has(key)) primaryKeys.set(key, []);
    primaryKeys.get(key)!.push(index + 1);
  });

  return Array.from(primaryKeys.entries())
    .filter(([_, indices]) => indices.length > 1)
    .map(([key, indices]) => ({ key, indices }));
}

/** Compute confidence summary stats */
export function computeConfidenceStats(extractedData: any, lineItems: any[]) {
  let totalFields = 0;
  let high = 0;
  let medium = 0;
  let low = 0;

  const check = (field: any) => {
    if (!field || typeof field !== 'object' || !('confidence' in field)) return;
    totalFields++;
    const conf = field.confidence;
    if (conf >= 0.9) high++;
    else if (conf >= 0.6) medium++;
    else low++;
  };

  check(extractedData.date);
  check(extractedData.supplier);
  check(extractedData.address);
  check(extractedData.receiver);
  check(extractedData.material);
  check(extractedData.weightKg);
  check(extractedData.cost);

  if (Array.isArray(lineItems)) {
    for (const item of lineItems) {
      check(item.material);
      check(item.weightKg);
      check(item.address);
      check(item.receiver);
    }
  }

  return { totalFields, high, medium, low };
}
