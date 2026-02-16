-- Migration: 002_add_ai_tone.sql
-- Add AI commentary tone preference to clients table

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS ai_tone text NOT NULL DEFAULT 'professional';
