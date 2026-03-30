-- 009_update_users_schema.sql
-- Extend users table for client user management + seed sample data

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS user_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS designation_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS seniority VARCHAR(100),
  ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS client_id INTEGER REFERENCES clients(client_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(100),
  ADD COLUMN IF NOT EXISTS avg_calls_per_month INTEGER,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS user_manager VARCHAR(255),
  ADD COLUMN IF NOT EXISTS ai_generated_bio TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_user_code_unique'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_user_code_unique UNIQUE (user_code);
  END IF;
END$$;

ON CONFLICT (user_code) DO NOTHING;

-- update users set notes=null 
ALTER TABLE users ALTER COLUMN notes TYPE JSONB USING notes::jsonb;