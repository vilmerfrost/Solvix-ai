import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
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
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") return corsResponse("ok", 200);
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return corsResponse({
      error: "No auth header"
    }, 401);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return corsResponse({
      error: "Unauthorized"
    }, 401);
    const userId = user.id;
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    switch(action){
      case "overview":
        {
          const [products, suppliers, alerts, recentAlerts, totalSpend, deviations] = await Promise.all([
            supabase.from("v_product_overview").select("*", {
              count: "exact",
              head: true
            }).eq("user_id", userId),
            supabase.from("v_supplier_summary").select("*", {
              count: "exact",
              head: true
            }).eq("user_id", userId),
            supabase.from("price_alerts").select("*", {
              count: "exact",
              head: true
            }).eq("user_id", userId).eq("status", "new"),
            supabase.from("v_alerts_overview").select("*").eq("user_id", userId).eq("status", "new").limit(10),
            supabase.from("v_spend_by_supplier").select("total_spend, spend_last_30d, spend_last_12m").eq("user_id", userId),
            supabase.from("agreement_deviations").select("*", {
              count: "exact",
              head: true
            }).eq("user_id", userId).eq("status", "new")
          ]);
          const spendData = totalSpend.data || [];
          return corsResponse({
            product_count: products.count || 0,
            supplier_count: suppliers.count || 0,
            open_alerts: alerts.count || 0,
            open_deviations: deviations.count || 0,
            recent_alerts: recentAlerts.data || [],
            total_spend: spendData.reduce((s, r)=>s + (Number(r.total_spend) || 0), 0),
            spend_last_30d: spendData.reduce((s, r)=>s + (Number(r.spend_last_30d) || 0), 0),
            spend_last_12m: spendData.reduce((s, r)=>s + (Number(r.spend_last_12m) || 0), 0)
          });
        }
      case "products":
        {
          const sid = url.searchParams.get("supplier_id");
          let q = supabase.from("v_product_overview").select("*").eq("user_id", userId);
          if (sid) q = q.eq("supplier_id", sid);
          const { data, error } = await q.order("product_name");
          if (error) return corsResponse({
            error: error.message
          }, 500);
          return corsResponse(data);
        }
      case "price_history":
        {
          const pid = url.searchParams.get("product_id");
          if (!pid) return corsResponse({
            error: "product_id required"
          }, 400);
          const { data, error } = await supabase.from("v_price_history").select("*").eq("user_id", userId).eq("product_id", pid).order("invoice_date", {
            ascending: true
          });
          if (error) return corsResponse({
            error: error.message
          }, 500);
          return corsResponse(data);
        }
      case "alerts":
        {
          const st = url.searchParams.get("status");
          let q = supabase.from("v_alerts_overview").select("*").eq("user_id", userId);
          if (st) q = q.eq("status", st);
          const { data, error } = await q.order("created_at", {
            ascending: false
          });
          if (error) return corsResponse({
            error: error.message
          }, 500);
          return corsResponse(data);
        }
      case "update_alert":
        {
          if (req.method !== "POST") return corsResponse({
            error: "POST required"
          }, 405);
          const b = await req.json();
          if (!b.alert_id || !b.status) return corsResponse({
            error: "alert_id and status required"
          }, 400);
          const { data, error } = await supabase.from("price_alerts").update({
            status: b.status,
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
            notes: b.notes || null
          }).eq("id", b.alert_id).eq("user_id", userId).select().single();
          if (error) return corsResponse({
            error: error.message
          }, 500);
          return corsResponse(data);
        }
      case "suppliers":
        {
          const { data, error } = await supabase.from("v_supplier_summary").select("*").eq("user_id", userId).order("supplier_name");
          if (error) return corsResponse({
            error: error.message
          }, 500);
          return corsResponse(data);
        }
      case "settings":
        {
          const { data: cur, error: ce } = await supabase.from("price_monitor_settings").select("*").eq("user_id", userId).maybeSingle();
          if (ce) return corsResponse({
            error: ce.message
          }, 500);
          let s = normalizeSettingsRecord(cur);
          if (req.method === "POST") {
            const b = await req.json();
            s = {
              ...s,
              alert_threshold_percent: b.alert_threshold_percent ?? s.alert_threshold_percent,
              auto_alert: b.auto_alert ?? s.auto_alert,
              notify_email: b.notify_email ?? s.notify_email,
              manual_exchange_rates: normalizeManualExchangeRates(b.manual_exchange_rates),
              exchange_rates: normalizeExchangeRates(b.exchange_rates)
            };
            try {
              const r = await fetchLatestExchangeRates();
              s = {
                ...s,
                ...r
              };
            } catch  {}
            const { data, error } = await supabase.from("price_monitor_settings").upsert({
              user_id: userId,
              ...s,
              updated_at: new Date().toISOString()
            }, {
              onConflict: "user_id"
            }).select().single();
            if (error) return corsResponse({
              error: error.message
            }, 500);
            return corsResponse(normalizeSettingsRecord(data));
          }
          if (shouldRefreshExchangeRates(s)) {
            try {
              const r = await fetchLatestExchangeRates();
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
          return corsResponse(s);
        }
      case "export_excel":
        {
          const sid = url.searchParams.get("supplier_id");
          let q = supabase.from("v_product_overview").select("*").eq("user_id", userId);
          if (sid) q = q.eq("supplier_id", sid);
          const { data: p } = await q.order("product_name");
          const { data: a } = await supabase.from("v_alerts_overview").select("*").eq("user_id", userId).eq("status", "new").order("change_percent", {
            ascending: false
          });
          return corsResponse({
            products: p || [],
            alerts: a || [],
            exported_at: new Date().toISOString()
          });
        }
      case "spend_overview":
        {
          const [bs, bc, bm] = await Promise.all([
            supabase.from("v_spend_by_supplier").select("*").eq("user_id", userId).order("total_spend", {
              ascending: false
            }),
            supabase.from("v_spend_by_category").select("*").eq("user_id", userId).order("total_spend", {
              ascending: false
            }),
            supabase.from("v_spend_monthly").select("*").eq("user_id", userId).order("month", {
              ascending: true
            })
          ]);
          const sups = bs.data || [];
          return corsResponse({
            total_spend: sups.reduce((s, r)=>s + (Number(r.total_spend) || 0), 0),
            spend_last_30d: sups.reduce((s, r)=>s + (Number(r.spend_last_30d) || 0), 0),
            spend_last_12m: sups.reduce((s, r)=>s + (Number(r.spend_last_12m) || 0), 0),
            by_supplier: sups,
            by_category: bc.data || [],
            monthly: bm.data || []
          });
        }
      case "spend_by_supplier":
        {
          const { data, error } = await supabase.from("v_spend_by_supplier").select("*").eq("user_id", userId).order("total_spend", {
            ascending: false
          });
          if (error) return corsResponse({
            error: error.message
          }, 500);
          return corsResponse(data);
        }
      case "spend_by_category":
        {
          const { data, error } = await supabase.from("v_spend_by_category").select("*").eq("user_id", userId).order("total_spend", {
            ascending: false
          });
          if (error) return corsResponse({
            error: error.message
          }, 500);
          return corsResponse(data);
        }
      case "spend_monthly":
        {
          const sid = url.searchParams.get("supplier_id");
          let q = supabase.from("v_spend_monthly").select("*").eq("user_id", userId);
          if (sid) q = q.eq("supplier_id", sid);
          const { data, error } = await q.order("month", {
            ascending: true
          });
          if (error) return corsResponse({
            error: error.message
          }, 500);
          return corsResponse(data);
        }
      case "compare_suppliers":
        {
          const gid = url.searchParams.get("group_id");
          let q = supabase.from("v_cross_supplier_comparison").select("*").eq("user_id", userId);
          if (gid) q = q.eq("group_id", gid);
          const { data, error } = await q;
          if (error) return corsResponse({
            error: error.message
          }, 500);
          return corsResponse(data);
        }
      case "product_groups":
        {
          if (req.method === "POST") {
            const b = await req.json();
            if (!b.name) return corsResponse({
              error: "name required"
            }, 400);
            const { data: g, error: ge } = await supabase.from("product_groups").upsert({
              user_id: userId,
              name: b.name.toLowerCase().trim(),
              category_id: b.category_id || null,
              updated_at: new Date().toISOString()
            }, {
              onConflict: "user_id,name"
            }).select("id").single();
            if (ge) return corsResponse({
              error: ge.message
            }, 500);
            if (b.product_ids?.length > 0) await supabase.from("products").update({
              group_id: g.id
            }).in("id", b.product_ids).eq("user_id", userId);
            return corsResponse({
              id: g.id,
              name: b.name,
              product_ids: b.product_ids || []
            });
          }
          const { data, error } = await supabase.from("product_groups").select("*, spend_categories(name, color), products(id, name, unit, supplier_id, suppliers(name))").eq("user_id", userId).order("name");
          if (error) return corsResponse({
            error: error.message
          }, 500);
          return corsResponse(data);
        }
      case "categories":
        {
          if (req.method === "POST") {
            const b = await req.json();
            if (!b.name) return corsResponse({
              error: "name required"
            }, 400);
            const { data, error } = await supabase.from("spend_categories").upsert({
              user_id: userId,
              name: b.name,
              color: b.color || null
            }, {
              onConflict: "user_id,name"
            }).select().single();
            if (error) return corsResponse({
              error: error.message
            }, 500);
            return corsResponse(data);
          }
          const { data, error } = await supabase.from("spend_categories").select("*").eq("user_id", userId).order("name");
          if (error) return corsResponse({
            error: error.message
          }, 500);
          return corsResponse(data);
        }
      // =========================================
      // AGREEMENTS CRUD
      // =========================================
      case "agreements":
        {
          if (req.method === "POST") {
            const b = await req.json();
            if (!b.supplier_id || !b.name || !b.start_date) return corsResponse({
              error: "supplier_id, name, start_date required"
            }, 400);
            const { data: agr, error: ae } = await supabase.from("agreements").insert({
              user_id: userId,
              supplier_id: b.supplier_id,
              name: b.name,
              agreement_number: b.agreement_number || null,
              start_date: b.start_date,
              end_date: b.end_date || null,
              status: b.status || "active",
              discount_percent: b.discount_percent || null,
              terms_description: b.terms_description || null,
              document_url: b.document_url || null,
              notes: b.notes || null
            }).select().single();
            if (ae) return corsResponse({
              error: ae.message
            }, 500);
            // Insert agreement items if provided
            if (b.items && b.items.length > 0) {
              const items = b.items.map((it)=>({
                  agreement_id: agr.id,
                  user_id: userId,
                  product_group_id: it.product_group_id || null,
                  category_id: it.category_id || null,
                  description: it.description || null,
                  agreed_price: it.agreed_price || null,
                  discount_percent: it.discount_percent || null,
                  max_price: it.max_price || null,
                  unit: it.unit || null
                }));
              await supabase.from("agreement_items").insert(items);
            }
            return corsResponse(agr);
          }
          if (req.method === "PUT") {
            const b = await req.json();
            if (!b.id) return corsResponse({
              error: "id required"
            }, 400);
            const updates = {};
            if (b.name !== undefined) updates.name = b.name;
            if (b.agreement_number !== undefined) updates.agreement_number = b.agreement_number;
            if (b.start_date !== undefined) updates.start_date = b.start_date;
            if (b.end_date !== undefined) updates.end_date = b.end_date;
            if (b.status !== undefined) updates.status = b.status;
            if (b.discount_percent !== undefined) updates.discount_percent = b.discount_percent;
            if (b.terms_description !== undefined) updates.terms_description = b.terms_description;
            if (b.document_url !== undefined) updates.document_url = b.document_url;
            if (b.notes !== undefined) updates.notes = b.notes;
            updates.updated_at = new Date().toISOString();
            const { data, error } = await supabase.from("agreements").update(updates).eq("id", b.id).eq("user_id", userId).select().single();
            if (error) return corsResponse({
              error: error.message
            }, 500);
            return corsResponse(data);
          }
          // GET
          const sid = url.searchParams.get("supplier_id");
          const st = url.searchParams.get("status");
          let q = supabase.from("agreements").select(`*, suppliers(name), agreement_items(id, product_group_id, category_id, description, agreed_price, discount_percent, max_price, unit, product_groups(name), spend_categories(name))`).eq("user_id", userId);
          if (sid) q = q.eq("supplier_id", sid);
          if (st) q = q.eq("status", st);
          const { data, error } = await q.order("created_at", {
            ascending: false
          });
          if (error) return corsResponse({
            error: error.message
          }, 500);
          return corsResponse(data);
        }
      case "agreement_items":
        {
          if (req.method === "POST") {
            const b = await req.json();
            if (!b.agreement_id) return corsResponse({
              error: "agreement_id required"
            }, 400);
            const item = {
              agreement_id: b.agreement_id,
              user_id: userId,
              product_group_id: b.product_group_id || null,
              category_id: b.category_id || null,
              description: b.description || null,
              agreed_price: b.agreed_price || null,
              discount_percent: b.discount_percent || null,
              max_price: b.max_price || null,
              unit: b.unit || null
            };
            const { data, error } = await supabase.from("agreement_items").insert(item).select().single();
            if (error) return corsResponse({
              error: error.message
            }, 500);
            return corsResponse(data);
          }
          if (req.method === "DELETE") {
            const b = await req.json();
            if (!b.id) return corsResponse({
              error: "id required"
            }, 400);
            const { error } = await supabase.from("agreement_items").delete().eq("id", b.id).eq("user_id", userId);
            if (error) return corsResponse({
              error: error.message
            }, 500);
            return corsResponse({
              deleted: true
            });
          }
          const aid = url.searchParams.get("agreement_id");
          if (!aid) return corsResponse({
            error: "agreement_id required"
          }, 400);
          const { data, error } = await supabase.from("agreement_items").select("*, product_groups(name), spend_categories(name)").eq("agreement_id", aid).eq("user_id", userId);
          if (error) return corsResponse({
            error: error.message
          }, 500);
          return corsResponse(data);
        }
      case "deviations":
        {
          const st = url.searchParams.get("status");
          const aid = url.searchParams.get("agreement_id");
          let q = supabase.from("agreement_deviations").select(`*, agreements(name, supplier_id, suppliers(name)), products(name, unit)`).eq("user_id", userId);
          if (st) q = q.eq("status", st);
          if (aid) q = q.eq("agreement_id", aid);
          const { data, error } = await q.order("created_at", {
            ascending: false
          });
          if (error) return corsResponse({
            error: error.message
          }, 500);
          return corsResponse(data);
        }
      case "update_deviation":
        {
          if (req.method !== "POST") return corsResponse({
            error: "POST required"
          }, 405);
          const b = await req.json();
          if (!b.deviation_id || !b.status) return corsResponse({
            error: "deviation_id and status required"
          }, 400);
          const { data, error } = await supabase.from("agreement_deviations").update({
            status: b.status,
            reviewed_by: userId,
            reviewed_at: new Date().toISOString(),
            notes: b.notes || null
          }).eq("id", b.deviation_id).eq("user_id", userId).select().single();
          if (error) return corsResponse({
            error: error.message
          }, 500);
          return corsResponse(data);
        }
      // AI endpoints (unchanged)
      case "suggest_groups":
        {
          const { data: ug } = await supabase.from("products").select("id, name, normalized_name, unit, supplier_id, suppliers!inner(name)").eq("user_id", userId).is("group_id", null);
          if (!ug || ug.length < 2) return corsResponse({
            suggestions: []
          });
          const pl = ug.map((p)=>`- "${p.name}" (norm: "${p.normalized_name}", unit: ${p.unit || '?'}, supplier: ${p.suppliers?.name || '?'}, id: ${p.id})`).join("\n");
          const ar = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": ANTHROPIC_API_KEY,
              "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-5-20250514",
              max_tokens: 2048,
              system: "Analyze products, find same items across different suppliers. Return ONLY JSON array, no markdown.",
              messages: [
                {
                  role: "user",
                  content: `Group these products by same item across suppliers:\n${pl}\nReturn: [{"group_name":"name","product_ids":["id"],"confidence":0-1,"reason":"why"}]. Only 2+ products from DIFFERENT suppliers.`
                }
              ]
            })
          });
          if (!ar.ok) return corsResponse({
            suggestions: []
          });
          const ad = await ar.json();
          let t = ad.content?.filter((b)=>b.type === "text").map((b)=>b.text).join("") || "[]";
          t = t.replace(/```json/g, "").replace(/```/g, "").trim();
          const f = t.indexOf("["), l = t.lastIndexOf("]");
          if (f !== -1 && l > f) t = t.substring(f, l + 1);
          try {
            const sg = JSON.parse(t);
            return corsResponse({
              suggestions: sg.map((s)=>({
                  ...s,
                  products: s.product_ids.map((id)=>{
                    const p = ug.find((u)=>u.id === id);
                    return p ? {
                      id: p.id,
                      name: p.name,
                      unit: p.unit,
                      supplier: p.suppliers?.name
                    } : null;
                  }).filter(Boolean)
                }))
            });
          } catch  {
            return corsResponse({
              suggestions: []
            });
          }
        }
      case "ai_insights":
        {
          const [ss, aa, pp] = await Promise.all([
            supabase.from("v_spend_by_supplier").select("*").eq("user_id", userId).order("total_spend", {
              ascending: false
            }).limit(20),
            supabase.from("v_alerts_overview").select("*").eq("user_id", userId).limit(20),
            supabase.from("v_product_overview").select("*").eq("user_id", userId).limit(50)
          ]);
          const ss2 = (ss.data || []).map((s)=>`${s.supplier_name}: ${s.total_spend} SEK`).join("\n");
          const aa2 = (aa.data || []).map((a)=>`${a.product_name}: ${a.previous_price}→${a.new_price} (${a.change_percent}%)`).join("\n");
          if (!ss2 && !aa2) return corsResponse({
            insights: []
          });
          const ar = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": ANTHROPIC_API_KEY,
              "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-5-20250514",
              max_tokens: 2048,
              system: "Procurement analyst for Swedish municipalities. Return ONLY JSON in Swedish.",
              messages: [
                {
                  role: "user",
                  content: `Analysera:\nLeverantörer:\n${ss2 || 'Ingen'}\nPrisändringar:\n${aa2 || 'Inga'}\nGe 3-5 insikter som JSON:[{"title":"str","insight":"str","impact":"high|medium|low","action":"str","estimated_savings_sek":num|null}]`
                }
              ]
            })
          });
          if (!ar.ok) return corsResponse({
            insights: []
          });
          const ad = await ar.json();
          let t = ad.content?.filter((b)=>b.type === "text").map((b)=>b.text).join("") || "[]";
          t = t.replace(/```json/g, "").replace(/```/g, "").trim();
          const fb = t.indexOf("["), lb = t.lastIndexOf("]");
          if (fb !== -1 && lb > fb) t = t.substring(fb, lb + 1);
          try {
            return corsResponse({
              insights: JSON.parse(t)
            });
          } catch  {
            return corsResponse({
              insights: []
            });
          }
        }
      default:
        return corsResponse({
          error: `Unknown action: ${action}`
        }, 400);
    }
  } catch (err) {
    console.error("Dashboard error:", err);
    return corsResponse({
      error: String(err)
    }, 500);
  }
});
function normalizeExchangeRates(v) {
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
function normalizeManualExchangeRates(v) {
  const r = {};
  for (const c of FX_SYMBOLS){
    const p = typeof v?.[c] === "number" ? v[c] : Number(v?.[c]);
    if (Number.isFinite(p) && p > 0) r[c] = Math.round(p * 1e6) / 1e6;
  }
  return r;
}
function normalizeSettingsRecord(row) {
  return {
    alert_threshold_percent: row?.alert_threshold_percent ?? 5,
    auto_alert: row?.auto_alert ?? true,
    notify_email: row?.notify_email ?? null,
    exchange_rates: normalizeExchangeRates(row?.exchange_rates),
    manual_exchange_rates: normalizeManualExchangeRates(row?.manual_exchange_rates),
    exchange_rates_source: row?.exchange_rates_source ?? null,
    exchange_rates_updated_at: row?.exchange_rates_updated_at ?? null
  };
}
function shouldRefreshExchangeRates(s) {
  const r = normalizeExchangeRates(s.exchange_rates);
  if (FX_SYMBOLS.some((c)=>!(r[c] > 0))) return true;
  if (!s.exchange_rates_updated_at) return true;
  const t = new Date(s.exchange_rates_updated_at).getTime();
  return !Number.isFinite(t) || Date.now() - t > FX_STALE_MS;
}
async function fetchLatestExchangeRates() {
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
function corsResponse(data, status = 200) {
  return new Response(typeof data === "string" ? data : JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
    }
  });
}
