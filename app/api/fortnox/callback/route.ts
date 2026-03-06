import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { createServiceRoleClient } from "@/lib/supabase";
import {
  exchangeFortnoxCode,
  fetchFortnoxCompanyInfo,
} from "@/lib/fortnox";
import { encryptAPIKey } from "@/lib/encryption";

export async function GET(request: Request) {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const store = await cookies();
  const savedState = store.get("fortnox_oauth_state")?.value;

  if (error) {
    return NextResponse.redirect(new URL(`/price-monitor/settings?fortnox=error&message=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(new URL("/price-monitor/settings?fortnox=error&message=invalid_state", request.url));
  }

  try {
    const tokens = await exchangeFortnoxCode(code);
    const companyInfo = await fetchFortnoxCompanyInfo(tokens.access_token);
    const supabase = createServiceRoleClient();
    const expiresAt = new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000).toISOString();

    const { error: upsertError } = await supabase.from("fortnox_connections").upsert(
      {
        user_id: user.id,
        encrypted_access_token: encryptAPIKey(tokens.access_token),
        encrypted_refresh_token: encryptAPIKey(tokens.refresh_token),
        token_expires_at: expiresAt,
        fortnox_company_name: companyInfo.companyName,
        fortnox_org_number: companyInfo.orgNumber,
        scopes: typeof tokens.scope === "string" ? tokens.scope.split(" ") : [],
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (upsertError) {
      throw upsertError;
    }

    store.delete("fortnox_oauth_state");

    return NextResponse.redirect(new URL("/price-monitor/settings?fortnox=success", request.url));
  } catch (callbackError) {
    return NextResponse.redirect(
      new URL(
        `/price-monitor/settings?fortnox=error&message=${encodeURIComponent(
          callbackError instanceof Error ? callbackError.message : "callback_failed"
        )}`,
        request.url
      )
    );
  }
}
