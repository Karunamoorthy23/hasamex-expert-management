-- Migration: Add JSONB poc_user_ids column, migrate data, drop poc_user_id

BEGIN;

-- 1. Add the new JSONB column
ALTER TABLE projects ADD COLUMN poc_user_ids JSONB DEFAULT '[]'::jsonb NOT NULL;

-- 2. Migrate existing data: if poc_user_id is not null, put it in a JSON array
UPDATE projects
SET poc_user_ids = jsonb_build_array(poc_user_id)
WHERE poc_user_id IS NOT NULL;

-- 3. Drop the old foreign key constraint
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_poc_user_id_fkey;

-- 4. Drop the old poc_user_id column
ALTER TABLE projects DROP COLUMN poc_user_id;

COMMIT;
