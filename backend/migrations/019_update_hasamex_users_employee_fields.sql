ALTER TABLE hasamex_users
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS pan_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS aadhar_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS date_of_joining DATE,
  ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS mobile VARCHAR(50),
  ADD COLUMN IF NOT EXISTS reporting_manager_id INTEGER REFERENCES hasamex_users(id) ON DELETE SET NULL;

UPDATE hasamex_users
SET first_name = COALESCE(first_name, username),
    last_name = COALESCE(last_name, NULL)
WHERE first_name IS NULL;
