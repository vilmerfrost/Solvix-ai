import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { getApiUser } from "@/lib/api-auth";

// POST /api/settings/threshold - Update auto-approve threshold
export async function POST(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;
  
  const supabase = createServiceRoleClient();

  try {
    const body = await request.json();
    const { threshold } = body;

    // Validate threshold
    if (typeof threshold !== "number" || threshold < 60 || threshold > 99) {
      return NextResponse.json(
        { success: false, error: "Threshold must be between 60% and 99%" },
        { status: 400 }
      );
    }

    // Update threshold
    const { data, error } = await supabase
      .from("settings")
      .update({ auto_approve_threshold: threshold })
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) throw error;

    // Determine warning message based on threshold
    let warningMessage = "";
    if (threshold <= 70) {
      warningMessage = `Allt med under ${threshold}% säkerhet kommer markeras med gul varning. VARNING: Lågt tröskelvärde kan leda till fler felaktiga auto-godkännanden.`;
    } else if (threshold >= 95) {
      warningMessage = `Allt med under ${threshold}% säkerhet kommer markeras med gul varning. Strikt läge: De flesta dokument kommer kräva mänsklig granskning.`;
    } else {
      warningMessage = `Allt med under ${threshold}% säkerhet kommer markeras med gul varning.`;
    }

    return NextResponse.json({
      success: true,
      threshold: data.auto_approve_threshold,
      message: "Säkerhetströskel uppdaterad!",
      warning: warningMessage
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

