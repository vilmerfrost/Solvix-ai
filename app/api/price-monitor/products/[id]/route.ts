import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const { id } = await context.params;
  const supabase = createServiceRoleClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (productError) {
    return NextResponse.json({ success: false, error: productError.message }, { status: 500 });
  }

  if (!product) {
    return NextResponse.json({ success: false, error: "Product not found." }, { status: 404 });
  }

  const cleanupTasks = [
    supabase
      .from("price_alerts")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", id),
    supabase
      .from("agreement_deviations")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", id),
    supabase
      .from("invoice_line_items")
      .update({ product_id: null })
      .eq("user_id", user.id)
      .eq("product_id", id),
  ];

  const cleanupResults = await Promise.all(cleanupTasks);
  const cleanupError = cleanupResults.find((result) => result.error)?.error;

  if (cleanupError) {
    return NextResponse.json({ success: false, error: cleanupError.message }, { status: 500 });
  }

  const { error: deleteError } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (deleteError) {
    return NextResponse.json({ success: false, error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    product: { id: product.id, name: product.name },
  });
}
