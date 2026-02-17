-- ============================================================
-- Migration 003: OAuth tables + pgcrypto token functions
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Enable pgcrypto (already enabled from migration 001, but safe to re-run)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Encryption helpers (SECURITY DEFINER so they can be called
-- from the anon/service role without exposing the key)
-- ============================================================
CREATE OR REPLACE FUNCTION encrypt_token(token text, key text)
RETURNS text AS $$
  SELECT encode(
    pgp_sym_encrypt(token, key),
    'base64'
  )
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_token(encrypted text, key text)
RETURNS text AS $$
  SELECT pgp_sym_decrypt(
    decode(encrypted, 'base64'),
    key
  )
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================
-- oauth_states — short-lived CSRF state tokens (10 min TTL)
-- ============================================================
CREATE TABLE IF NOT EXISTS oauth_states (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state       text UNIQUE NOT NULL,
  client_id   uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agency_id   uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  platform    text NOT NULL,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_states_state   ON oauth_states(state);

ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_states" ON oauth_states
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- oauth_pending — temporary storage between callback and
-- account-selection step (10 min TTL)
-- ============================================================
CREATE TABLE IF NOT EXISTS oauth_pending (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid NOT NULL,
  agency_id        uuid NOT NULL,
  platform         text NOT NULL,
  access_token     text NOT NULL,
  refresh_token    text,
  token_expires_at timestamptz,
  properties       jsonb,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);

CREATE INDEX IF NOT EXISTS idx_oauth_pending_expires ON oauth_pending(expires_at);

ALTER TABLE oauth_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_pending" ON oauth_pending
  FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- Cleanup helper — removes expired rows from both tables.
-- Called at the start of every callback handler.
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_expired_oauth()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states  WHERE expires_at < now();
  DELETE FROM oauth_pending WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Also ensure ai_tone column exists on clients (idempotent)
-- ============================================================
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS ai_tone text NOT NULL DEFAULT 'professional';
