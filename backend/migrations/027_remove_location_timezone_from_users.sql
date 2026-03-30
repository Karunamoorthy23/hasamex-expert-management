-- 027_remove_location_timezone_from_users.sql
-- Drop 'location' and 'time_zone' columns from users table, now using lk_location via location_id

ALTER TABLE users
  DROP COLUMN IF EXISTS location,
  DROP COLUMN IF EXISTS time_zone;

