-- Migration: 005_email_tracking.sql
-- Email delivery tracking table for sent report emails.

CREATE TABLE email_deliveries (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id           uuid        NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  agency_id           uuid        NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  recipient_email     text        NOT NULL,
  sent_at             timestamptz NOT NULL DEFAULT now(),
  opened_at           timestamptz,
  clicked_at          timestamptz,
  bounced             boolean     NOT NULL DEFAULT false,
  bounce_reason       text,
  resend_message_id   text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_email_deliveries_report_id ON email_deliveries(report_id);
CREATE INDEX idx_email_deliveries_agency_id ON email_deliveries(agency_id);

ALTER TABLE email_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_members_see_emails" ON email_deliveries
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM team_members WHERE user_id = auth.uid()
    )
  );
