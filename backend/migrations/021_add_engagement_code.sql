-- Add engagement_code to engagements with auto-incrementing sequence EC-###
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'engagements' AND column_name = 'engagement_code') THEN
        ALTER TABLE engagements ADD COLUMN engagement_code VARCHAR(32) UNIQUE;
    END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS engagement_code_seq START 1;

ALTER TABLE engagements
    ALTER COLUMN engagement_code SET DEFAULT ('EC-' || lpad(nextval('engagement_code_seq')::text, 3, '0'));

UPDATE engagements
SET engagement_code = 'EC-' || lpad(nextval('engagement_code_seq')::text, 3, '0')
WHERE engagement_code IS NULL;

