import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateAndConsumeState } from "@/lib/oauth/state";
import { encryptToken } from "@/lib/oauth/encrypt";

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
}

interface LinkedInAdAccountName {
  localized: Record<string, string>;
}

interface LinkedInAdAccount {
  id: string;
  name: LinkedInAdAccountName;
  reference?: string;
}

interface LinkedInAdAccountsResponse {
  elements?: LinkedInAdAccount[];
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
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
    client_id: process.env.LINKEDIN_CLIENT_ID!,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
  });

  const tokenResp = await fetch(
    "https://www.linkedin.com/oauth/v2/accessToken",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    }
  );

  if (!tokenResp.ok) {
    return errorRedirect(
      request,
      clientId,
      "Could not connect. Please check your account has the required permissions."
    );
  }

  const tokens = (await tokenResp.json()) as LinkedInTokenResponse;

  // Fetch active LinkedIn ad accounts
  const adAccountsResp = await fetch(
    "https://api.linkedin.com/v2/adAccountsV2?q=search&search.status.values[0]=ACTIVE",
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  );

  let adAccounts: { id: string; name: string }[] = [];
  if (adAccountsResp.ok) {
    const accountsData =
      (await adAccountsResp.json()) as LinkedInAdAccountsResponse;
    adAccounts = (accountsData.elements ?? []).map((acc) => ({
      id: acc.reference ?? acc.id,
      name:
        acc.name?.localized?.en_US ??
        Object.values(acc.name?.localized ?? {}).join("") ??
        acc.id,
    }));
  }

  if (adAccounts.length === 0) {
    return errorRedirect(
      request,
      clientId,
      "No active ad accounts found on this LinkedIn account."
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
      platform: "linkedin_ads",
      access_token: encryptedAccess,
      refresh_token: encryptedRefresh,
      token_expires_at: tokenExpiresAt,
      properties: adAccounts as unknown as Record<string, unknown>[],
      user_id: user.id,
    })
    .select("id")
    .single();

  if (pendingError || !pending) {
    return errorRedirect(request, clientId, "Internal error. Please try again.");
  }

  const redirectUrl = new URL(`/clients/${clientId}/connections`, request.url);
  redirectUrl.searchParams.set("platform", "linkedin_ads");
  redirectUrl.searchParams.set("pending", pending.id as string);
  redirectUrl.searchParams.set("step", "select-account");
  return NextResponse.redirect(redirectUrl);
}
