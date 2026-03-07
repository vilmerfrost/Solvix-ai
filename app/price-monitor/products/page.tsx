"use client";

import { useCallback, useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Upload,
  Search,
  ChevronUp,
  ChevronDown,
  Trash2,
  Merge,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Button, Skeleton, useToast } from "@/components/ui/index";
import { AiSuggestions } from "@/components/price-monitor/ai-suggestions";
import { InvoiceUploadModal } from "@/components/price-monitor/invoice-upload-modal";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  AiGroupSuggestion,
  createProductGroup,
  ensureArray,
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
  const t = useTranslations("products");
  const { addToast } = useToast();
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
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [mergeName, setMergeName] = useState("");
  const [merging, setMerging] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s) { router.push("/auth/login"); return; }
    setSession(s as { access_token: string; user: { id: string } });

    try {
      const params: Record<string, string> = {};
      if (supplierFilter) params.supplier_id = supplierFilter;

      const [prodsRaw, supsRaw] = await Promise.all([
        fetchDashboard<unknown>("products", params, s),
        fetchDashboard<unknown>("suppliers", undefined, s),
      ]);
      const prods = ensureArray<ProductOverview>(prodsRaw);
      const sups = ensureArray<Supplier>(supsRaw);
      setProducts(prods);
      setSuppliers(sups);

      if (sups.length >= 2) {
        const nextSuggestionsRaw = await fetchGroupSuggestions(s).catch(() => []);
        const nextSuggestions = ensureArray<AiGroupSuggestion>(nextSuggestionsRaw);
        setSuggestions(nextSuggestions as AiGroupSuggestion[]);
      } else {
        setSuggestions([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error"));
    } finally {
      setLoading(false);
    }
  }, [router, supplierFilter, t]);

  useEffect(() => { load(); }, [load]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" }
    );
  }

  const filtered = useMemo(() => {
    const safeProducts = Array.isArray(products) ? products : [];
    let list = [...safeProducts];
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

  useEffect(() => {
    const validIds = new Set(filtered.map((product) => product.product_id));
    setSelectedProductIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [filtered]);

  const allFilteredSelected =
    filtered.length > 0 &&
    filtered.every((product) => selectedProductIds.includes(product.product_id));

  function toggleProductSelection(productId: string) {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedProductIds([]);
      return;
    }

    setSelectedProductIds(filtered.map((product) => product.product_id));
  }

  async function handleDeleteSelected() {
    if (selectedProductIds.length === 0) return;

    const confirmed = window.confirm(
      t("deleteSelectedConfirm", { count: selectedProductIds.length })
    );
    if (!confirmed) return;

    setDeletingSelected(true);
    setError("");

    try {
      const results = await Promise.allSettled(
        selectedProductIds.map(async (productId) => {
          const response = await fetch(`/api/price-monitor/products/${productId}`, {
            method: "DELETE",
          });
          const body = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(body?.error || t("deleteError"));
          }
        })
      );

      const failed = results.filter((result) => result.status === "rejected");
      const deletedCount = results.length - failed.length;

      if (deletedCount > 0) {
        addToast({
          type: "success",
          title: t("deleteSelectedSuccess", { count: deletedCount }),
        });
      }

      if (failed.length > 0) {
        setError(
          failed[0].status === "rejected"
            ? failed[0].reason instanceof Error
              ? failed[0].reason.message
              : t("deleteSelectedError")
            : t("deleteSelectedError")
        );
      }

      setSelectedProductIds([]);
      await load();
    } finally {
      setDeletingSelected(false);
    }
  }

  async function handleMergeSelected() {
    if (selectedProductIds.length < 2) return;

    const name = mergeName.trim();
    const keepId = selectedProductIds[0];
    const mergeIds = selectedProductIds.slice(1);

    // Fall back to the kept product's current name if user left the field empty
    const defaultName =
      products.find((p) => p.product_id === keepId)?.product_name ?? "";

    setMerging(true);
    setError("");

    try {
      const response = await fetch("/api/price-monitor/products/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keepProductId: keepId,
          mergeProductIds: mergeIds,
          newName: name || defaultName,
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body?.error || t("mergeError"));
      }

      addToast({ type: "success", title: t("mergeSuccess") });
      setSelectedProductIds([]);
      setShowMergeDialog(false);
      setMergeName("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("mergeError"));
    } finally {
      setMerging(false);
    }
  }

  async function handleAcceptSuggestion(suggestion: AiGroupSuggestion) {
    if (!session) return;

    const prodNames = Array.isArray(suggestion?.products) ? suggestion.products : [];
    const matchedProductIds = products
      .filter((product) => prodNames.includes(product.product_name))
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
          : t("groupCreateError")
      );
    }
  }

  function handleIgnoreSuggestion(suggestion: AiGroupSuggestion) {
    setSuggestions((prev) =>
      prev.filter((item) => item.group_name !== suggestion.group_name)
    );
  }

  function handleRenameProduct(productId: string, newName: string) {
    setProducts((prev) =>
      prev.map((p) => p.product_id === productId ? { ...p, product_name: newName } : p)
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
        className={`px-4 py-3 text-xs font-medium text-gray-500 cursor-pointer select-none whitespace-nowrap ${
          right ? "text-right" : "text-left"
        }`}
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
          <h1 className="text-2xl font-bold text-gray-900">
            {t("title")}
          </h1>
          <p className="text-sm mt-0.5 text-gray-500">
            {loading ? "…" : t("count", { count: filtered.length })}
          </p>
        </div>
        {session && (
          <Button
            variant="primary"
            icon={<Upload className="w-4 h-4" />}
            onClick={() => setShowUpload(true)}
          >
            {t("uploadInvoice")}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div
          className="flex items-center gap-2 bg-white rounded-lg border border-gray-300 px-3 py-2 flex-1 min-w-48 focus-within:border-pink-500 focus-within:ring-1 focus-within:ring-pink-500 transition-all shadow-sm"
        >
          <Search className="w-4 h-4 flex-shrink-0 text-gray-400" />
          <input
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder-gray-400"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-white rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all shadow-sm"
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
        >
          <option value="">{t("allSuppliers")}</option>
          {(Array.isArray(suppliers) ? suppliers : []).map((s) => (
            <option key={s.supplier_id} value={s.supplier_id}>
              {s.supplier_name}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          onClick={() => setHideZeroItems((prev) => !prev)}
        >
          {hideZeroItems ? t("showDetailRows") : t("hideDetailRows")}
        </Button>
        <Button
          variant="danger"
          icon={<Trash2 className="w-4 h-4" />}
          onClick={handleDeleteSelected}
          disabled={selectedProductIds.length === 0 || deletingSelected}
          loading={deletingSelected}
        >
          {t("deleteSelected", { count: selectedProductIds.length })}
        </Button>
        {selectedProductIds.length >= 2 && (
          <Button
            variant="secondary"
            icon={<Merge className="w-4 h-4" />}
            onClick={() => {
              const defaultName =
                products.find((p) => p.product_id === selectedProductIds[0])?.product_name ?? "";
              setMergeName(defaultName);
              setShowMergeDialog(true);
            }}
          >
            {t("mergeSelected", { count: selectedProductIds.length })}
          </Button>
        )}
      </div>

      <AiSuggestions
        suggestions={suggestions}
        onAccept={handleAcceptSuggestion}
        onIgnore={handleIgnoreSuggestion}
      />

      {error && (
        <p
          className="text-sm px-4 py-3 rounded-lg"
          style={{ background: "var(--color-error-bg)", color: "var(--color-error)" }}
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
          className="bg-gray-50 rounded-xl border border-gray-200 p-12 text-center"
        >
          <Upload className="w-10 h-10 mx-auto mb-3 text-gray-400" />
          <p className="font-medium text-sm text-gray-900">
            {t("emptyTitle")}
          </p>
          <p className="text-xs mt-1 text-gray-500">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <div
          className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm"
        >
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    aria-label={t("selectAll")}
                  />
                </th>
                <Th label={t("table.product")} k="product_name" />
                <Th label={t("table.supplier")} k="supplier_name" />
                <Th label={t("table.unit")} k="unit" />
                <Th label={t("table.latestPrice")} k="latest_price" right />
                <Th label={t("table.previousPrice")} k="previous_price" right />
                <Th label={t("table.change")} k="change_percent" right />
                <Th label={t("table.invoiceCount")} k="invoice_count" right />
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => (
                <ProductRow
                  key={p.product_id}
                  product={p}
                  last={idx === filtered.length - 1}
                  selected={selectedProductIds.includes(p.product_id)}
                  onToggleSelect={() => toggleProductSelection(p.product_id)}
                  onClick={() => router.push(`/price-monitor/products/${p.product_id}`)}
                  onRenamed={handleRenameProduct}
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

      {/* Merge dialog */}
      {showMergeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-gray-200 p-6 shadow-xl"
          >
            <h2 className="text-base font-semibold mb-1 text-gray-900">
              {t("mergeTitle")}
            </h2>
            <p className="text-sm mb-4 text-gray-500">
              {t("mergeDescription", { count: selectedProductIds.length })}
            </p>

            <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
              {selectedProductIds.map((id, idx) => {
                const prod = products.find((p) => p.product_id === id);
                return (
                  <div key={id} className="flex items-center gap-2 text-sm">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-medium ${idx === 0 ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-500'}`}
                    >
                      {idx === 0 ? "✓" : "→"}
                    </span>
                    <span className={idx === 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                      {prod?.product_name ?? id}
                      {idx === 0 && (
                        <span className="ml-1.5 text-xs text-pink-500">
                          {t("mergeKept")}
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>

            <label className="block text-xs font-medium mb-1 text-gray-500">
              {t("mergeNameLabel")}
            </label>
            <input
              className="w-full bg-white rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 mb-5 outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition-all shadow-sm"
              value={mergeName}
              onChange={(e) => setMergeName(e.target.value)}
              placeholder={products.find((p) => p.product_id === selectedProductIds[0])?.product_name ?? ""}
            />

            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                onClick={() => { setShowMergeDialog(false); setMergeName(""); }}
              >
                {t("mergeCancel")}
              </Button>
              <Button
                variant="primary"
                icon={<Merge className="w-4 h-4" />}
                loading={merging}
                onClick={handleMergeSelected}
              >
                {t("mergeConfirm")}
              </Button>
            </div>
          </div>
        </div>
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
  selected,
  onToggleSelect,
  onClick,
  onRenamed,
}: {
  product: ProductOverview;
  last: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onClick: () => void;
  onRenamed: (id: string, newName: string) => void;
}) {
  const t = useTranslations("products");
  const change = p.change_percent;
  const increase = change !== null && change > 0;
  const decrease = change !== null && change < 0;
  const isZeroItem = p.latest_price === null || p.latest_price === 0;
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(p.product_name);
  const [saving, setSaving] = useState(false);

  async function saveRename() {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === p.product_name) { setEditing(false); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/price-monitor/products/${p.product_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        onRenamed(p.product_id, trimmed);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") saveRename();
    if (e.key === "Escape") { setEditing(false); setEditName(p.product_name); }
  }

  return (
    <tr
      onClick={editing ? undefined : onClick}
      className={`transition-colors hover:bg-pink-50 ${editing ? '' : 'cursor-pointer'} ${last ? '' : 'border-b border-gray-100'}`}
      style={{ opacity: isZeroItem ? 0.65 : 1 }}
    >
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          aria-label={t("selectProduct")}
          className="accent-pink-500"
        />
      </td>
      <td className="px-4 py-3 font-medium text-gray-900" onClick={(e) => e.stopPropagation()}>
        {editing ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              className="flex-1 min-w-0 text-sm border border-pink-400 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-pink-500"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={saveRename}
              disabled={saving}
              className="p-1 text-emerald-500 hover:text-emerald-600 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setEditing(false); setEditName(p.product_name); }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 group">
            <span onClick={onClick} className="cursor-pointer">{p.product_name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); setEditing(true); }}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-pink-500 transition-opacity"
            >
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
        {isZeroItem && !editing && (
          <div className="text-xs font-normal text-gray-500">
            {t("includedZeroItem")}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500">{p.supplier_name}</td>
      <td className="px-4 py-3 text-gray-500">{p.unit ?? "–"}</td>
      <td className="px-4 py-3 text-right font-medium text-gray-900">
        {p.latest_price !== null ? formatSEK(p.latest_price) : "–"}
        <div className="text-xs font-normal text-gray-500">{formatDate(p.latest_date)}</div>
      </td>
      <td className="px-4 py-3 text-right text-gray-500">
        {p.previous_price !== null ? formatSEK(p.previous_price) : "–"}
        {p.previous_date && <div className="text-xs">{formatDate(p.previous_date)}</div>}
      </td>
      <td className="px-4 py-3 text-right">
        {change === null ? (
          <span className="text-gray-400">–</span>
        ) : (
          <span className={`inline-flex items-center gap-1 font-semibold ${increase ? 'text-red-500' : decrease ? 'text-emerald-500' : 'text-gray-400'}`}>
            {increase && <TrendingUp className="w-3.5 h-3.5" />}
            {decrease && <TrendingDown className="w-3.5 h-3.5" />}
            {!increase && !decrease && <Minus className="w-3.5 h-3.5" />}
            {formatPercent(change)}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-right text-gray-500">{p.invoice_count}</td>
    </tr>
  );
}
