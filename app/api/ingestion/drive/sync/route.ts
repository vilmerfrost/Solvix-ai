import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { syncConnectorToDocuments } from "@/lib/office/connectors";

export async function POST() {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  try {
    const result = await syncConnectorToDocuments({
      userId: user.id,
      provider: "google_drive",
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
