import type { SupabaseClient } from "@supabase/supabase-js";

export async function createOAuthState(
  supabase: SupabaseClient,
  clientId: string,
  agencyId: string,
  platform: string,
  userId: string
): Promise<string> {
  const state = crypto.randomUUID();

  const { error } = await supabase.from("oauth_states").insert({
    state,
    client_id: clientId,
    agency_id: agencyId,
    platform,
    user_id: userId,
  });

  if (error) {
    throw new Error(`Failed to create OAuth state: ${error.message}`);
  }

  return state;
}

interface StateData {
  clientId: string;
  agencyId: string;
  platform: string;
}

export async function validateAndConsumeState(
  supabase: SupabaseClient,
  state: string
): Promise<StateData | null> {
  const { data, error } = await supabase
    .from("oauth_states")
    .select("id, client_id, agency_id, platform, expires_at")
    .eq("state", state)
    .single();

  if (error || !data) return null;

  if (new Date(data.expires_at as string) < new Date()) return null;

  await supabase.from("oauth_states").delete().eq("id", data.id as string);

  return {
    clientId: data.client_id as string,
    agencyId: data.agency_id as string,
    platform: data.platform as string,
  };
}
