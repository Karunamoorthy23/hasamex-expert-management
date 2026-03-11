-- Migration: Add events_invited_to column to experts table
-- Date: 2026-03-11

ALTER TABLE experts ADD COLUMN IF NOT EXISTS events_invited_to TEXT;
