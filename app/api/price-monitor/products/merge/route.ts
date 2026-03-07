import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";

/**
 * POST /api/price-monitor/products/merge
 * Body: { keepProductId: string; mergeProductIds: string[]; newName?: string }
 *
 * Reassigns all invoice_line_items, price_alerts, and agreement_deviations
 * from the merged products to the kept product, then deletes the merged products.
 * Optionally renames the kept product.
 */
export async function POST(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const body = await request.json().catch(() => ({}));
  const { keepProductId, mergeProductIds, newName } = body as {
    keepProductId?: string;
    mergeProductIds?: string[];
    newName?: string;
  };

  if (!keepProductId || !Array.isArray(mergeProductIds) || mergeProductIds.length === 0) {
    return NextResponse.json(
      { success: false, error: "keepProductId and at least one mergeProductId are required." },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();

  // Verify ownership of all product IDs
  const allIds = [keepProductId, ...mergeProductIds];
  const { data: owned, error: ownerError } = await supabase
    .from("products")
    .select("id")
    .in("id", allIds)
    .eq("user_id", user.id);

  if (ownerError) {
    return NextResponse.json({ success: false, error: ownerError.message }, { status: 500 });
  }

  const ownedIds = new Set((owned ?? []).map((p) => p.id));
  if (!ownedIds.has(keepProductId) || mergeProductIds.some((id) => !ownedIds.has(id))) {
    return NextResponse.json(
      { success: false, error: "One or more products not found." },
      { status: 404 }
    );
  }

  // Reassign all related rows to the kept product
  const reassignTasks = [
    supabase
      .from("invoice_line_items")
      .update({ product_id: keepProductId })
      .eq("user_id", user.id)
      .in("product_id", mergeProductIds),
    supabase
      .from("price_alerts")
      .update({ product_id: keepProductId })
      .eq("user_id", user.id)
      .in("product_id", mergeProductIds),
    supabase
      .from("agreement_deviations")
      .update({ product_id: keepProductId })
      .eq("user_id", user.id)
      .in("product_id", mergeProductIds),
  ];

  const reassignResults = await Promise.all(reassignTasks);
  const reassignError = reassignResults.find((r) => r.error)?.error;

  if (reassignError) {
    return NextResponse.json({ success: false, error: reassignError.message }, { status: 500 });
  }

  // Rename kept product if requested
  if (newName?.trim()) {
    const { error: renameError } = await supabase
      .from("products")
      .update({ name: newName.trim() })
      .eq("id", keepProductId)
      .eq("user_id", user.id);

    if (renameError) {
      return NextResponse.json({ success: false, error: renameError.message }, { status: 500 });
    }
  }

  // Delete the merged products (their line items are now unlinked from them)
  const { error: deleteError } = await supabase
    .from("products")
    .delete()
    .in("id", mergeProductIds)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, keepProductId });
}
