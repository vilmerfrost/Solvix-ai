"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/index";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { formatSEK } from "@/lib/price-monitor-api";
import { getServiceProductName } from "@/lib/price-monitor-service-names";

interface LineItem {
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
}

const CURRENCIES = ["SEK", "EUR", "USD", "GBP", "NOK", "DKK"];

function calcAmount(qty: string, price: string) {
  const q = parseFloat(qty) || 0;
  const p = parseFloat(price) || 0;
  return q * p;
}

export default function ManualEntryPage() {
  const router = useRouter();
  const { addToast } = useToast();

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierOrg, setNewSupplierOrg] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [currency, setCurrency] = useState("SEK");
  const [manualTotal, setManualTotal] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineItem[]>([
    { description: "", quantity: "1", unit: "st", unitPrice: "" },
  ]);
  const [saving, setSaving] = useState(false);

  const loadSuppliers = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/auth/login"); return; }
    const { data } = await supabase
      .from("suppliers")
      .select("id, name")
      .eq("user_id", session.user.id)
      .order("name");
    setSuppliers(data ?? []);
  }, [router]);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);

  function addLine() {
    setLines((prev) => [...prev, { description: "", quantity: "1", unit: "st", unitPrice: "" }]);
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateLine(idx: number, field: keyof LineItem, value: string) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  const lineAmounts = lines.map((l) => calcAmount(l.quantity, l.unitPrice));
  const autoTotal = lineAmounts.reduce((s, a) => s + a, 0);
  const displayTotal = manualTotal !== "" ? parseFloat(manualTotal) || 0 : autoTotal;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/auth/login"); return; }

    const validLines = lines.filter((l) => l.description.trim());
    if (validLines.length === 0) {
      addToast({ type: "error", title: "Minst en rad med beskrivning krävs." });
      return;
    }

    setSaving(true);
    try {
      // 1. Upsert supplier
      let resolvedSupplierId = supplierId;
      if (supplierId === "new") {
        const name = newSupplierName.trim();
        if (!name) throw new Error("Leverantörsnamn krävs.");
        const { data: sup, error: supErr } = await supabase
          .from("suppliers")
          .upsert(
            { user_id: session.user.id, name, normalized_name: name.toLowerCase(), org_number: newSupplierOrg || null },
            { onConflict: "user_id,normalized_name" }
          )
          .select("id")
          .single();
        if (supErr) throw supErr;
        resolvedSupplierId = sup.id;
      }
      if (!resolvedSupplierId) throw new Error("Välj en leverantör.");

      // 2. Document record
      const invNum = invoiceNumber.trim() || `MANUAL-${Date.now()}`;
      const { data: doc, error: docErr } = await supabase
        .from("documents")
        .insert({
          user_id: session.user.id,
          filename: `${invNum}.manual`,
          status: "approved",
          document_domain: "invoice",
          doc_type: "invoice",
          sender_name: suppliers.find((s) => s.id === resolvedSupplierId)?.name ?? newSupplierName,
          document_date: invoiceDate,
          total_cost: displayTotal,
          extracted_data: { currency, source: "manual", invoice_number: invNum, notes },
        })
        .select("id")
        .single();
      if (docErr) throw docErr;

      // 3. Upsert products + insert line items
      const supplierDisplayName = suppliers.find((s) => s.id === resolvedSupplierId)?.name ?? newSupplierName;
      const serviceProductName = getServiceProductName(supplierDisplayName);
      const lineAmountsCalc = validLines.map((l) => calcAmount(l.quantity, l.unitPrice));
      const maxAmount = Math.max(0, ...lineAmountsCalc);

      for (let i = 0; i < validLines.length; i++) {
        const line = validLines[i];
        const amount = lineAmountsCalc[i] ?? 0;
        const productName = serviceProductName ?? line.description.trim();
        const normalizedName = productName.toLowerCase().trim();

        const { data: product } = await supabase
          .from("products")
          .upsert(
            { user_id: session.user.id, supplier_id: resolvedSupplierId, name: productName, normalized_name: normalizedName, unit: line.unit || null, is_trackable: amount > 0 },
            { onConflict: "supplier_id,normalized_name" }
          )
          .select("id")
          .single();

        await supabase.from("invoice_line_items").insert({
          user_id: session.user.id,
          document_id: doc.id,
          supplier_id: resolvedSupplierId,
          product_id: product?.id ?? null,
          raw_description: line.description.trim(),
          quantity: parseFloat(line.quantity) || null,
          unit: line.unit || null,
          unit_price: parseFloat(line.unitPrice) || null,
          amount,
          invoice_number: invNum,
          invoice_date: invoiceDate,
          match_confidence: 1.0,
          is_primary: amount === maxAmount && amount > 0,
          is_detail: amount !== maxAmount || amount <= 0,
        });
      }

      addToast({ type: "success", title: "Faktura registrerad!" });
      router.push("/price-monitor/products");
    } catch (err) {
      addToast({ type: "error", title: err instanceof Error ? err.message : "Något gick fel." });
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 bg-white outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all placeholder-gray-400";
  const labelCls = "block text-sm font-medium text-gray-700 mb-1.5";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/price-monitor" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Manuell registrering</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white border border-gray-200 rounded-xl p-8 space-y-6 shadow-sm">

          {/* Supplier */}
          <div>
            <label className={labelCls}>Leverantör</label>
            <select className={inputCls} value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
              <option value="">Välj leverantör...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="new">+ Ny leverantör...</option>
            </select>
          </div>

          {supplierId === "new" && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <label className={labelCls}>Leverantörsnamn *</label>
                <input className={inputCls} value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} placeholder="T.ex. Acme AB" required />
              </div>
              <div>
                <label className={labelCls}>Org.nummer</label>
                <input className={inputCls} value={newSupplierOrg} onChange={(e) => setNewSupplierOrg(e.target.value)} placeholder="556XXX-XXXX" />
              </div>
            </div>
          )}

          {/* Invoice number + date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fakturanummer</label>
              <input className={inputCls} value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} placeholder="FV-2024-001" />
            </div>
            <div>
              <label className={labelCls}>Fakturadatum</label>
              <input type="date" className={inputCls} value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} required />
            </div>
          </div>

          {/* Currency + total */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Valuta</label>
              <select className={inputCls} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>
                Totalbelopp{" "}
                {autoTotal > 0 && manualTotal === "" && (
                  <span className="font-normal text-gray-400">(auto: {formatSEK(autoTotal)})</span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
                value={manualTotal}
                onChange={(e) => setManualTotal(e.target.value)}
                placeholder={autoTotal > 0 ? String(autoTotal.toFixed(2)) : "0.00"}
              />
            </div>
          </div>

          {/* Line items */}
          <div>
            <label className={labelCls}>Rader</label>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {["Beskrivning", "Antal", "Enhet", "À-pris", "Belopp", ""].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, idx) => {
                    const amt = calcAmount(line.quantity, line.unitPrice);
                    return (
                      <tr key={idx} className={`${idx > 0 ? "border-t border-gray-100" : ""} group`}>
                        <td className="px-2 py-2">
                          <input className="w-full border-0 outline-none text-sm text-gray-900 placeholder-gray-400 bg-transparent focus:bg-white focus:border focus:border-pink-300 focus:rounded px-1 py-1" value={line.description} onChange={(e) => updateLine(idx, "description", e.target.value)} placeholder="Produktbeskrivning" />
                        </td>
                        <td className="px-2 py-2 w-20">
                          <input type="number" className="w-full border-0 outline-none text-sm text-right text-gray-900 bg-transparent focus:bg-white focus:border focus:border-pink-300 focus:rounded px-1 py-1" value={line.quantity} onChange={(e) => updateLine(idx, "quantity", e.target.value)} min="0" />
                        </td>
                        <td className="px-2 py-2 w-20">
                          <input className="w-full border-0 outline-none text-sm text-gray-900 bg-transparent focus:bg-white focus:border focus:border-pink-300 focus:rounded px-1 py-1 placeholder-gray-400" value={line.unit} onChange={(e) => updateLine(idx, "unit", e.target.value)} placeholder="st" />
                        </td>
                        <td className="px-2 py-2 w-24">
                          <input type="number" step="0.01" className="w-full border-0 outline-none text-sm text-right text-gray-900 bg-transparent focus:bg-white focus:border focus:border-pink-300 focus:rounded px-1 py-1" value={line.unitPrice} onChange={(e) => updateLine(idx, "unitPrice", e.target.value)} placeholder="0.00" />
                        </td>
                        <td className="px-3 py-2 w-24 text-right text-gray-500 text-xs font-medium">
                          {amt > 0 ? formatSEK(amt) : "–"}
                        </td>
                        <td className="px-2 py-2 w-8">
                          {lines.length > 1 && (
                            <button type="button" onClick={() => removeLine(idx)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="px-3 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                <button type="button" onClick={addLine} className="flex items-center gap-1.5 text-xs text-pink-500 hover:text-pink-600 font-medium transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                  Lägg till rad
                </button>
                {autoTotal > 0 && (
                  <span className="text-xs font-semibold text-gray-700">
                    Summa: {formatSEK(displayTotal)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Anteckningar</label>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Frivilliga anteckningar om fakturan..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <Link href="/price-monitor" className="text-sm font-medium text-gray-500 hover:text-gray-700 px-4 py-2.5 transition-colors">
              Avbryt
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="bg-pink-500 hover:bg-pink-600 disabled:opacity-60 text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              {saving ? "Sparar..." : "Bekräfta & Spara"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
