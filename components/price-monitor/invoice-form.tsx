"use client";

const CURRENCIES = ["SEK", "EUR", "USD", "NOK", "DKK"];

export interface InvoiceFormData {
  supplier_name: string;
  supplier_org_number: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  total_amount: string;
  vat_amount: string;
  currency: string;
}

export function defaultInvoiceFormData(): InvoiceFormData {
  return {
    supplier_name: "",
    supplier_org_number: "",
    invoice_number: "",
    invoice_date: "",
    due_date: "",
    total_amount: "",
    vat_amount: "",
    currency: "SEK",
  };
}

// Converts a number to Swedish display format: 1234.5 → "1 234,50"
export function numToSE(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  return new Intl.NumberFormat("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

// Parses a Swedish-formatted number string: "1 234,50" → 1234.5
export function parseSENum(s: string): number | null {
  if (!s.trim()) return null;
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

interface InvoiceFormProps {
  data: InvoiceFormData;
  onChange: (data: InvoiceFormData) => void;
}

const inputBase =
  "w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2";

const inputStyle = {
  background: "var(--color-bg)",
  borderColor: "var(--color-border)",
  color: "var(--color-text-primary)",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label
        className="block text-xs font-medium"
        style={{ color: "var(--color-text-muted)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

export function InvoiceForm({ data, onChange }: InvoiceFormProps) {
  function set(field: keyof InvoiceFormData, value: string) {
    onChange({ ...data, [field]: value });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Supplier */}
      <Field label="Leverantör">
        <input
          className={inputBase}
          style={inputStyle}
          value={data.supplier_name}
          onChange={(e) => set("supplier_name", e.target.value)}
          placeholder="Leverantörens namn"
        />
      </Field>

      <Field label="Org.nummer">
        <input
          className={inputBase}
          style={inputStyle}
          value={data.supplier_org_number}
          onChange={(e) => set("supplier_org_number", e.target.value)}
          placeholder="556xxx-xxxx"
        />
      </Field>

      {/* Invoice meta */}
      <Field label="Fakturanummer">
        <input
          className={inputBase}
          style={inputStyle}
          value={data.invoice_number}
          onChange={(e) => set("invoice_number", e.target.value)}
          placeholder="INV-2025-001"
        />
      </Field>

      <Field label="Valuta">
        <select
          className={inputBase}
          style={inputStyle}
          value={data.currency}
          onChange={(e) => set("currency", e.target.value)}
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </Field>

      <Field label="Fakturadatum">
        <input
          type="date"
          className={inputBase}
          style={inputStyle}
          value={data.invoice_date}
          onChange={(e) => set("invoice_date", e.target.value)}
        />
      </Field>

      <Field label="Förfallodatum">
        <input
          type="date"
          className={inputBase}
          style={inputStyle}
          value={data.due_date}
          onChange={(e) => set("due_date", e.target.value)}
        />
      </Field>

      {/* Amounts */}
      <Field label="Totalt belopp">
        <input
          className={inputBase}
          style={inputStyle}
          value={data.total_amount}
          onChange={(e) => set("total_amount", e.target.value)}
          placeholder="0,00"
        />
      </Field>

      <Field label="Moms">
        <input
          className={inputBase}
          style={inputStyle}
          value={data.vat_amount}
          onChange={(e) => set("vat_amount", e.target.value)}
          placeholder="0,00"
        />
      </Field>
    </div>
  );
}
