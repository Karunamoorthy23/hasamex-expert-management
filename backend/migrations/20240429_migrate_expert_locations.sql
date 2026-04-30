-- Migration script to extract location and timezone from experts.notes
-- and map them to lk_location table.

DO $$
DECLARE
    expert_record RECORD;
    extracted_loc TEXT;
    extracted_tz TEXT;
    loc_id INTEGER;
    cleaned_notes TEXT;
BEGIN
    FOR expert_record IN 
        SELECT id, notes FROM experts WHERE notes LIKE '%Location:%' OR notes LIKE '%Timezone:%'
    LOOP
        -- 1. Extract Location and Timezone using Regex
        -- Looks for "Location: <text>" stopping at " | " or end of string
        extracted_loc := substring(expert_record.notes from 'Location:\s*([^|]+)');
        extracted_tz := substring(expert_record.notes from 'Timezone:\s*([^|]+)');

        -- Clean up trailing whitespace
        extracted_loc := trim(extracted_loc);
        extracted_tz := trim(extracted_tz);

        loc_id := NULL;

        -- 2. If a location was found, map it to lk_location
        IF extracted_loc IS NOT NULL AND extracted_loc <> '' THEN
            -- Check if location already exists (case-insensitive)
            SELECT id INTO loc_id 
            FROM lk_location 
            WHERE lower(display_name) = lower(extracted_loc) 
            LIMIT 1;

            -- If it doesn't exist, create it
            IF loc_id IS NULL THEN
                INSERT INTO lk_location (display_name, timezone, created_at)
                VALUES (extracted_loc, extracted_tz, NOW())
                RETURNING id INTO loc_id;
            END IF;
        END IF;

        -- 3. Clean up the notes column
        cleaned_notes := expert_record.notes;
        
        IF extracted_loc IS NOT NULL THEN
            cleaned_notes := regexp_replace(cleaned_notes, 'Location:\s*' || extracted_loc, '', 'gi');
        END IF;
        
        IF extracted_tz IS NOT NULL THEN
            cleaned_notes := regexp_replace(cleaned_notes, 'Timezone:\s*' || extracted_tz, '', 'gi');
        END IF;

        -- Remove dangling pipes and spaces
        cleaned_notes := regexp_replace(cleaned_notes, '\|\s*\|', '|', 'g');
        cleaned_notes := trim(both ' |' from cleaned_notes);

        -- If notes are now completely empty, set to NULL
        IF cleaned_notes = '' THEN
            cleaned_notes := NULL;
        END IF;

        -- 4. Update the expert record
        UPDATE experts 
        SET 
            location_id = COALESCE(loc_id, location_id), -- Only update if we found a location
            notes = cleaned_notes
        WHERE id = expert_record.id;

    END LOOP;
END $$;
