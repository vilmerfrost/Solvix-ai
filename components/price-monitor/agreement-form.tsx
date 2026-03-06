"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Plus } from "lucide-react";
import {
  Button,
  Card,
  Input,
  Select,
  useToast,
} from "@/components/ui/index";
import {
  addAgreementItem,
  createAgreement,
  removeAgreementItem,
  updateAgreement,
  type Agreement,
  type AgreementItem,
  type ProductGroup,
  type SpendCategory,
  type Supplier,
} from "@/lib/price-monitor-api";
import {
  AgreementItemRow,
  createAgreementItemDraft,
  type AgreementItemDraft,
} from "@/components/price-monitor/agreement-item-row";

interface AgreementFormProps {
  open: boolean;
  mode: "create" | "edit";
  session: { access_token: string };
  suppliers: Supplier[];
  productGroups: ProductGroup[];
  categories: SpendCategory[];
  agreement?: Agreement | null;
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export function AgreementForm({
  open,
  mode,
  session,
  suppliers,
  productGroups,
  categories,
  agreement,
  onClose,
  onSaved,
}: AgreementFormProps) {
  const { addToast } = useToast();
  const [supplierId, setSupplierId] = useState("");
  const [name, setName] = useState("");
  const [agreementNumber, setAgreementNumber] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [termsDescription, setTermsDescription] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<AgreementItemDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setError("");
    setSupplierId(agreement?.supplier_id ?? "");
    setName(agreement?.name ?? "");
    setAgreementNumber(agreement?.agreement_number ?? "");
    setStartDate(agreement?.start_date ?? "");
    setEndDate(agreement?.end_date ?? "");
    setDiscountPercent(
      agreement?.discount_percent != null ? String(agreement.discount_percent) : ""
    );
    setTermsDescription(agreement?.terms_description ?? "");
    setDocumentUrl(agreement?.document_url ?? "");
    setNotes(agreement?.notes ?? "");
    setItems(
      agreement?.agreement_items?.length
        ? agreement.agreement_items.map(mapAgreementItemToDraft)
        : [createAgreementItemDraft()]
    );
  }, [agreement, open]);

  const title = useMemo(
    () => (mode === "create" ? "Skapa avtal" : "Redigera avtal"),
    [mode]
  );

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!supplierId || !name.trim() || !startDate) {
      setError("Leverantör, avtalsnamn och startdatum krävs.");
      return;
    }

    const preparedItems = prepareAgreementItems(items);
    if ("error" in preparedItems) {
      setError(preparedItems.error);
      return;
    }

    const basePayload = {
      supplier_id: supplierId,
      name: name.trim(),
      agreement_number: agreementNumber.trim() || undefined,
      start_date: startDate,
      end_date: endDate || undefined,
      discount_percent: parseOptionalNumber(discountPercent),
      terms_description: termsDescription.trim() || undefined,
      document_url: documentUrl.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    setSaving(true);

    try {
      if (mode === "create") {
        await createAgreement(
          {
            ...basePayload,
            items: preparedItems.items,
          },
          session
        );
      } else if (agreement) {
        await updateAgreement(
          {
            id: agreement.id,
            ...basePayload,
          },
          session
        );
        await syncAgreementItems(agreement.agreement_items, preparedItems.items, agreement.id, session);
      }

      addToast({
        type: "success",
        title: mode === "create" ? "Avtalet skapades" : "Avtalet uppdaterades",
      });
      onClose();
      await onSaved();
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Kunde inte spara avtalet.";
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  function updateItem(tempId: string, nextItem: AgreementItemDraft) {
    setItems((prev) =>
      prev.map((item) => (item.tempId === tempId ? nextItem : item))
    );
  }

  function removeItem(tempId: string) {
    setItems((prev) => {
      if (prev.length === 1) return [createAgreementItemDraft()];
      return prev.filter((item) => item.tempId !== tempId);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-y-auto" variant="elevated">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {title}
              </h2>
              <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                När ett avtal är sparat kontrolleras framtida fakturor automatiskt mot villkoren.
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={onClose}>
              Stäng
            </Button>
          </div>

          {error && (
            <div
              className="rounded-xl px-4 py-3 text-sm"
              style={{ background: "var(--color-error-bg)", color: "var(--color-error-text)" }}
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Leverantör"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              options={[
                { value: "", label: "Välj leverantör" },
                ...suppliers.map((supplier) => ({
                  value: supplier.supplier_id,
                  label: supplier.supplier_name,
                })),
              ]}
            />
            <Input
              label="Avtalsnamn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ramavtal kontorsmaterial 2025"
            />
            <Input
              label="Avtalsnummer"
              value={agreementNumber}
              onChange={(e) => setAgreementNumber(e.target.value)}
              placeholder="KM-2025-001"
            />
            <Input
              label="Generell rabatt (%)"
              type="number"
              min="0"
              step="0.01"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              placeholder="10"
            />
            <Input
              label="Startdatum"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Slutdatum"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <div className="md:col-span-2">
              <Input
                label="Länk till avtalsdokument"
                type="url"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="https://..."
                icon={<FileText className="h-4 w-4" />}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span
                className="mb-1.5 block text-sm font-medium"
                style={{ color: "var(--color-text-primary)" }}
              >
                Villkorsbeskrivning
              </span>
              <textarea
                rows={4}
                value={termsDescription}
                onChange={(e) => setTermsDescription(e.target.value)}
                className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: "var(--color-bg)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </label>

            <label className="block">
              <span
                className="mb-1.5 block text-sm font-medium"
                style={{ color: "var(--color-text-primary)" }}
              >
                Anteckningar
              </span>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all"
                style={{
                  background: "var(--color-bg)",
                  borderColor: "var(--color-border)",
                  color: "var(--color-text-primary)",
                }}
              />
            </label>
          </div>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  Avtalsrader
                </h3>
                <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
                  Varje rad behöver en produktgrupp, kategori eller fri beskrivning.
                </p>
              </div>
              <Button
                type="button"
                variant="secondary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setItems((prev) => [...prev, createAgreementItemDraft()])}
              >
                Lägg till rad
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <AgreementItemRow
                  key={item.tempId}
                  item={item}
                  productGroups={productGroups}
                  categories={categories}
                  onChange={(nextItem) => updateItem(item.tempId, nextItem)}
                  onRemove={() => removeItem(item.tempId)}
                />
              ))}
            </div>
          </section>

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              Avbryt
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              {mode === "create" ? "Skapa avtal" : "Spara ändringar"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

function mapAgreementItemToDraft(item: AgreementItem): AgreementItemDraft {
  const matchType = item.product_group_id
    ? "product_group"
    : item.category_id
      ? "category"
      : "description";

  return {
    tempId: item.id,
    id: item.id,
    match_type: matchType,
    product_group_id: item.product_group_id ?? "",
    category_id: item.category_id ?? "",
    description: item.description ?? "",
    agreed_price: item.agreed_price != null ? String(item.agreed_price) : "",
    discount_percent:
      item.discount_percent != null ? String(item.discount_percent) : "",
    max_price: item.max_price != null ? String(item.max_price) : "",
    unit: item.unit ?? "",
  };
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function prepareAgreementItems(items: AgreementItemDraft[]) {
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

async function syncAgreementItems(
  currentItems: AgreementItem[],
  nextItems: Array<{
    product_group_id?: string;
    category_id?: string;
    description?: string;
    agreed_price?: number;
    discount_percent?: number;
    max_price?: number;
    unit?: string;
  }>,
  agreementId: string,
  session: { access_token: string }
) {
  const currentBySignature = new Map<string, string[]>();

  currentItems.forEach((item) => {
    const signature = getAgreementItemSignature({
      product_group_id: item.product_group_id ?? undefined,
      category_id: item.category_id ?? undefined,
      description: item.description ?? undefined,
      agreed_price: item.agreed_price ?? undefined,
      discount_percent: item.discount_percent ?? undefined,
      max_price: item.max_price ?? undefined,
      unit: item.unit ?? undefined,
    });
    const ids = currentBySignature.get(signature) ?? [];
    ids.push(item.id);
    currentBySignature.set(signature, ids);
  });

  const itemsToCreate: typeof nextItems = [];

  nextItems.forEach((item) => {
    const signature = getAgreementItemSignature(item);
    const existingIds = currentBySignature.get(signature);

    if (existingIds?.length) {
      existingIds.shift();
      return;
    }

    itemsToCreate.push(item);
  });

  const idsToRemove = [...currentBySignature.values()].flat();

  for (const item of itemsToCreate) {
    await addAgreementItem(
      {
        agreement_id: agreementId,
        ...item,
      },
      session
    );
  }

  for (const id of idsToRemove) {
    await removeAgreementItem(id, session);
  }
}

function getAgreementItemSignature(item: {
  product_group_id?: string;
  category_id?: string;
  description?: string;
  agreed_price?: number;
  discount_percent?: number;
  max_price?: number;
  unit?: string;
}) {
  return JSON.stringify({
    product_group_id: item.product_group_id ?? null,
    category_id: item.category_id ?? null,
    description: item.description ?? null,
    agreed_price: item.agreed_price ?? null,
    discount_percent: item.discount_percent ?? null,
    max_price: item.max_price ?? null,
    unit: item.unit ?? null,
  });
}
