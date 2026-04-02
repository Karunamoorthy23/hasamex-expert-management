-- Step 1: Add location_id column
ALTER TABLE experts ADD COLUMN location_id INTEGER;

-- Add foreign key constraint
ALTER TABLE experts ADD CONSTRAINT fk_expert_location FOREIGN KEY (location_id) REFERENCES lk_location(id) ON DELETE SET NULL;

-- Step 2: Insert disjoint unknown locations into lk_location
INSERT INTO lk_location (display_name, timezone)
SELECT DISTINCT e.location, e.timezone
FROM experts e
WHERE e.location IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM lk_location l WHERE l.display_name = e.location
  );

-- Step 3: Map location_id
UPDATE experts
SET location_id = lk_location.id
FROM lk_location
WHERE experts.location = lk_location.display_name AND experts.location IS NOT NULL;

-- Step 4: Clean up old standalone columns organically
ALTER TABLE experts DROP COLUMN location;
ALTER TABLE experts DROP COLUMN timezone;
