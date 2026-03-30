-- 029_add_status_received_to_leads.sql
-- Add received_date and status columns to lead tables

ALTER TABLE leadclients
  ADD COLUMN IF NOT EXISTS received_date DATE,
  ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'Backlog';

ALTER TABLE leadexperts
  ADD COLUMN IF NOT EXISTS received_date DATE,
  ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'Backlog';

ALTER TABLE leadcandidates
  ADD COLUMN IF NOT EXISTS received_date DATE,
  ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'Backlog';

