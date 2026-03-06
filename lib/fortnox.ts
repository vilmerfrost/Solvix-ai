import "server-only";

import { encryptAPIKey, decryptAPIKey } from "@/lib/encryption";

const FORTNOX_AUTH_URL = "https://apps.fortnox.se/oauth-v1";
const FORTNOX_API_URL = "https://api.fortnox.se/3";

export interface FortnoxConnectionRow {
  id: string;
  user_id: string;
  encrypted_access_token: string;
  encrypted_refresh_token: string;
  token_expires_at: string;
  fortnox_company_name: string | null;
  fortnox_org_number: string | null;
  scopes: string[] | null;
  is_active: boolean;
  auto_sync: boolean;
  sync_from_date: string | null;
  last_sync_at: string | null;
}

function getClientCredentials() {
  const clientId = process.env.FORTNOX_CLIENT_ID;
  const clientSecret = process.env.FORTNOX_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Fortnox environment variables are missing.");
  }

  return Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
}

export function buildFortnoxAuthUrl(state: string) {
  const redirectUri = process.env.FORTNOX_REDIRECT_URI;
  const clientId = process.env.FORTNOX_CLIENT_ID;

  if (!redirectUri || !clientId) {
    throw new Error("Fortnox environment variables are missing.");
  }

  const url = new URL(`${FORTNOX_AUTH_URL}/auth`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "supplierinvoices companyinformation");
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  return url.toString();
}

export async function exchangeFortnoxCode(code: string) {
  const response = await fetch(`${FORTNOX_AUTH_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${getClientCredentials()}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.FORTNOX_REDIRECT_URI || "",
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.json();
}

export async function refreshFortnoxToken(
  connection: FortnoxConnectionRow,
  supabase: {
    from: (table: string) => {
      update: (data: Record<string, unknown>) => {
        eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  }
) {
  const response = await fetch(`${FORTNOX_AUTH_URL}/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${getClientCredentials()}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: decryptAPIKey(connection.encrypted_refresh_token),
    }),
  });

  if (!response.ok) {
    throw new Error("Token refresh failed.");
  }

  const tokens = await response.json();
  const expiresAt = new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000).toISOString();

  const { error } = await supabase
    .from("fortnox_connections")
    .update({
      encrypted_access_token: encryptAPIKey(tokens.access_token),
      encrypted_refresh_token: encryptAPIKey(tokens.refresh_token),
      token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  if (error) {
    throw new Error(error.message);
  }

  return tokens.access_token as string;
}

export async function getValidFortnoxAccessToken(
  connection: FortnoxConnectionRow,
  supabase: {
    from: (table: string) => {
      update: (data: Record<string, unknown>) => {
        eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  }
) {
  const expiresAt = new Date(connection.token_expires_at).getTime();
  const now = Date.now();

  if (Number.isFinite(expiresAt) && expiresAt - now > 60_000) {
    return decryptAPIKey(connection.encrypted_access_token);
  }

  return refreshFortnoxToken(connection, supabase);
}

export async function fetchFortnoxCompanyInfo(accessToken: string) {
  const response = await fetch(`${FORTNOX_API_URL}/companyinformation`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return { companyName: null, orgNumber: null };
  }

  const body = await response.json();
  return {
    companyName: body?.CompanyInformation?.CompanyName ?? null,
    orgNumber: body?.CompanyInformation?.OrganizationNumber ?? null,
  };
}

export async function fetchFortnoxSupplierInvoices(accessToken: string, lastModified?: string) {
  const url = new URL(`${FORTNOX_API_URL}/supplierinvoices`);
  if (lastModified) {
    url.searchParams.set("lastmodified", lastModified);
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Fortnox invoices request failed: ${await response.text()}`);
  }

  const body = await response.json();
  return Array.isArray(body?.SupplierInvoices) ? body.SupplierInvoices : [];
}

export async function downloadFortnoxInvoicePdf(accessToken: string, givenNumber: string | number) {
  const response = await fetch(`${FORTNOX_API_URL}/supplierinvoices/${givenNumber}/pdf`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/pdf",
    },
  });

  if (!response.ok) {
    throw new Error(`Fortnox PDF download failed: ${await response.text()}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export async function processFortnoxDocument(documentId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase environment variables are missing.");
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/process-invoice`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ document_id: documentId }),
  });

  if (!response.ok) {
    throw new Error(`Invoice processing failed: ${await response.text()}`);
  }

  return response.json();
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
