-- 025_add_declined_to_projects.sql
-- Add declined_expert_ids JSONB column to projects for Declined (D) category

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS declined_expert_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
