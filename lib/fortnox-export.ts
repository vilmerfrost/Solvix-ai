/**
 * Fortnox-Compatible Export
 * Creates CSV/Excel files importable into Fortnox
 */

import * as XLSX from "xlsx";

export interface FortnoxRow {
  Fakturadatum: string;
  Förfallodatum: string;
  Fakturanummer: string;
  Leverantör: string;
  Beskrivning: string;
  "Belopp exkl. moms": string;
  Moms: string;
  "Totalt belopp": string;
  Valuta: string;
  Notering: string;
}

function formatFortnoxNumber(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

function calculateDueDate(invoiceDate: string, days = 30): string {
  const date = new Date(invoiceDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function getVal(field: any): string {
  if (!field) return "";
  if (typeof field === "object" && "value" in field)
    return String(field.value || "");
  return String(field || "");
}

/** Prepare document data in Fortnox format */
export function prepareFortnoxData(documents: any[]): FortnoxRow[] {
  const rows: FortnoxRow[] = [];

  for (const doc of documents) {
    const data = doc.extracted_data || {};
    const docDate =
      getVal(data.date) ||
      doc.document_date ||
      doc.created_at?.split("T")[0] ||
      new Date().toISOString().split("T")[0];

    // Invoice-aware: use native invoice fields when documentType is 'invoice'
    const docType = data.documentType;
    if (docType === 'invoice') {
      rows.push({
        Fakturadatum: getVal(data.invoiceDate) || docDate,
        Förfallodatum: getVal(data.dueDate) || calculateDueDate(getVal(data.invoiceDate) || docDate),
        Fakturanummer: getVal(data.invoiceNumber) || '',
        Leverantör: getVal(data.supplier) || 'Okänd leverantör',
        Beskrivning: data.invoiceLineItems?.map((item: any) => getVal(item.description)).filter(Boolean).join(', ').slice(0, 200) || doc.file_name || '',
        "Belopp exkl. moms": formatFortnoxNumber(Number(getVal(data.subtotal)) || 0),
        Moms: formatFortnoxNumber(Number(getVal(data.vatAmount)) || 0),
        "Totalt belopp": formatFortnoxNumber(Number(getVal(data.totalAmount)) || 0),
        Valuta: getVal(data.currency) || "SEK",
        Notering: `Solvix import ${doc.file_name || ''}`.trim(),
      });
      continue;
    }

    // Waste document (existing logic)
    const supplier =
      getVal(data.supplier) || getVal(data.sender_name) || "Okänd leverantör";
    const totalCost =
      Number(getVal(data.cost)) || Number(getVal(data.totalCost)) || 0;
    const vatRate = data.swedishMetadata?.vatRate || 25;
    const vatAmount =
      data.swedishMetadata?.vatAmount ||
      (totalCost * vatRate) / (100 + vatRate);
    const amountExclVat = totalCost - vatAmount;

    const lineItems = data.lineItems || data.rows_data || [];
    const description =
      lineItems.length > 0
        ? lineItems
            .map((item: any) => {
              const material = getVal(item.material);
              const weight = getVal(item.weightKg);
              return `${material}${weight ? ` ${weight} kg` : ""}`;
            })
            .join(", ")
        : getVal(data.material) || doc.file_name || "Dokument";

    rows.push({
      Fakturadatum: docDate,
      Förfallodatum: calculateDueDate(docDate),
      Fakturanummer:
        getVal(data.invoiceNumber) || doc.id?.slice(0, 8) || "",
      Leverantör: supplier,
      Beskrivning: description.slice(0, 200),
      "Belopp exkl. moms": formatFortnoxNumber(amountExclVat),
      Moms: formatFortnoxNumber(vatAmount),
      "Totalt belopp": formatFortnoxNumber(totalCost),
      Valuta: "SEK",
      Notering: `Solvix import ${doc.file_name || ""}`.trim(),
    });
  }

  return rows;
}

/** Create Fortnox Excel file */
export function createFortnoxExcel(documents: any[]): Buffer {
  const data = prepareFortnoxData(documents);
  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 25 },
    { wch: 40 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
    { wch: 8 },
    { wch: 30 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Fortnox Import");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

/** Create Fortnox CSV (semicolon-separated, BOM for Excel) */
export function createFortnoxCsv(documents: any[]): string {
  const data = prepareFortnoxData(documents);
  if (data.length === 0) return "";
  const headers = Object.keys(data[0]);

  const clean = (val: any): string => {
    const str = String(val || "");
    if (str.includes(";") || str.includes('"') || str.includes("\n"))
      return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const rows = data.map((row) =>
    headers.map((h) => clean((row as any)[h])).join(";")
  );

  return "\uFEFF" + headers.join(";") + "\n" + rows.join("\n");
}
