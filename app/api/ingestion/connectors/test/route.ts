import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";
import { decryptAPIKey } from "@/lib/encryption";
import { ConnectorProvider } from "@/lib/office/connectors";

async function testSharePoint(credentials: Record<string, unknown>): Promise<void> {
  const accessToken = credentials.accessToken as string | undefined;
  const tenantId = credentials.tenantId as string | undefined;
  const clientId = credentials.clientId as string | undefined;
  const clientSecret = credentials.clientSecret as string | undefined;
  const siteId = credentials.siteId as string | undefined;
  const driveId = credentials.driveId as string | undefined;
  if (!siteId || !driveId) throw new Error("siteId and driveId are required");

  let token = accessToken;
  if (!token) {
    if (!tenantId || !clientId || !clientSecret) {
      throw new Error("Provide accessToken or tenantId/clientId/clientSecret");
    }
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    });
    const tokenResp = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body }
    );
    if (!tokenResp.ok) throw new Error(`SharePoint token request failed (${tokenResp.status})`);
    const tokenData = (await tokenResp.json()) as { access_token?: string };
    token = tokenData.access_token;
  }
  if (!token) throw new Error("No SharePoint access token available");

  const resp = await fetch(
    `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root/children?$top=1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!resp.ok) throw new Error(`SharePoint connection failed (${resp.status})`);
}

async function testGoogleDrive(credentials: Record<string, unknown>): Promise<void> {
  let accessToken = credentials.accessToken as string | undefined;
  if (!accessToken) {
    const refreshToken = credentials.refreshToken as string | undefined;
    const clientId = credentials.clientId as string | undefined;
    const clientSecret = credentials.clientSecret as string | undefined;
    if (!refreshToken || !clientId || !clientSecret) {
      throw new Error("Provide accessToken or refreshToken/clientId/clientSecret");
    }
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!tokenResp.ok) throw new Error(`Google token request failed (${tokenResp.status})`);
    const tokenData = (await tokenResp.json()) as { access_token?: string };
    accessToken = tokenData.access_token;
  }
  if (!accessToken) throw new Error("No Google access token available");

  const folderId = (credentials.folderId as string | undefined) || "root";
  const params = new URLSearchParams({
    q: `'${folderId}' in parents and trashed=false`,
    pageSize: "1",
    fields: "files(id,name)",
  });
  const resp = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!resp.ok) throw new Error(`Google Drive connection failed (${resp.status})`);
}

export async function POST(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const body = await request.json();
  const connectorId = body?.connectorId as string | undefined;
  if (!connectorId) {
    return NextResponse.json({ success: false, error: "connectorId is required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: connector, error } = await supabase
    .from("connector_accounts")
    .select("*")
    .eq("id", connectorId)
    .eq("user_id", user.id)
    .single();

  if (error || !connector) {
    return NextResponse.json({ success: false, error: "Connector not found" }, { status: 404 });
  }

  try {
    const provider = connector.provider as ConnectorProvider;
    const credentials = JSON.parse(decryptAPIKey(connector.encrypted_credentials)) as Record<string, unknown>;

    if (provider === "sharepoint") await testSharePoint(credentials);
    else await testGoogleDrive(credentials);

    await supabase
      .from("connector_accounts")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("id", connectorId)
      .eq("user_id", user.id);

    return NextResponse.json({ success: true });
  } catch (testError) {
    return NextResponse.json(
      { success: false, error: testError instanceof Error ? testError.message : String(testError) },
      { status: 400 }
    );
  }
}
