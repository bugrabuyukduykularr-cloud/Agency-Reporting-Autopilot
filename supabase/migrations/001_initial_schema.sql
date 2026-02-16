-- ============================================================
-- Agency Reporting Autopilot — Initial Schema
-- Migration: 001_initial_schema.sql
-- ============================================================

-- STEP 1: Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- STEP 2: Tables
-- ============================================================

CREATE TABLE agencies (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                   text        NOT NULL,
  slug                   text        UNIQUE,
  logo_url               text,
  primary_color          text        NOT NULL DEFAULT '#3B82F6',
  secondary_color        text        NOT NULL DEFAULT '#0F172A',
  custom_domain          text,
  reply_to_email         text,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text        NOT NULL DEFAULT 'trial'
                                     CHECK (plan IN ('trial', 'active', 'cancelled')),
  trial_ends_at          timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE team_members (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id  uuid        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL DEFAULT 'owner'
                         CHECK (role IN ('owner', 'admin', 'viewer')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  joined_at  timestamptz,
  UNIQUE(agency_id, user_id)
);

CREATE TABLE clients (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id       uuid        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  logo_url        text,
  contact_emails  text[]      NOT NULL DEFAULT '{}',
  report_schedule text        NOT NULL DEFAULT 'monthly'
                              CHECK (report_schedule IN ('monthly', 'weekly', 'on_demand')),
  report_day      int,
  report_time     time,
  timezone        text        NOT NULL DEFAULT 'UTC',
  next_report_at  timestamptz,
  active          boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE data_connections (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agency_id        uuid        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  platform         text        NOT NULL
                               CHECK (platform IN ('google_analytics', 'meta_ads', 'linkedin_ads')),
  account_id       text,
  account_name     text,
  access_token     text,
  refresh_token    text,
  token_expires_at timestamptz,
  scopes           text[]      DEFAULT '{}',
  status           text        NOT NULL DEFAULT 'connected'
                               CHECK (status IN ('connected', 'error', 'expired')),
  last_synced_at   timestamptz,
  error_message    text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, platform)
);

CREATE TABLE reports (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agency_id     uuid        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  period_start  date        NOT NULL,
  period_end    date        NOT NULL,
  status        text        NOT NULL DEFAULT 'generating'
                            CHECK (status IN ('generating', 'ready', 'sent', 'failed')),
  pdf_url       text,
  public_link   text        UNIQUE DEFAULT gen_random_uuid()::text,
  ai_commentary jsonb,
  raw_data      jsonb,
  sent_at       timestamptz,
  opened_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE report_sections (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id      uuid    NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  agency_id      uuid    NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  platform       text    NOT NULL,
  section_type   text    NOT NULL,
  title          text    NOT NULL,
  enabled        boolean NOT NULL DEFAULT true,
  sort_order     int     NOT NULL DEFAULT 0,
  custom_metrics jsonb
);

-- ============================================================
-- STEP 3: Indexes
-- ============================================================

CREATE INDEX idx_team_members_user_id       ON team_members(user_id);
CREATE INDEX idx_team_members_agency_id     ON team_members(agency_id);
CREATE INDEX idx_clients_agency_id          ON clients(agency_id);
CREATE INDEX idx_data_connections_client_id ON data_connections(client_id);
CREATE INDEX idx_data_connections_agency_id ON data_connections(agency_id);
CREATE INDEX idx_reports_client_id          ON reports(client_id);
CREATE INDEX idx_reports_agency_id          ON reports(agency_id);
CREATE INDEX idx_reports_status             ON reports(status);
CREATE INDEX idx_reports_public_link        ON reports(public_link);
CREATE INDEX idx_report_sections_client_id  ON report_sections(client_id);

-- ============================================================
-- STEP 4: Enable Row Level Security
-- ============================================================

ALTER TABLE agencies         ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports          ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_sections  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 5: RLS Policies
-- ============================================================

-- agencies: only the owner sees/manages their agency
CREATE POLICY "owners_manage_agency" ON agencies
  FOR ALL USING (owner_id = auth.uid());

-- team_members: agency members see their team
CREATE POLICY "members_see_team" ON team_members
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- clients: agency members only
CREATE POLICY "members_manage_clients" ON clients
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- data_connections: agency members only
CREATE POLICY "members_manage_connections" ON data_connections
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- reports: agency members only
CREATE POLICY "members_manage_reports" ON reports
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- reports: anyone with the public_link can read (no auth required)
CREATE POLICY "public_can_view_report_by_link" ON reports
  FOR SELECT USING (public_link IS NOT NULL);

-- report_sections: agency members only
CREATE POLICY "members_manage_sections" ON report_sections
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM team_members WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 6: Auto-setup trigger
-- When a new user signs up, automatically create their agency
-- and add them as owner in team_members.
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_agency_id uuid;
BEGIN
  INSERT INTO agencies (owner_id, name, slug)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'agency_name', split_part(NEW.email, '@', 1)),
    lower(regexp_replace(
      COALESCE(NEW.raw_user_meta_data->>'agency_name', split_part(NEW.email, '@', 1)),
      '[^a-z0-9]', '-', 'g'
    )) || '-' || substr(NEW.id::text, 1, 6)
  )
  RETURNING id INTO new_agency_id;

  INSERT INTO team_members (agency_id, user_id, role, joined_at)
  VALUES (new_agency_id, NEW.id, 'owner', now());

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
