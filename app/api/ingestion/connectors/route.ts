import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";
import { encryptAPIKey } from "@/lib/encryption";

export async function GET() {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("connector_accounts")
    .select("id, provider, name, is_active, last_sync_at, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, connectors: data || [] });
}

export async function POST(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const body = await request.json();
  const provider = body?.provider;
  const name = body?.name;
  const credentials = body?.credentials;
  const isActive = body?.isActive !== false;

  if (!provider || !["sharepoint", "google_drive"].includes(provider)) {
    return NextResponse.json({ success: false, error: "Invalid provider" }, { status: 400 });
  }
  if (!name || typeof name !== "string") {
    return NextResponse.json({ success: false, error: "name is required" }, { status: 400 });
  }
  if (!credentials || typeof credentials !== "object") {
    return NextResponse.json({ success: false, error: "credentials JSON is required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  if (isActive) {
    await supabase
      .from("connector_accounts")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("provider", provider);
  }

  const { data, error } = await supabase
    .from("connector_accounts")
    .insert({
      user_id: user.id,
      provider,
      name,
      encrypted_credentials: encryptAPIKey(JSON.stringify(credentials)),
      is_active: isActive,
    })
    .select("id, provider, name, is_active, last_sync_at, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, connector: data });
}

export async function PATCH(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const body = await request.json();
  const connectorId = body?.connectorId;
  if (!connectorId || typeof connectorId !== "string") {
    return NextResponse.json({ success: false, error: "connectorId is required" }, { status: 400 });
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.name === "string") updatePayload.name = body.name;
  if (typeof body.isActive === "boolean") updatePayload.is_active = body.isActive;
  if (body.credentials && typeof body.credentials === "object") {
    updatePayload.encrypted_credentials = encryptAPIKey(JSON.stringify(body.credentials));
  }

  const supabase = createServiceRoleClient();
  if (body.isActive === true) {
    const { data: target } = await supabase
      .from("connector_accounts")
      .select("provider")
      .eq("id", connectorId)
      .eq("user_id", user.id)
      .single();
    if (target?.provider) {
      await supabase
        .from("connector_accounts")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("provider", target.provider);
    }
  }

  const { data, error } = await supabase
    .from("connector_accounts")
    .update(updatePayload)
    .eq("id", connectorId)
    .eq("user_id", user.id)
    .select("id, provider, name, is_active, last_sync_at, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, connector: data });
}

export async function DELETE(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const { searchParams } = new URL(request.url);
  const connectorId = searchParams.get("id");
  if (!connectorId) {
    return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("connector_accounts")
    .delete()
    .eq("id", connectorId)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
