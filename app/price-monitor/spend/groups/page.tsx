"use client";

import { useEffect, useMemo, useState } from "react";
import { Layers3, Plus, Search } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
} from "@/components/ui/index";
import { ProductGroupCard } from "@/components/price-monitor/product-group-card";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  createProductGroup,
  ensureArray,
  fetchCategories,
  fetchDashboard,
  fetchProductGroups,
  type ProductGroup,
  type ProductOverview,
  type SpendCategory,
} from "@/lib/price-monitor-api";

interface GroupModalState {
  mode: "create" | "assign";
  group: ProductGroup | null;
}

export default function ProductGroupsPage() {
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [products, setProducts] = useState<ProductOverview[]>([]);
  const [categories, setCategories] = useState<SpendCategory[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState<GroupModalState | null>(null);
  const [groupName, setGroupName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [assignProductId, setAssignProductId] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/auth/login";
      return;
    }

    try {
      const [groupDataRaw, productDataRaw, categoryData] = await Promise.all([
        fetchProductGroups(session),
        fetchDashboard<unknown>("products", {}, session),
        fetchCategories(session),
      ]);

      const groupData = ensureArray<ProductGroup>(groupDataRaw);
      const productData = ensureArray<ProductOverview>(productDataRaw);

      setGroups(groupData);
      setProducts(productData);
      setCategories(categoryData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte hämta produktgrupper.");
    } finally {
      setLoading(false);
    }
  }

  const assignedIds = useMemo(() => {
    const safe = Array.isArray(groups) ? groups : [];
    return new Set(
      safe.flatMap((group) =>
        Array.isArray(group?.products)
          ? group.products.map((product) => product.id)
          : []
      )
    );
  }, [groups]);

  const unassignedProducts = useMemo(() => {
    const safe = Array.isArray(products) ? products : [];
    return safe.filter(
      (product) => !assignedIds.has(product.product_id) && (product.latest_price ?? 0) > 0
    );
  }, [assignedIds, products]);

  const filteredUnassigned = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return unassignedProducts;
    return unassignedProducts.filter(
      (product) =>
        product.product_name.toLowerCase().includes(query) ||
        product.supplier_name.toLowerCase().includes(query)
    );
  }, [search, unassignedProducts]);

  function openCreateModal() {
    setGroupName("");
    setCategoryId("");
    setAssignProductId("");
    setModal({ mode: "create", group: null });
  }

  function openAssignModal(group: ProductGroup) {
    setGroupName(group.name);
    setCategoryId(group.category_id ?? "");
    setAssignProductId("");
    setModal({ mode: "assign", group });
  }

  function toggleProduct(productId: string) {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  }

  async function handleSaveGroup() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !modal) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    const name = modal.mode === "assign" && modal.group ? modal.group.name : groupName.trim();
    if (!name) {
      setError("Namn på produktgruppen krävs.");
      return;
    }

    const productIdsToAssign =
      selectedProductIds.length > 0
        ? selectedProductIds
        : modal.mode === "assign" && assignProductId
          ? [assignProductId]
          : [];

    if (productIdsToAssign.length === 0) {
      setError("Välj minst en produkt att lägga till.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await createProductGroup(name, categoryId || null, productIdsToAssign, session);
      setModal(null);
      setSelectedProductIds([]);
      setAssignProductId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte spara produktgruppen.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveProduct(productId: string) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const { error: updateError } = await supabase
      .from("products")
      .update({ group_id: null })
      .eq("id", productId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await load();
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <PageHeader
        title="Produktgrupper"
        description="Koppla ihop samma typ av produkt mellan leverantörer så att priser kan jämföras rättvist."
        actions={
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openCreateModal}>
            Skapa produktgrupp
          </Button>
        }
      />

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "var(--color-error-bg)", color: "var(--color-error-text)" }}
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Skeleton className="h-[520px] rounded-xl" />
          <Skeleton className="h-[520px] rounded-xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="space-y-4">
            {groups.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<Layers3 className="w-6 h-6" />}
                  title="Inga produktgrupper ännu"
                  description="Skapa produktgrupper för att jämföra priser mellan leverantörer"
                />
              </Card>
            ) : (
              groups.map((group) => (
                <ProductGroupCard
                  key={group.id}
                  group={group}
                  onAssign={openAssignModal}
                  onRemoveProduct={handleRemoveProduct}
                />
              ))
            )}
          </div>

          <Card>
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Ej grupperade produkter
                </h2>
                <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                  Välj produkter och lägg dem i en grupp
                </p>
              </div>

              <div
                className="flex items-center gap-2 rounded-lg border px-3 py-2"
                style={{
                  background: "var(--color-bg)",
                  borderColor: "var(--color-border)",
                }}
              >
                <Search className="w-4 h-4" style={{ color: "var(--color-text-muted)" }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Sök produkt eller leverantör"
                  className="flex-1 bg-transparent outline-none text-sm"
                  style={{ color: "var(--color-text-primary)" }}
                />
              </div>

              <div className="max-h-[580px] overflow-y-auto space-y-2 pr-1">
                {filteredUnassigned.length === 0 ? (
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                    Alla produkter är redan grupperade.
                  </p>
                ) : (
                  filteredUnassigned.map((product) => (
                    <label
                      key={product.product_id}
                      className="flex items-start gap-3 rounded-lg border px-3 py-3 cursor-pointer"
                      style={{
                        background: selectedProductIds.includes(product.product_id)
                          ? "var(--color-accent-muted)"
                          : "var(--color-bg)",
                        borderColor: selectedProductIds.includes(product.product_id)
                          ? "var(--color-accent)"
                          : "var(--color-border)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(product.product_id)}
                        onChange={() => toggleProduct(product.product_id)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium" style={{ color: "var(--color-text-primary)" }}>
                          {product.product_name}
                        </p>
                        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                          {product.supplier_name}
                          {product.unit ? ` · ${product.unit}` : ""}
                        </p>
                      </div>
                    </label>
                  ))
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  disabled={selectedProductIds.length === 0}
                  onClick={openCreateModal}
                >
                  Skapa grupp av valda
                </Button>
              </div>

              {groups.length > 0 && selectedProductIds.length > 0 && (
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                  Klicka på "Lägg till produkter" på en befintlig grupp för att lägga in de valda produkterna där.
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-xl" variant="elevated">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {modal.mode === "create" ? "Skapa produktgrupp" : "Lägg till produkter"}
                </h3>
                <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                  {selectedProductIds.length} valda produkter
                </p>
              </div>

              {modal.mode === "create" ? (
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Exempel: Kopieringspapper A4"
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{
                    background: "var(--color-bg)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                />
              ) : (
                <div
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  {modal.group?.name}
                </div>
              )}

              {modal.mode === "create" ? (
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{
                    background: "var(--color-bg)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <option value="">Ingen kategori</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={assignProductId}
                  onChange={(e) => setAssignProductId(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  style={{
                    background: "var(--color-bg)",
                    borderColor: "var(--color-border)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <option value="">Välj produkt att lägga till</option>
                  {filteredUnassigned.map((product) => (
                    <option key={product.product_id} value={product.product_id}>
                      {product.product_name} - {product.supplier_name}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setModal(null)}>
                  Avbryt
                </Button>
                <Button variant="primary" loading={saving} onClick={handleSaveGroup}>
                  Spara
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
