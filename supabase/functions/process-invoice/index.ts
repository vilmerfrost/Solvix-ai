import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { checkAgreementDeviations } from "./agreement-check.ts";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const ANTHROPIC_MODEL = "claude-sonnet-4-5-20250929";
const PRICE_MONITOR_BASE_CURRENCY = "SEK";
const SUPPORTED_CURRENCIES = [
  "SEK",
  "USD",
  "EUR",
  "NOK",
  "DKK"
];
const DEFAULT_EXCHANGE_RATES = {
  SEK: 1,
  USD: 0,
  EUR: 0,
  NOK: 0,
  DKK: 0
};
const FX_SYMBOLS = SUPPORTED_CURRENCIES.filter((c)=>c !== PRICE_MONITOR_BASE_CURRENCY);
const FX_SOURCE_LABEL = "Frankfurter (ECB)";
const FX_STALE_MS = 24 * 60 * 60 * 1000;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const STORAGE_BUCKET = "raw_documents";
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") return new Response("ok", {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, content-type"
    }
  });
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return jsonResponse({
      error: "No auth header"
    }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return jsonResponse({
      error: "Unauthorized"
    }, 401);
    const { document_id } = await req.json();
    if (!document_id) return jsonResponse({
      error: "document_id required"
    }, 400);
    const { data: doc, error: docErr } = await supabase.from("documents").select("*").eq("id", document_id).single();
    if (docErr || !doc) return jsonResponse({
      error: "Document not found"
    }, 404);
    const userId = doc.user_id;
    await supabase.from("documents").update({
      status: "processing",
      processing_stage: "invoice_extraction",
      error_message: null
    }).eq("id", document_id);
    const storagePath = doc.storage_path || doc.file_path;
    if (!storagePath) return jsonResponse({
      error: "No storage path"
    }, 400);
    let fileData = null;
    const { data: rawData, error: rawErr } = await supabase.storage.from(STORAGE_BUCKET).download(storagePath);
    if (rawErr || !rawData) {
      const { data: alt } = await supabase.storage.from("documents").download(storagePath);
      fileData = alt;
    } else {
      fileData = rawData;
    }
    if (!fileData) return jsonResponse({
      error: "Failed to download PDF"
    }, 500);
    const bytes = new Uint8Array(await fileData.arrayBuffer());
    let binary = "";
    for(let i = 0; i < bytes.length; i += 8192)binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    const base64 = btoa(binary);
    const { data: existingProducts } = await supabase.from("products").select("id, name, normalized_name, unit, supplier_id, suppliers!inner(name, normalized_name)").eq("user_id", userId);
    const productCatalog = (existingProducts || []).map((p)=>({
        id: p.id,
        name: p.name,
        normalized_name: p.normalized_name,
        unit: p.unit,
        supplier: p.suppliers?.name || "unknown"
      }));
    const settings = await loadSettings(userId);
    const alertThreshold = settings.alert_threshold_percent || 5.0;
    // EXTRACT WITH HIERARCHY-AWARE PROMPT
    const extractionResult = await extractInvoice(base64, productCatalog, doc.filename || doc.file_name || "");
    if (!extractionResult.data) {
      await supabase.from("documents").update({
        status: "error",
        error_message: extractionResult.error
      }).eq("id", document_id);
      return jsonResponse({
        error: "Extraction failed",
        details: extractionResult.error
      }, 500);
    }
    const extraction = extractionResult.data;
    const invoiceCurrency = normalizeCurrency(extraction.currency);
    if (!invoiceCurrency) {
      await supabase.from("documents").update({
        status: "error",
        error_message: `Unsupported currency: ${extraction.currency}`
      }).eq("id", document_id);
      return jsonResponse({
        error: `Unsupported currency`
      }, 500);
    }
    const fxInfo = getFxInfo(invoiceCurrency, settings);
    if (!fxInfo.rate_to_sek) {
      await supabase.from("documents").update({
        status: "error",
        error_message: `Missing FX rate for ${invoiceCurrency}`
      }).eq("id", document_id);
      return jsonResponse({
        error: `Missing FX rate`
      }, 500);
    }
    const normalizedSupplier = extraction.supplier.name.toLowerCase().trim();
    const { data: supplier } = await supabase.from("suppliers").upsert({
      user_id: userId,
      name: extraction.supplier.name,
      normalized_name: normalizedSupplier,
      org_number: extraction.supplier.org_number
    }, {
      onConflict: "user_id,normalized_name"
    }).select("id").single();
    const supplierId = supplier?.id;
    // Convert amounts + classify primary/detail
    const lineItems = extraction.line_items.map((item)=>({
        ...item,
        unit_price_sek: convertAmount(item.unit_price, fxInfo.rate_to_sek),
        amount_sek: convertAmount(item.amount, fxInfo.rate_to_sek)
      }));
    // If AI didn't classify, auto-classify: items with amount > 0 are candidates, highest = primary
    const hasPrimaryFlag = lineItems.some((li)=>li.is_primary === true);
    if (!hasPrimaryFlag) {
      // Find the item(s) that represent the main charge
      const positiveItems = lineItems.filter((li)=>(li.amount_sek || 0) > 0);
      if (positiveItems.length > 0) {
        // The item with the highest amount is primary. If it's a subscription/plan, it's the main product.
        const maxAmount = Math.max(...positiveItems.map((li)=>li.amount_sek || 0));
        for (const li of lineItems){
          li.is_primary = (li.amount_sek || 0) === maxAmount && maxAmount > 0;
        }
      }
    }
    const lineItemRecords = [];
    const alerts = [];
    for (const item of lineItems){
      let productId = null;
      if (item.matched_product && !item.is_new_product) {
        const m = productCatalog.find((p)=>p.normalized_name === item.matched_product);
        productId = m?.id || null;
      }
      if (!productId && item.description) {
        const norm = item.description.toLowerCase().trim();
        const isTrackable = item.is_primary === true || (item.amount_sek || 0) > 0;
        const { data: np } = await supabase.from("products").upsert({
          user_id: userId,
          supplier_id: supplierId,
          name: item.description,
          normalized_name: item.matched_product || norm,
          unit: item.unit,
          is_trackable: isTrackable
        }, {
          onConflict: "supplier_id,normalized_name"
        }).select("id").single();
        productId = np?.id || null;
      }
      const isPrimary = item.is_primary === true;
      const isDetail = !isPrimary;
      lineItemRecords.push({
        user_id: userId,
        document_id,
        supplier_id: supplierId,
        product_id: productId,
        raw_description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price_sek,
        amount: item.amount_sek,
        vat_rate: item.vat_rate,
        invoice_number: extraction.invoice_number,
        invoice_date: extraction.invoice_date,
        match_confidence: item.match_confidence,
        is_primary: isPrimary,
        is_detail: isDetail
      });
      // ONLY create price alerts for PRIMARY items with meaningful amounts
      if (isPrimary && productId && item.unit_price_sek != null && item.unit_price_sek > 0.5) {
        const { data: lastItem } = await supabase.from("invoice_line_items").select("unit_price, invoice_date, document_id").eq("product_id", productId).eq("user_id", userId).eq("is_primary", true).not("unit_price", "is", null).order("invoice_date", {
          ascending: false
        }).limit(1).single();
        if (lastItem?.unit_price != null) {
          const prev = Number(lastItem.unit_price), curr = Number(item.unit_price_sek);
          if (prev > 0) {
            const pct = (curr - prev) / prev * 100;
            if (Math.abs(pct) >= alertThreshold) {
              alerts.push({
                user_id: userId,
                product_id: productId,
                supplier_id: supplierId,
                previous_price: prev,
                new_price: curr,
                change_percent: Math.round(pct * 100) / 100,
                previous_invoice_date: lastItem.invoice_date,
                new_invoice_date: extraction.invoice_date,
                previous_document_id: lastItem.document_id,
                new_document_id: document_id,
                status: "new"
              });
            }
          }
        }
      }
    }
    if (lineItemRecords.length > 0) await supabase.from("invoice_line_items").insert(lineItemRecords);
    if (alerts.length > 0 && settings.auto_alert) await supabase.from("price_alerts").insert(alerts);
    // Agreement checks (only primary items)
    let agDeviations = {
      deviations: [],
      inserted: 0
    };
    if (supplierId) {
      try {
        agDeviations = await checkAgreementDeviations(supabase, userId, supplierId, extraction.supplier.name, lineItemRecords, document_id, extraction.invoice_date);
      } catch (e) {
        console.error("Agreement check failed:", e);
      }
    }
    const extractedData = {
      ...extraction,
      currency: invoiceCurrency,
      exchange_rate_to_sek: fxInfo.rate_to_sek,
      exchange_rate_source: fxInfo.source,
      total_amount_sek: convertAmount(extraction.total_amount, fxInfo.rate_to_sek),
      vat_amount_sek: convertAmount(extraction.vat_amount, fxInfo.rate_to_sek),
      line_items: lineItems
    };
    await supabase.from("documents").update({
      status: "completed",
      processing_stage: "done",
      document_domain: "invoice",
      doc_type: "invoice",
      sender_name: extraction.supplier.name,
      document_date: extraction.invoice_date,
      total_cost: extractedData.total_amount_sek,
      extracted_data: extractedData,
      processed_at: new Date().toISOString(),
      error_message: null
    }).eq("id", document_id);
    return jsonResponse({
      success: true,
      document_id,
      supplier: extraction.supplier.name,
      line_items_count: lineItemRecords.length,
      primary_items: lineItemRecords.filter((r)=>r.is_primary).length,
      detail_items: lineItemRecords.filter((r)=>r.is_detail).length,
      alerts_count: settings.auto_alert ? alerts.length : 0,
      alerts: alerts.map((a)=>({
          product_id: a.product_id,
          previous_price: a.previous_price,
          new_price: a.new_price,
          change_percent: a.change_percent
        })),
      agreement_deviations_count: agDeviations.inserted
    });
  } catch (err) {
    console.error("process-invoice error:", err);
    return jsonResponse({
      error: String(err)
    }, 500);
  }
});
// === EXTRACTION WITH HIERARCHY ===
async function extractInvoice(base64Pdf, productCatalog, filename) {
  if (!ANTHROPIC_API_KEY) return {
    data: null,
    error: "ANTHROPIC_API_KEY missing"
  };
  const catalogSection = productCatalog.length > 0 ? `\n\nEXISTING PRODUCT CATALOG:\n${productCatalog.map((p)=>`- "${p.normalized_name}" (unit: ${p.unit || "?"}, supplier: ${p.supplier})`).join("\n")}\nMatch line items to catalog when clearly same item. Set is_new_product=false for matches.` : `\nNo existing products. Create normalized names (lowercase). Set is_new_product=true for all.`;
  const systemPrompt = `You extract structured data from invoices. Return ONLY valid JSON, no markdown.\n\nCRITICAL RULES:\n1. Parse numbers: "1 234,50" → 1234.50, "$20.00" → 20\n2. Dates as YYYY-MM-DD\n3. CURRENCY: Detect the actual currency from the invoice (USD, EUR, SEK, NOK, DKK). Look for $, €, kr, SEK, USD, EUR symbols. If the invoice shows $ or USD, currency MUST be "USD". If € or EUR, currency MUST be "EUR". Never default to SEK if the invoice is clearly in another currency.\n4. total_amount: The ACTUAL amount charged/due on the invoice ("Amount Due", "Total", "Att betala"). This is the number the customer pays.\n5. LINE ITEM HIERARCHY - THIS IS CRITICAL:\n   - is_primary=true: The main billable service/product (subscription fee, plan cost, the thing being bought). Usually 1-3 items per invoice.\n   - is_primary=false: Usage breakdowns, included items, zero-cost components, discounts, sub-line details. These are context, not the main charge.\n   - For SaaS invoices (Railway, Supabase, Vercel, AWS, etc.): The plan/subscription is primary. Usage metrics (compute hours, storage, bandwidth, API calls) are NOT primary.\n   - For product invoices: Each distinct product purchased is primary. Quantity breakdowns of the same product are detail.\n   - For service invoices: The service fee is primary. Time/hour breakdowns are detail.\n   - If unsure, only mark the item with the HIGHEST amount as primary.${catalogSection}`;
  const userPrompt = `Extract all data from this invoice (filename: ${filename}).\n\nReturn this exact JSON:\n{\n  "supplier": { "name": "company name", "org_number": "string or null" },\n  "invoice_number": "string or null",\n  "invoice_date": "YYYY-MM-DD or null",\n  "due_date": "YYYY-MM-DD or null",\n  "total_amount": <the actual amount due/charged as a number>,\n  "vat_amount": <number or null>,\n  "currency": "USD|EUR|SEK|NOK|DKK",\n  "line_items": [\n    {\n      "description": "original description",\n      "quantity": <number or null>,\n      "unit": "st/kg/timme/etc or null",\n      "unit_price": <number or null>,\n      "amount": <number or null>,\n      "vat_rate": <number or null>,\n      "matched_product": "normalized product name",\n      "match_confidence": <0.0-1.0>,\n      "is_new_product": <true/false>,\n      "is_primary": <true if main billable item, false if usage/breakdown/discount>\n    }\n  ]\n}`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 8192,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: "application/pdf",
                  data: base64Pdf
                }
              },
              {
                type: "text",
                text: userPrompt
              }
            ]
          }
        ]
      })
    });
    if (!res.ok) {
      const e = await res.text();
      return {
        data: null,
        error: `API ${res.status}: ${e}`
      };
    }
    const data = await res.json();
    const text = data.content?.filter((b)=>b.type === "text").map((b)=>b.text).join("") || "";
    if (!text) return {
      data: null,
      error: "No text"
    };
    let c = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const f = c.indexOf("{"), l = c.lastIndexOf("}");
    if (f !== -1 && l > f) c = c.substring(f, l + 1);
    try {
      return {
        data: JSON.parse(c),
        error: null
      };
    } catch (pe) {
      return {
        data: null,
        error: `Parse: ${pe}`
      };
    }
  } catch (err) {
    return {
      data: null,
      error: String(err)
    };
  }
}
// === SETTINGS + FX ===
async function loadSettings(userId) {
  const { data, error } = await supabase.from("price_monitor_settings").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  let s = normSettings(data);
  if (shouldRefreshFx(s)) {
    try {
      const r = await fetchFx();
      s = {
        ...s,
        ...r
      };
      await supabase.from("price_monitor_settings").upsert({
        user_id: userId,
        ...s,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id"
      });
    } catch  {}
  }
  return s;
}
function normFx(v) {
  const r = {
    ...DEFAULT_EXCHANGE_RATES
  };
  for (const c of SUPPORTED_CURRENCIES){
    if (c === PRICE_MONITOR_BASE_CURRENCY) continue;
    const p = typeof v?.[c] === "number" ? v[c] : Number(v?.[c]);
    if (Number.isFinite(p) && p > 0) r[c] = Math.round(p * 1e6) / 1e6;
  }
  return r;
}
function normManualFx(v) {
  const r = {};
  for (const c of FX_SYMBOLS){
    const p = typeof v?.[c] === "number" ? v[c] : Number(v?.[c]);
    if (Number.isFinite(p) && p > 0) r[c] = Math.round(p * 1e6) / 1e6;
  }
  return r;
}
function normSettings(row) {
  return {
    alert_threshold_percent: row?.alert_threshold_percent ?? 5,
    auto_alert: row?.auto_alert ?? true,
    notify_email: row?.notify_email ?? null,
    exchange_rates: normFx(row?.exchange_rates),
    manual_exchange_rates: normManualFx(row?.manual_exchange_rates),
    exchange_rates_source: row?.exchange_rates_source ?? null,
    exchange_rates_updated_at: row?.exchange_rates_updated_at ?? null
  };
}
function shouldRefreshFx(s) {
  const r = normFx(s.exchange_rates);
  if (FX_SYMBOLS.some((c)=>!(r[c] > 0))) return true;
  if (!s.exchange_rates_updated_at) return true;
  const t = new Date(s.exchange_rates_updated_at).getTime();
  return !Number.isFinite(t) || Date.now() - t > FX_STALE_MS;
}
async function fetchFx() {
  const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=SEK&symbols=${FX_SYMBOLS.join(",")}`);
  if (!res.ok) throw new Error(`FX ${res.status}`);
  const p = await res.json();
  const r = {
    ...DEFAULT_EXCHANGE_RATES
  };
  for (const c of FX_SYMBOLS){
    const v = Number(p?.rates?.[c]);
    if (!Number.isFinite(v) || v <= 0) throw new Error(`Missing ${c}`);
    r[c] = Math.round(1 / v * 1e6) / 1e6;
  }
  return {
    exchange_rates: r,
    exchange_rates_source: FX_SOURCE_LABEL,
    exchange_rates_updated_at: new Date().toISOString()
  };
}
function normalizeCurrency(v) {
  const u = v?.toUpperCase().trim();
  if (!u) return PRICE_MONITOR_BASE_CURRENCY;
  if (u === "KR" || u === "KRONOR") return PRICE_MONITOR_BASE_CURRENCY;
  if (u === "$" || u === "DOLLAR") return "USD";
  if (u === "€" || u === "EURO") return "EUR";
  if (SUPPORTED_CURRENCIES.includes(u)) return u;
  return null;
}
function getFxInfo(currency, settings) {
  if (currency === PRICE_MONITOR_BASE_CURRENCY) return {
    rate_to_sek: 1,
    source: "base",
    updated_at: settings.exchange_rates_updated_at,
    manual_override: false
  };
  const m = settings.manual_exchange_rates[currency];
  if (typeof m === "number" && m > 0) return {
    rate_to_sek: m,
    source: "manual",
    updated_at: settings.exchange_rates_updated_at,
    manual_override: true
  };
  const a = settings.exchange_rates[currency];
  if (typeof a === "number" && a > 0) return {
    rate_to_sek: a,
    source: settings.exchange_rates_source,
    updated_at: settings.exchange_rates_updated_at,
    manual_override: false
  };
  return {
    rate_to_sek: null,
    source: settings.exchange_rates_source,
    updated_at: settings.exchange_rates_updated_at,
    manual_override: false
  };
}
function convertAmount(amt, rate) {
  if (amt == null || !rate) return null;
  return Math.round(amt * rate * 100) / 100;
}
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
