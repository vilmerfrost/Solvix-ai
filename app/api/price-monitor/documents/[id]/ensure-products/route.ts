import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";
import { getServiceProductName } from "@/lib/price-monitor-service-names";

function normalizeLabel(value: string | null | undefined): string {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function canonicalProductKey(value: string | null | undefined): string {
  const normalized = normalizeLabel(value).toLowerCase();
  if (!normalized) return "";

  return normalized
    .replace(/\s+-\s+[a-z0-9]{8,}$/i, "")
    .replace(/\s+[a-z0-9]{8,}$/i, "")
    .replace(/\s*\([^)]*\)$/i, "")
    .replace(/[_-]{2,}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const { id: documentId } = await context.params;
  const supabase = createServiceRoleClient();

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (documentError) {
    return NextResponse.json(
      { success: false, error: documentError.message },
      { status: 500 }
    );
  }

  if (!document) {
    return NextResponse.json(
      { success: false, error: "Document not found." },
      { status: 404 }
    );
  }

  const { data: rows, error: rowsError } = await supabase
    .from("invoice_line_items")
    .select("id, supplier_id, product_id, raw_description, unit")
    .eq("user_id", user.id)
    .eq("document_id", documentId);

  if (rowsError) {
    return NextResponse.json(
      { success: false, error: rowsError.message },
      { status: 500 }
    );
  }

  const lineItems = Array.isArray(rows) ? rows : [];
  if (lineItems.length === 0) {
    return NextResponse.json({ success: true, updated: 0 });
  }

  const supplierIds = Array.from(
    new Set(lineItems.map((row) => row.supplier_id).filter(Boolean))
  ) as string[];

  if (supplierIds.length === 0) {
    return NextResponse.json({ success: true, updated: 0 });
  }

  const [{ data: existingProducts, error: productsError }, { data: suppliersData, error: suppliersError }] =
    await Promise.all([
      supabase.from("products").select("id, supplier_id, name").eq("user_id", user.id).in("supplier_id", supplierIds),
      supabase.from("suppliers").select("id, name").eq("user_id", user.id).in("id", supplierIds),
    ]);

  if (productsError) {
    return NextResponse.json(
      { success: false, error: productsError.message },
      { status: 500 }
    );
  }
  if (suppliersError) {
    return NextResponse.json(
      { success: false, error: suppliersError.message },
      { status: 500 }
    );
  }

  const supplierNames = new Map<string, string>();
  for (const s of suppliersData ?? []) {
    if (s?.id && s?.name) supplierNames.set(s.id, s.name);
  }

  const productsBySupplier = new Map<
    string,
    Array<{ id: string; supplier_id: string; name: string | null }>
  >();
  for (const product of existingProducts ?? []) {
    const key = product.supplier_id;
    productsBySupplier.set(key, [...(productsBySupplier.get(key) ?? []), product]);
  }

  let updated = 0;
  const cacheBySupplierAndKey = new Map<string, string>();

  for (const row of lineItems) {
    if (row.product_id || !row.supplier_id) continue;

    const supplierId = row.supplier_id;
    const supplierName = supplierNames.get(supplierId) ?? "";
    const serviceProductName = getServiceProductName(supplierName);

    const canonical = serviceProductName
      ? canonicalProductKey(serviceProductName)
      : canonicalProductKey(row.raw_description);
    if (!canonical) continue;

    const cacheKey = serviceProductName
      ? `${supplierId}:${canonical}`
      : `${supplierId}:${canonical}`;
    let productId = cacheBySupplierAndKey.get(cacheKey) ?? null;

    if (!productId) {
      const products = productsBySupplier.get(supplierId) ?? [];
      const exact = products.find(
        (product) => canonicalProductKey(product.name) === canonical
      );
      productId = exact?.id ?? null;

      if (!productId && !serviceProductName) {
        const prefix = products.find((product) => {
          const key = canonicalProductKey(product.name);
          return (
            key.startsWith(`${canonical} `) ||
            canonical.startsWith(`${key} `) ||
            key.includes(`${canonical} -`) ||
            canonical.includes(`${key} -`)
          );
        });
        productId = prefix?.id ?? null;
      }

      if (!productId) {
        const productName = serviceProductName ?? normalizeLabel(row.raw_description) ?? canonical;
        const normalizedName = productName.toLowerCase().trim();
        const { data: created, error: createError } = await supabase
          .from("products")
          .insert({
            user_id: user.id,
            supplier_id: supplierId,
            name: productName,
            normalized_name: normalizedName,
            unit: row.unit ?? null,
          })
          .select("id, supplier_id, name")
          .single();

        if (createError || !created) {
          continue;
        }

        productId = created.id;
        productsBySupplier.set(supplierId, [
          ...(productsBySupplier.get(supplierId) ?? []),
          created,
        ]);
      }

      cacheBySupplierAndKey.set(cacheKey, productId);
    }

    const { error: updateError } = await supabase
      .from("invoice_line_items")
      .update({ product_id: productId })
      .eq("id", row.id)
      .eq("user_id", user.id);

    if (!updateError) {
      updated += 1;
    }
  }

  return NextResponse.json({ success: true, updated });
}
