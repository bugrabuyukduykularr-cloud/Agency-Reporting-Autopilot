import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateAndConsumeState } from "@/lib/oauth/state";
import { encryptToken } from "@/lib/oauth/encrypt";

interface MetaTokenResponse {
  access_token: string;
  expires_in?: number;
}

interface MetaAdAccount {
  id: string;
  name: string;
  account_status: number;
}

interface MetaAdAccountsResponse {
  data?: MetaAdAccount[];
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

  // Exchange for short-lived token
  const shortTokenParams = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: process.env.META_REDIRECT_URI!,
    code,
  });

  const shortTokenResp = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?${shortTokenParams.toString()}`
  );

  if (!shortTokenResp.ok) {
    return errorRedirect(
      request,
      clientId,
      "Could not connect. Please check your account has the required permissions."
    );
  }

  const shortToken = (await shortTokenResp.json()) as MetaTokenResponse;

  // Exchange for long-lived token (60 days)
  const longTokenParams = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    fb_exchange_token: shortToken.access_token,
  });

  const longTokenResp = await fetch(
    `https://graph.facebook.com/v19.0/oauth/access_token?${longTokenParams.toString()}`
  );

  const longToken = longTokenResp.ok
    ? ((await longTokenResp.json()) as MetaTokenResponse)
    : shortToken;

  // Fetch active ad accounts
  const adAccountsResp = await fetch(
    `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status&access_token=${longToken.access_token}`
  );

  let adAccounts: MetaAdAccount[] = [];
  if (adAccountsResp.ok) {
    const accountsData = (await adAccountsResp.json()) as MetaAdAccountsResponse;
    adAccounts = (accountsData.data ?? []).filter(
      (acc) => acc.account_status === 1
    );
  }

  if (adAccounts.length === 0) {
    return errorRedirect(
      request,
      clientId,
      "No active ad accounts found on this Meta account."
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const encryptedAccess = await encryptToken(supabase, longToken.access_token);
  // Meta long-lived tokens expire in ~60 days
  const tokenExpiresAt = new Date(
    Date.now() + 60 * 24 * 60 * 60 * 1000
  ).toISOString();

  const { data: pending, error: pendingError } = await supabase
    .from("oauth_pending")
    .insert({
      client_id: clientId,
      agency_id: agencyId,
      platform: "meta_ads",
      access_token: encryptedAccess,
      refresh_token: null,
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
  redirectUrl.searchParams.set("platform", "meta_ads");
  redirectUrl.searchParams.set("pending", pending.id as string);
  redirectUrl.searchParams.set("step", "select-account");
  return NextResponse.redirect(redirectUrl);
}
