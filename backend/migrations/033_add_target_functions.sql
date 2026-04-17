-- 033_add_target_functions.sql
-- Add Target Functions JSONB field

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS target_functions JSONB DEFAULT '[]'::jsonb NOT NULL;
