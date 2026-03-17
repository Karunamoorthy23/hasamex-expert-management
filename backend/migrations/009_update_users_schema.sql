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
  ADD COLUMN IF NOT EXISTS location VARCHAR(255),
  ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(100),
  ADD COLUMN IF NOT EXISTS time_zone VARCHAR(100),
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

-- Seed sample users (idempotent on user_code)
INSERT INTO users (
  user_name, user_code, first_name, last_name,
  designation_title, email, phone, seniority, linkedin_url,
  client_id, location, preferred_contact_method, time_zone,
  avg_calls_per_month, status, notes, user_manager, ai_generated_bio
)
VALUES
(
  'Jay Mehta', 'US-0029', 'Jay', 'Mehta',
  'Vice President', 'jay.mehta@motilaloswal.com', '919820555765', 'Vice President',
  'https://www.linkedin.com/in/jay-mehta-33539a65/',
  (SELECT client_id FROM clients WHERE client_code = 'CL-0025' LIMIT 1),
  'Mumbai', 'WhatsApp', 'IST (GMT+5:30)',
  1, 'Dormant', NULL, 'Neeraj Dadlani', 'Unable to access LinkedIn profile.'
),
(
  'Prasanna Mantravadi', 'US-0030', 'Prasanna', 'Mantravadi',
  'Management Consultant - Automotive & Industrials', 'mantravadi@fev.com', '12488026873', 'Associate / Consultant',
  'https://www.linkedin.com/in/prasannamantravadi/',
  (SELECT client_id FROM clients WHERE client_code = 'CL-0026' LIMIT 1),
  'Detroit, USA', 'Email', 'ET (GMT-5)',
  4, 'Active',
  'Team of 20 consultants in USA. Automotive & Industrials specialised consulting firm with focus on EV battery supply chain and components. Boutique setup. Overall 150 consultants and do about 30-50 calls/year. Uses GLG, Guidepoint and Inex One. Happy with Inex one workspace platform. Pay above $1000 for all calls.',
  'Neeraj Dadlani', 'Unable to access LinkedIn profile.'
),
(
  'Kaushal Kedia', 'US-0031', 'Kaushal', 'Kedia',
  'Fund Manager', 'kaushal.kedia@wallfortpms.com', '919819206575', 'Manager / Eng. Manager',
  'https://www.linkedin.com/in/kaushal-kedia-43693332a/?originalSubdomain=in',
  (SELECT client_id FROM clients WHERE client_code = 'CL-0027' LIMIT 1),
  'Mumbai, India', 'WhatsApp', 'IST (GMT+5:30)',
  3, 'Active', NULL, 'Neeraj Dadlani', 'Unable to access LinkedIn profile.'
)
ON CONFLICT (user_code) DO NOTHING;

