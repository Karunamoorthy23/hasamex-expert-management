-- 026_drop_state_from_lk_location.sql
-- Remove 'state' column from lk_location and update unique index to (city, country)

DO $$ BEGIN
    EXECUTE 'DROP INDEX IF EXISTS uq_location_unique';
EXCEPTION WHEN undefined_object THEN
    NULL;
END $$;

ALTER TABLE lk_location DROP COLUMN IF EXISTS state;

CREATE UNIQUE INDEX IF NOT EXISTS uq_location_unique_city_country ON lk_location (city, country);

