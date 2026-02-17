import type { SupabaseClient } from "@supabase/supabase-js";

function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "[ARA] ENCRYPTION_KEY environment variable is not set. " +
        "Generate one with: openssl rand -base64 32"
    );
  }
  return key;
}

export async function encryptToken(
  supabase: SupabaseClient,
  token: string
): Promise<string> {
  const key = getEncryptionKey();
  const { data, error } = await supabase.rpc("encrypt_token", { token, key });
  if (error || !data) {
    throw new Error(`Token encryption failed: ${error?.message ?? "no data"}`);
  }
  return data as string;
}

export async function decryptToken(
  supabase: SupabaseClient,
  encrypted: string
): Promise<string> {
  const key = getEncryptionKey();
  const { data, error } = await supabase.rpc("decrypt_token", {
    encrypted,
    key,
  });
  if (error || !data) {
    throw new Error(`Token decryption failed: ${error?.message ?? "no data"}`);
  }
  return data as string;
}
