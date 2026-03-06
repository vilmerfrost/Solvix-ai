"use client";

import { useCallback, useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Upload,
  Search,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button, Skeleton } from "@/components/ui/index";
import { AiSuggestions } from "@/components/price-monitor/ai-suggestions";
import { InvoiceUploadModal } from "@/components/price-monitor/invoice-upload-modal";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  AiGroupSuggestion,
  createProductGroup,
  fetchDashboard,
  fetchGroupSuggestions,
  ProductOverview,
  Supplier,
  formatSEK,
  formatPercent,
  formatDate,
} from "@/lib/price-monitor-api";

type SortKey = keyof ProductOverview;
type SortDir = "asc" | "desc";

function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supplierParam = searchParams.get("supplier_id") ?? "";

  const [products, setProducts] = useState<ProductOverview[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<{ access_token: string; user: { id: string } } | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [supplierFilter, setSupplierFilter] = useState(supplierParam);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: "product_name",
    dir: "asc",
  });
  const [hideZeroItems, setHideZeroItems] = useState(true);
  const [suggestions, setSuggestions] = useState<AiGroupSuggestion[]>([]);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s) { router.push("/auth/login"); return; }
    setSession(s as { access_token: string; user: { id: string } });

    try {
      const params: Record<string, string> = {};
      if (supplierFilter) params.supplier_id = supplierFilter;

      const [prods, sups] = await Promise.all([
        fetchDashboard<ProductOverview[]>("products", params, s),
        fetchDashboard<Supplier[]>("suppliers", undefined, s),
      ]);
      setProducts(prods);
      setSuppliers(sups);

      if (sups.length >= 2) {
        const nextSuggestions = await fetchGroupSuggestions(s).catch(() => []);
        setSuggestions(nextSuggestions);
      } else {
        setSuggestions([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kunde inte hämta produkter.");
    } finally {
      setLoading(false);
    }
  }, [router, supplierFilter]);

  useEffect(() => { load(); }, [load]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  }

  const filtered = useMemo(() => {
    let list = [...products];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.product_name.toLowerCase().includes(q));
    }
    if (hideZeroItems) {
      list = list.filter(
        (p) => p.latest_price !== null && p.latest_price > 0
      );
    }
    list.sort((a, b) => {
      const av = a[sort.key] ?? "";
      const bv = b[sort.key] ?? "";
      if (av < bv) return sort.dir === "asc" ? -1 : 1;
      if (av > bv) return sort.dir === "asc" ? 1 : -1;
      return 0;
    });
    return list;
  }, [hideZeroItems, products, search, sort]);

  async function handleAcceptSuggestion(suggestion: AiGroupSuggestion) {
    if (!session) return;

    const matchedProductIds = products
      .filter((product) => suggestion.products.includes(product.product_name))
      .map((product) => product.product_id);

    if (matchedProductIds.length < 2) return;

    try {
      await createProductGroup(
        suggestion.group_name,
        null,
        matchedProductIds,
        session
      );
      setSuggestions((prev) =>
        prev.filter((item) => item.group_name !== suggestion.group_name)
      );
      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Kunde inte skapa produktgruppen."
      );
    }
  }

  function handleIgnoreSuggestion(suggestion: AiGroupSuggestion) {
    setSuggestions((prev) =>
      prev.filter((item) => item.group_name !== suggestion.group_name)
    );
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sort.key !== k)
      return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sort.dir === "asc" ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  }

  function Th({
    label,
    k,
    right,
  }: {
    label: string;
    k: SortKey;
    right?: boolean;
  }) {
    return (
      <th
        className={`px-4 py-3 text-xs font-medium cursor-pointer select-none whitespace-nowrap ${
          right ? "text-right" : "text-left"
        }`}
        style={{ color: "var(--color-text-muted)" }}
        onClick={() => toggleSort(k)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <SortIcon k={k} />
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Produkter
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-muted)" }}>
            {loading ? "…" : `${filtered.length} produkter`}
          </p>
        </div>
        {session && (
          <Button
            variant="primary"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => setShowUpload(true)}
          >
            Ladda upp faktura
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-2 flex-1 min-w-48"
          style={{
            background: "var(--color-bg-elevated)",
            borderColor: "var(--color-border)",
          }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--color-text-muted)" }} />
          <input
            className="flex-1 text-sm bg-transparent outline-none"
            style={{ color: "var(--color-text-primary)" }}
            placeholder="Sök produkt…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="rounded-lg border px-3 py-2 text-sm"
          style={{
            background: "var(--color-bg-elevated)",
            borderColor: "var(--color-border)",
            color: "var(--color-text-primary)",
          }}
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
        >
          <option value="">Alla leverantörer</option>
          {suppliers.map((s) => (
            <option key={s.supplier_id} value={s.supplier_id}>
              {s.supplier_name}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          onClick={() => setHideZeroItems((prev) => !prev)}
        >
          {hideZeroItems ? "Visa alla" : "Dölj nollposter"}
        </Button>
      </div>

      <AiSuggestions
        suggestions={suggestions}
        onAccept={handleAcceptSuggestion}
        onIgnore={handleIgnoreSuggestion}
      />

      {error && (
        <p
          className="text-sm px-4 py-3 rounded-lg"
          style={{ background: "#fef2f2", color: "#ef4444" }}
        >
          {error}
        </p>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-xl border p-12 text-center"
          style={{
            background: "var(--color-bg-secondary)",
            borderColor: "var(--color-border)",
          }}
        >
          <Upload className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--color-text-muted)" }} />
          <p className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>
            Inga produkter hittades
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            Ladda upp din första faktura för att börja spåra priser
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-x-auto"
          style={{ borderColor: "var(--color-border)" }}
        >
          <table className="w-full text-sm" style={{ background: "var(--color-bg-elevated)" }}>
            <thead
              style={{
                background: "var(--color-bg-secondary)",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <tr>
                <Th label="Produkt" k="product_name" />
                <Th label="Leverantör" k="supplier_name" />
                <Th label="Enhet" k="unit" />
                <Th label="Senaste pris" k="latest_price" right />
                <Th label="Föreg. pris" k="previous_price" right />
                <Th label="Förändring" k="change_percent" right />
                <Th label="Antal fakturor" k="invoice_count" right />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => (
                <ProductRow
                  key={p.product_id}
                  product={p}
                  last={idx === filtered.length - 1}
                  onClick={() => router.push(`/price-monitor/products/${p.product_id}`)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUpload && session && (
        <InvoiceUploadModal
          session={session}
          onClose={() => setShowUpload(false)}
          onProcessed={() => { setShowUpload(false); load(); }}
        />
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 max-w-6xl mx-auto">
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-12 rounded-xl" />
            ))}
          </div>
        </div>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}

function ProductRow({
  product: p,
  last,
  onClick,
}: {
  product: ProductOverview;
  last: boolean;
  onClick: () => void;
}) {
  const change = p.change_percent;
  const increase = change !== null && change > 0;
  const decrease = change !== null && change < 0;
  const isZeroItem = p.latest_price === null || p.latest_price === 0;

  return (
    <tr
      onClick={onClick}
      className="cursor-pointer transition-colors hover:bg-opacity-50"
      style={{
        borderBottom: last ? "none" : "1px solid var(--color-border)",
        opacity: isZeroItem ? 0.65 : 1,
      }}
    >
      <td
        className="px-4 py-3 font-medium"
        style={{ color: "var(--color-text-primary)" }}
      >
        {p.product_name}
        {isZeroItem && (
          <div className="text-xs font-normal" style={{ color: "var(--color-text-muted)" }}>
            Inkluderad nollpost
          </div>
        )}
      </td>
      <td className="px-4 py-3" style={{ color: "var(--color-text-secondary)" }}>
        {p.supplier_name}
      </td>
      <td className="px-4 py-3" style={{ color: "var(--color-text-muted)" }}>
        {p.unit ?? "–"}
      </td>
      <td
        className="px-4 py-3 text-right font-medium"
        style={{ color: "var(--color-text-primary)" }}
      >
        {p.latest_price !== null ? formatSEK(p.latest_price) : "–"}
        <div className="text-xs font-normal" style={{ color: "var(--color-text-muted)" }}>
          {formatDate(p.latest_date)}
        </div>
      </td>
      <td
        className="px-4 py-3 text-right"
        style={{ color: "var(--color-text-muted)" }}
      >
        {p.previous_price !== null ? formatSEK(p.previous_price) : "–"}
        {p.previous_date && (
          <div className="text-xs">{formatDate(p.previous_date)}</div>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {change === null ? (
          <span style={{ color: "var(--color-text-muted)" }}>–</span>
        ) : (
          <span
            className="inline-flex items-center gap-1 font-semibold"
            style={{ color: increase ? "#ef4444" : decrease ? "#22c55e" : "var(--color-text-muted)" }}
          >
            {increase && <TrendingUp className="w-3.5 h-3.5" />}
            {decrease && <TrendingDown className="w-3.5 h-3.5" />}
            {!increase && !decrease && <Minus className="w-3.5 h-3.5" />}
            {formatPercent(change)}
          </span>
        )}
      </td>
      <td
        className="px-4 py-3 text-right"
        style={{ color: "var(--color-text-muted)" }}
      >
        {p.invoice_count}
      </td>
    </tr>
  );
}
