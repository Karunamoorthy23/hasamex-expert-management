-- Migrating target_companies from TEXT to JSONB

-- Handle existing empty strings or nulls and convert existing text to an array with a single element
ALTER TABLE projects
ALTER COLUMN target_companies TYPE JSONB 
USING CASE 
    WHEN target_companies IS NULL OR TRIM(target_companies) = '' THEN '[]'::jsonb
    WHEN target_companies ~ '^\[.*\]$' THEN target_companies::jsonb
    ELSE jsonb_build_array(target_companies)
END;

ALTER TABLE projects
ALTER COLUMN target_companies SET DEFAULT '[]'::jsonb;

ALTER TABLE projects
ALTER COLUMN target_companies SET NOT NULL;
