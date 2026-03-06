import { NextResponse } from "next/server";
import { getApiUser } from "@/lib/api-auth";
import { buildFortnoxAuthUrl } from "@/lib/fortnox";

export async function GET() {
  const { user, error: authError } = await getApiUser();
  if (authError || !user) return authError!;

  const state = crypto.randomUUID();
  const response = NextResponse.redirect(buildFortnoxAuthUrl(state));

  response.cookies.set("fortnox_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
