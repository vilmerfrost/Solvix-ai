"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Button, Card, Skeleton } from "@/components/ui/index";
import {
  AgreementItemRow,
  createAgreementItemDraft,
  type AgreementItemDraft,
} from "@/components/price-monitor/agreement-item-row";
import { DeviationRow } from "@/components/price-monitor/deviation-row";
import { getAgreementStatusMeta } from "@/components/price-monitor/agreement-card";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  addAgreementItem,
  fetchAgreements,
  fetchCategories,
  fetchDeviations,
  fetchProductGroups,
  formatDate,
  formatSEK,
  removeAgreementItem,
  type Agreement,
  type AgreementDeviation,
  type ProductGroup,
  type SpendCategory,
} from "@/lib/price-monitor-api";

export default function AgreementDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [deviations, setDeviations] = useState<AgreementDeviation[]>([]);
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([]);
  const [categories, setCategories] = useState<SpendCategory[]>([]);
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draftItems, setDraftItems] = useState<AgreementItemDraft[]>([
    createAgreementItemDraft(),
  ]);
  const [savingItems, setSavingItems] = useState(false);

  const load = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const {
      data: { session: authSession },
    } = await supabase.auth.getSession();

    if (!authSession) {
      router.push("/auth/login");
      return;
    }

    setSession(authSession);
    setError("");

    try {
      const [agreementsData, deviationData, groupData, categoryData] =
        await Promise.all([
          fetchAgreements({}, authSession),
          fetchDeviations({ agreement_id: id }, authSession),
          fetchProductGroups(authSession),
          fetchCategories(authSession),
        ]);

      const matchedAgreement =
        agreementsData.find((item) => item.id === id) ?? null;

      setAgreement(matchedAgreement);
      setDeviations(deviationData);
      setProductGroups(groupData);
      setCategories(categoryData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Kunde inte hämta avtalet."
      );
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleRemoveItem(itemId: string) {
    if (!session) return;
    const confirmed = window.confirm("Ta bort den här avtalsraden?");
    if (!confirmed) return;

    try {
      await removeAgreementItem(itemId, session);
      await load();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Kunde inte ta bort raden."
      );
    }
  }

  async function handleAddItems() {
    if (!session || !agreement) return;

    const preparedItems = prepareDraftItems(draftItems);
    if ("error" in preparedItems) {
      setError(preparedItems.error);
      return;
    }

    if (preparedItems.items.length === 0) {
      setError("Fyll i minst en avtalsrad innan du sparar.");
      return;
    }

    setSavingItems(true);
    setError("");

    try {
      for (const item of preparedItems.items) {
        await addAgreementItem(
          {
            agreement_id: agreement.id,
            ...item,
          },
          session
        );
      }
      setDraftItems([createAgreementItemDraft()]);
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Kunde inte lägga till avtalsrader."
      );
    } finally {
      setSavingItems(false);
    }
  }

  function handleDeviationUpdated(
    deviationId: string,
    status: AgreementDeviation["status"],
    notes: string | null
  ) {
    setDeviations((prev) =>
      prev.map((deviation) =>
        deviation.id === deviationId ? { ...deviation, status, notes } : deviation
      )
    );
  }

  const status = agreement ? getAgreementStatusMeta(agreement) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <button
        type="button"
        onClick={() => router.push("/price-monitor/agreements")}
        className="inline-flex items-center gap-2 text-sm"
        style={{ color: "var(--color-text-muted)" }}
      >
        <ArrowLeft className="h-4 w-4" />
        Tillbaka till avtal
      </button>

      {loading ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : !agreement ? (
        <Card>
          <p style={{ color: "var(--color-text-muted)" }}>Avtalet hittades inte.</p>
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
                {agreement.name}
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                {agreement.suppliers.name}
              </p>
              <p className="text-sm mt-2" style={{ color: "var(--color-text-secondary)" }}>
                Gäller: {formatDate(agreement.start_date)} {"->"}{" "}
                {agreement.end_date ? formatDate(agreement.end_date) : "Tills vidare"}
              </p>
            </div>

            {status ? (
              <span
                className="inline-flex rounded-full px-3 py-1 text-sm font-medium"
                style={{ background: status.background, color: status.color }}
              >
                {status.label}
              </span>
            ) : null}
          </div>
        </Card>
      )}

      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "var(--color-error-bg)", color: "var(--color-error-text)" }}
        >
          {error}
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
          Avtalsvillkor
        </h2>
        <Card>
          {loading ? (
            <Skeleton className="h-36 rounded-xl" />
          ) : agreement ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p style={{ color: "var(--color-text-muted)" }}>Generell rabatt</p>
                <p className="mt-1 font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {agreement.discount_percent != null
                    ? `${agreement.discount_percent.toString().replace(".", ",")}%`
                    : "Ingen generell rabatt"}
                </p>
              </div>
              <div>
                <p style={{ color: "var(--color-text-muted)" }}>Avtalsnummer</p>
                <p className="mt-1 font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {agreement.agreement_number ?? "Saknas"}
                </p>
              </div>
              <div className="md:col-span-2">
                <p style={{ color: "var(--color-text-muted)" }}>Villkorsbeskrivning</p>
                <p className="mt-1" style={{ color: "var(--color-text-primary)" }}>
                  {agreement.terms_description || "Ingen villkorsbeskrivning angiven."}
                </p>
              </div>
              <div className="md:col-span-2">
                <p style={{ color: "var(--color-text-muted)" }}>Avtalsdokument</p>
                {agreement.document_url ? (
                  <a
                    href={agreement.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-sm font-medium"
                    style={{ color: "var(--color-accent)" }}
                  >
                    Öppna dokument <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <p className="mt-1" style={{ color: "var(--color-text-primary)" }}>
                    Ingen länk angiven.
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </Card>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Avtalsrader
          </h2>
          <Button
            variant="secondary"
            icon={<Plus className="h-4 w-4" />}
            onClick={() =>
              setDraftItems((prev) => [...prev, createAgreementItemDraft()])
            }
          >
            Lägg till rad
          </Button>
        </div>

        <Card padding="none">
          {loading ? (
            <Skeleton className="h-56 rounded-xl" />
          ) : agreement?.agreement_items.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <tr>
                    {[
                      "Typ",
                      "Namn",
                      "Avtalat pris",
                      "Maxpris",
                      "Rabatt %",
                      "Enhet",
                      "",
                    ].map((label) => (
                      <th
                        key={label}
                        className="px-4 py-3 text-left text-xs font-medium whitespace-nowrap"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ background: "var(--color-bg-elevated)" }}>
                  {agreement.agreement_items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td className="px-4 py-3" style={{ color: "var(--color-text-primary)" }}>
                        {item.product_group_id
                          ? "Produktgrupp"
                          : item.category_id
                            ? "Kategori"
                            : "Text"}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--color-text-primary)" }}>
                        {item.product_groups?.name ??
                          item.spend_categories?.name ??
                          item.description ??
                          "–"}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--color-text-primary)" }}>
                        {item.agreed_price != null ? formatSEK(item.agreed_price) : "–"}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--color-text-primary)" }}>
                        {item.max_price != null ? formatSEK(item.max_price) : "–"}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--color-text-primary)" }}>
                        {item.discount_percent != null
                          ? item.discount_percent.toString().replace(".", ",")
                          : "–"}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--color-text-primary)" }}>
                        {item.unit ?? "–"}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
                          style={{
                            background: "#fef2f2",
                            color: "#ef4444",
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Ta bort
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Inga avtalsrader registrerade ännu.
            </div>
          )}
        </Card>

        <Card>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                Lägg till nya avtalsrader
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                Nya rader börjar gälla för framtida fakturakontroller.
              </p>
            </div>

            <div className="space-y-3">
              {draftItems.map((item) => (
                <AgreementItemRow
                  key={item.tempId}
                  item={item}
                  productGroups={productGroups}
                  categories={categories}
                  onChange={(nextItem) =>
                    setDraftItems((prev) =>
                      prev.map((current) =>
                        current.tempId === item.tempId ? nextItem : current
                      )
                    )
                  }
                  onRemove={() =>
                    setDraftItems((prev) =>
                      prev.length === 1
                        ? [createAgreementItemDraft()]
                        : prev.filter((current) => current.tempId !== item.tempId)
                    )
                  }
                />
              ))}
            </div>

            <div className="flex justify-end">
              <Button variant="primary" loading={savingItems} onClick={handleAddItems}>
                Spara avtalsrader
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>
          Avvikelser för detta avtal
        </h2>
        <Card padding="none">
          {loading ? (
            <Skeleton className="h-64 rounded-xl" />
          ) : !session ? null : deviations.length === 0 ? (
            <div className="p-6 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Inga avvikelser hittades för detta avtal.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead
                  style={{
                    background: "var(--color-bg-secondary)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <tr>
                    {[
                      "Typ",
                      "Produkt",
                      "Faktiskt pris",
                      "Avtalat pris",
                      "Möjlig besparing",
                      "Datum",
                      "Status",
                      "Åtgärd",
                    ].map((label) => (
                      <th
                        key={label}
                        className="px-4 py-3 text-left text-xs font-medium whitespace-nowrap"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody style={{ background: "var(--color-bg-elevated)" }}>
                  {deviations.map((deviation) => (
                    <DeviationRow
                      key={deviation.id}
                      deviation={deviation}
                      session={session}
                      colSpan={8}
                      onUpdated={handleDeviationUpdated}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function prepareDraftItems(items: AgreementItemDraft[]) {
  const nextItems: Array<{
    product_group_id?: string;
    category_id?: string;
    description?: string;
    agreed_price?: number;
    discount_percent?: number;
    max_price?: number;
    unit?: string;
  }> = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const hasAnyValue =
      Boolean(item.product_group_id) ||
      Boolean(item.category_id) ||
      Boolean(item.description.trim()) ||
      Boolean(item.agreed_price.trim()) ||
      Boolean(item.discount_percent.trim()) ||
      Boolean(item.max_price.trim()) ||
      Boolean(item.unit.trim());

    if (!hasAnyValue) continue;

    if (item.match_type === "product_group" && !item.product_group_id) {
      return { error: `Avtalsrad ${index + 1} saknar produktgrupp.` };
    }

    if (item.match_type === "category" && !item.category_id) {
      return { error: `Avtalsrad ${index + 1} saknar kategori.` };
    }

    if (item.match_type === "description" && !item.description.trim()) {
      return { error: `Avtalsrad ${index + 1} saknar beskrivning.` };
    }

    nextItems.push({
      product_group_id:
        item.match_type === "product_group" ? item.product_group_id : undefined,
      category_id:
        item.match_type === "category" ? item.category_id : undefined,
      description:
        item.match_type === "description" ? item.description.trim() : undefined,
      agreed_price: parseOptionalNumber(item.agreed_price),
      discount_percent: parseOptionalNumber(item.discount_percent),
      max_price: parseOptionalNumber(item.max_price),
      unit: item.unit.trim() || undefined,
    });
  }

  return { items: nextItems };
}
