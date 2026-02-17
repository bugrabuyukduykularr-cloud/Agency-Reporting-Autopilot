import type { SupabaseClient } from "@supabase/supabase-js";
import { encryptToken, decryptToken } from "./encrypt";

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
}

export async function refreshGoogleToken(
  supabase: SupabaseClient,
  connectionId: string
): Promise<boolean> {
  const { data: conn, error } = await supabase
    .from("data_connections")
    .select("id, refresh_token")
    .eq("id", connectionId)
    .single();

  if (error || !conn) return false;

  let decryptedRefreshToken: string;
  try {
    decryptedRefreshToken = await decryptToken(
      supabase,
      conn.refresh_token as string
    );
  } catch {
    return false;
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: decryptedRefreshToken,
    client_id: process.env.GOOGLE_CLIENT_ID!,
    client_secret: process.env.GOOGLE_CLIENT_SECRET!,
  });

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!resp.ok) return false;

  const json = (await resp.json()) as GoogleTokenResponse;

  let encryptedAccess: string;
  try {
    encryptedAccess = await encryptToken(supabase, json.access_token);
  } catch {
    return false;
  }

  const expiresAt = new Date(Date.now() + json.expires_in * 1000).toISOString();

  const { error: updateError } = await supabase
    .from("data_connections")
    .update({
      access_token: encryptedAccess,
      token_expires_at: expiresAt,
      status: "connected",
      error_message: null,
    })
    .eq("id", connectionId);

  return !updateError;
}

export async function ensureValidToken(
  supabase: SupabaseClient,
  connectionId: string
): Promise<string | null> {
  const { data: conn, error } = await supabase
    .from("data_connections")
    .select("id, access_token, token_expires_at")
    .eq("id", connectionId)
    .single();

  if (error || !conn) return null;

  const expiresAt = conn.token_expires_at
    ? new Date(conn.token_expires_at as string)
    : null;
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (!expiresAt || expiresAt < fiveMinutesFromNow) {
    const refreshed = await refreshGoogleToken(supabase, connectionId);
    if (!refreshed) return null;

    const { data: updated } = await supabase
      .from("data_connections")
      .select("access_token")
      .eq("id", connectionId)
      .single();

    if (!updated) return null;
    try {
      return await decryptToken(supabase, updated.access_token as string);
    } catch {
      return null;
    }
  }

  try {
    return await decryptToken(supabase, conn.access_token as string);
  } catch {
    return null;
  }
}
