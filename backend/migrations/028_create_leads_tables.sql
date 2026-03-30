-- 028_create_leads_tables.sql
-- Create leadclients, leadexperts, leadcandidates tables

CREATE TABLE IF NOT EXISTS leadclients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  role_title VARCHAR(255) NOT NULL,
  business_email VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leadclients_name ON leadclients (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_leadclients_email ON leadclients (business_email);

CREATE TABLE IF NOT EXISTS leadexperts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  city VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  linkedin_url VARCHAR(500) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leadexperts_name ON leadexperts (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_leadexperts_email ON leadexperts (email);

CREATE TABLE IF NOT EXISTS leadcandidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  city VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50) NOT NULL,
  linkedin_url VARCHAR(500) NOT NULL,
  resume_url VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leadcandidates_name ON leadcandidates (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_leadcandidates_email ON leadcandidates (email);
