-- 008_update_clients_schema.sql
-- Extend clients table to match updated client fields + seed sample data

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_code VARCHAR(50);

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_type VARCHAR(100),
  ADD COLUMN IF NOT EXISTS office_locations TEXT,
  ADD COLUMN IF NOT EXISTS number_of_offices INTEGER,
  ADD COLUMN IF NOT EXISTS country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS website VARCHAR(500),
  ADD COLUMN IF NOT EXISTS linkedin_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS primary_contact_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS client_manager_internal VARCHAR(255),
  ADD COLUMN IF NOT EXISTS billing_currency VARCHAR(20),
  ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(255),
  ADD COLUMN IF NOT EXISTS invoicing_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS client_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS engagement_start_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS business_activity_summary TEXT,
  ADD COLUMN IF NOT EXISTS signed_msa BOOLEAN,
  ADD COLUMN IF NOT EXISTS commercial_model VARCHAR(255),
  ADD COLUMN IF NOT EXISTS agreed_pricing TEXT,
  ADD COLUMN IF NOT EXISTS users TEXT,
  ADD COLUMN IF NOT EXISTS number_of_users INTEGER,
  ADD COLUMN IF NOT EXISTS msa TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_client_code_unique'
  ) THEN
    ALTER TABLE clients ADD CONSTRAINT clients_client_code_unique UNIQUE (client_code);
  END IF;
END$$;

-- Seed sample data (idempotent on client_code)
INSERT INTO clients (
  client_name, client_code, client_type, office_locations, number_of_offices, country,
  website, linkedin_url, primary_contact_user_id, client_manager_internal, billing_currency,
  payment_terms, invoicing_email, client_status, engagement_start_date, notes,
  business_activity_summary, signed_msa, commercial_model, agreed_pricing, users, number_of_users, msa
)
VALUES
(
  'Motilal Oswal', 'CL-0025', 'Private Equity', 'India, United Arab Emirates', 2500, 'India',
  'www.motilaloswalalt.com', 'https://www.linkedin.com/company/motilal-oswal-alternates/', NULL, 'Neeraj Dadlani', 'USD',
  NULL, NULL, NULL, NULL,
  'Spoke to Jay Mehta, will start engaging us for evaluating companies with exposure to exports that is where the use case is majorly. Covers EMS, ODM, consumer companies. WIll start from 1st nov.',
  NULL, NULL, 'Pay Per Use', NULL, 'Jay Mehta', 1, NULL
),
(
  'FEV Consulting', 'CL-0026', 'Consulting', 'United States, China, Japan, Germany, Spain, France, United Arab Emirates, Saudi Arabia', 10, 'USA',
  'https://www.fev-consulting.com/', 'https://www.linkedin.com/company/fev-consulting/', NULL, 'Neeraj Dadlani', 'USD',
  NULL, NULL, NULL, NULL,
  '150 consultants in 7 different cities. Prasanna is main user in detroit focussed on automotive and industrials.',
  NULL, FALSE, 'Pay Per Use', 'USD 800 for global and USD 950 for premium. 10 % overall project discount offered for 1st time. 10 % overall project discount offered for 1st time.',
  'Prasanna Mantravadi', 1, NULL
),
(
  'Wallfort PMS', 'CL-0027', 'Asset Manager', 'India', 1, 'India',
  'https://wallfortpms.com/', 'https://www.linkedin.com/company/wallfortpms/posts/?feedView=all', NULL, 'Neeraj Dadlani', 'USD',
  NULL, NULL, NULL, NULL,
  'Old client, wants credit contract 2-3 calls per month for 30 mins calls',
  NULL, NULL, 'Pay Per Use', NULL, 'Kaushal Kedia', 1, NULL
)
ON CONFLICT (client_code) DO NOTHING;

