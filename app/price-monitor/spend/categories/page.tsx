"use client";

import { useEffect, useMemo, useState } from "react";
import { Palette, Plus, Tags } from "lucide-react";
import {
  Button,
  Card,
  EmptyState,
  PageHeader,
  Skeleton,
} from "@/components/ui/index";
import { CategoryTag } from "@/components/price-monitor/category-tag";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  createCategory,
  fetchCategories,
  fetchProductGroups,
  type ProductGroup,
  type SpendCategory,
} from "@/lib/price-monitor-api";

const DEFAULT_CATEGORIES = [
  "Kontorsmaterial",
  "Hygien",
  "IT & Teknik",
  "Fastighet",
  "Livsmedel",
  "Förbrukningsmaterial",
  "Tjänster",
  "Övrigt",
];

const COLOR_OPTIONS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

export default function SpendCategoriesPage() {
  const [categories, setCategories] = useState<SpendCategory[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      const [categoryData, groupData] = await Promise.all([
        fetchCategories(session),
        fetchProductGroups(session),
      ]);
      setCategories(categoryData);
      setGroups(groupData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte hämta kategorier.");
    } finally {
      setLoading(false);
    }
  }

  const groupCountByCategory = useMemo(() => {
    return groups.reduce<Record<string, number>>((acc, group) => {
      if (!group.category_id) return acc;
      acc[group.category_id] = (acc[group.category_id] ?? 0) + 1;
      return acc;
    }, {});
  }, [groups]);

  async function handleSaveCategory(categoryName = name, categoryColor = color) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    if (!categoryName.trim()) {
      setError("Kategorinamn krävs.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      await createCategory(categoryName.trim(), categoryColor, session);
      setName("");
      setColor(COLOR_OPTIONS[0]);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kunde inte spara kategori.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateDefaults() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    setSaving(true);
    setError("");

    try {
      await Promise.all(
        DEFAULT_CATEGORIES.map((categoryName, index) =>
          createCategory(categoryName, COLOR_OPTIONS[index % COLOR_OPTIONS.length], session)
        )
      );
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Kunde inte skapa standardkategorier."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <PageHeader
        title="Kategorier"
        description="Ordna produktgrupper i kategorier för att se hur inköpsbudgeten fördelas."
        actions={
          <Button
            variant="secondary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleCreateDefaults}
            loading={saving}
          >
            Skapa standardkategorier
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

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                Skapa kategori
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                Ge kategorin ett namn och en tydlig färg
              </p>
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Exempel: Kontorsmaterial"
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{
                background: "var(--color-bg)",
                borderColor: "var(--color-border)",
                color: "var(--color-text-primary)",
              }}
            />

            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setColor(option)}
                  className="h-9 w-9 rounded-full border-2"
                  style={{
                    background: option,
                    borderColor: color === option ? "var(--color-text-primary)" : "transparent",
                  }}
                  aria-label={`Välj färg ${option}`}
                />
              ))}
            </div>
          </div>

          <Button
            variant="primary"
            loading={saving}
            icon={<Palette className="w-4 h-4" />}
            onClick={() => handleSaveCategory()}
          >
            Skapa kategori
          </Button>
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : categories.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Tags className="w-6 h-6" />}
            title="Inga kategorier ännu"
            description="Skapa standardkategorier eller lägg upp egna kategorier för inköpsanalysen."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              className="text-left"
              onClick={() => {
                setName(category.name);
                setColor(category.color || COLOR_OPTIONS[0]);
              }}
            >
              <CategoryTag
                category={category}
                groupCount={groupCountByCategory[category.id] ?? 0}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
