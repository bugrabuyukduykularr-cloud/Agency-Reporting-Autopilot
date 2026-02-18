-- Migration: 004_reports_extra_columns.sql
-- Add error_message and fetched_at columns to reports table
-- for better error tracking and fetch timing.

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS fetched_at    timestamptz;
