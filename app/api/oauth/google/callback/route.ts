import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateAndConsumeState } from "@/lib/oauth/state";
import { encryptToken } from "@/lib/oauth/encrypt";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

interface GA4Property {
  name: string;
  displayName: string;
}

interface GA4Account {
  propertySummaries?: GA4Property[];
}

interface GA4SummariesResponse {
  accountSummaries?: GA4Account[];
}

function errorRedirect(
  request: Request,
  clientId: string,
  message: string
): NextResponse {
  const url = new URL(`/clients/${clientId}/connections`, request.url);
  url.searchParams.set("error", message);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const supabase = createClient();
  await supabase.rpc("cleanup_expired_oauth");

  if (error) {
    return NextResponse.redirect(
      new URL("/clients?error=oauth_denied", request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/clients?error=invalid_callback", request.url)
    );
  }

  const stateData = await validateAndConsumeState(supabase, state);
  if (!stateData) {
    return NextResponse.redirect(
      new URL("/clients?error=expired_state", request.url)
    );
  }

  const { clientId, agencyId } = stateData;

  // Exchange code for tokens
  const tokenParams = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    grant_type: "authorization_code",
  });

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });

  if (!tokenResp.ok) {
    return errorRedirect(
      request,
      clientId,
      "Could not connect. Please check your account has the required permissions."
    );
  }

  const tokens = (await tokenResp.json()) as GoogleTokenResponse;

  // Fetch GA4 properties
  const propertiesResp = await fetch(
    "https://analyticsadmin.googleapis.com/v1beta/accountSummaries",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );

  let properties: GA4Property[] = [];
  if (propertiesResp.ok) {
    const data = (await propertiesResp.json()) as GA4SummariesResponse;
    properties = (data.accountSummaries ?? []).flatMap(
      (a) => a.propertySummaries ?? []
    );
  }

  if (properties.length === 0) {
    return errorRedirect(
      request,
      clientId,
      "No active GA4 properties found on this Google account."
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const encryptedAccess = await encryptToken(supabase, tokens.access_token);
  const encryptedRefresh = tokens.refresh_token
    ? await encryptToken(supabase, tokens.refresh_token)
    : null;
  const tokenExpiresAt = new Date(
    Date.now() + tokens.expires_in * 1000
  ).toISOString();

  const { data: pending, error: pendingError } = await supabase
    .from("oauth_pending")
    .insert({
      client_id: clientId,
      agency_id: agencyId,
      platform: "google_analytics",
      access_token: encryptedAccess,
      refresh_token: encryptedRefresh,
      token_expires_at: tokenExpiresAt,
      properties: properties as unknown as Record<string, unknown>[],
      user_id: user.id,
    })
    .select("id")
    .single();

  if (pendingError || !pending) {
    return errorRedirect(request, clientId, "Internal error. Please try again.");
  }

  const redirectUrl = new URL(`/clients/${clientId}/connections`, request.url);
  redirectUrl.searchParams.set("platform", "google_analytics");
  redirectUrl.searchParams.set("pending", pending.id as string);
  redirectUrl.searchParams.set("step", "select-account");
  return NextResponse.redirect(redirectUrl);
}
