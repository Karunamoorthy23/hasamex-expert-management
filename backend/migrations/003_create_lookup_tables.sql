-- Migration 003: Create lookup_tables and seed dropdown values
-- =============================================================

CREATE TABLE IF NOT EXISTS lookup_tables (
    id              SERIAL          PRIMARY KEY,
    category        VARCHAR(50)     NOT NULL,
    value           VARCHAR(100)    NOT NULL,
    display_order   INTEGER         DEFAULT 0,
    UNIQUE(category, value)
);

-- =====================================================
-- Seed: Region
-- =====================================================
INSERT INTO lookup_tables (category, value, display_order) VALUES
    ('region', 'APAC', 1),
    ('region', 'EMEA', 2),
    ('region', 'Americas', 3),
    ('region', 'Global', 4)
ON CONFLICT (category, value) DO NOTHING;

-- =====================================================
-- Seed: Primary Sector
-- =====================================================
INSERT INTO lookup_tables (category, value, display_order) VALUES
    ('primary_sector', 'Consumer', 1),
    ('primary_sector', 'Education', 2),
    ('primary_sector', 'Energy', 3),
    ('primary_sector', 'Financials', 4),
    ('primary_sector', 'Healthcare & Life Sciences', 5),
    ('primary_sector', 'Industrials', 6),
    ('primary_sector', 'Materials', 7),
    ('primary_sector', 'Real Estate', 8),
    ('primary_sector', 'TMT', 9),
    ('primary_sector', 'Utilities', 10)
ON CONFLICT (category, value) DO NOTHING;

-- =====================================================
-- Seed: Expert Status
-- =====================================================
INSERT INTO lookup_tables (category, value, display_order) VALUES
    ('expert_status', 'Lead', 1),
    ('expert_status', 'Active T&Cs (No Call Yet)', 2),
    ('expert_status', 'Active T&Cs (Call Completed)', 3),
    ('expert_status', 'Expired T&Cs', 4),
    ('expert_status', 'Do Not Contact', 5)
ON CONFLICT (category, value) DO NOTHING;

-- =====================================================
-- Seed: Current Employment Status
-- =====================================================
INSERT INTO lookup_tables (category, value, display_order) VALUES
    ('current_employment_status', 'Currently Employed', 1),
    ('current_employment_status', 'Independent', 2),
    ('current_employment_status', 'Board Member', 3),
    ('current_employment_status', 'Retired', 4),
    ('current_employment_status', 'Freelancer', 5)
ON CONFLICT (category, value) DO NOTHING;

-- =====================================================
-- Seed: Seniority
-- =====================================================
INSERT INTO lookup_tables (category, value, display_order) VALUES
    ('seniority', 'Academic', 1),
    ('seniority', 'Analyst', 2),
    ('seniority', 'Associate', 3),
    ('seniority', 'Board', 4),
    ('seniority', 'C-Suite', 5),
    ('seniority', 'Director', 6),
    ('seniority', 'Founder', 7),
    ('seniority', 'Manager', 8),
    ('seniority', 'Senior Manager', 9),
    ('seniority', 'VP', 10)
ON CONFLICT (category, value) DO NOTHING;

-- =====================================================
-- Seed: Currency
-- =====================================================
INSERT INTO lookup_tables (category, value, display_order) VALUES
    ('currency', 'USD', 1),
    ('currency', 'EUR', 2),
    ('currency', 'GBP', 3),
    ('currency', 'INR', 4),
    ('currency', 'SGD', 5),
    ('currency', 'AED', 6)
ON CONFLICT (category, value) DO NOTHING;

-- =====================================================
-- Seed: Company Role
-- =====================================================
INSERT INTO lookup_tables (category, value, display_order) VALUES
    ('company_role', 'Manufacturer', 1),
    ('company_role', 'Manufacturer / OEM', 2),
    ('company_role', 'Operator', 3),
    ('company_role', 'Service Provider', 4),
    ('company_role', 'Technology Provider', 5),
    ('company_role', 'Advisor / Consultant', 6),
    ('company_role', 'Board / Governance', 7),
    ('company_role', 'Distributor', 8),
    ('company_role', 'Regulator', 9)
ON CONFLICT (category, value) DO NOTHING;

-- =====================================================
-- Seed: Expert Function
-- =====================================================
INSERT INTO lookup_tables (category, value, display_order) VALUES
    ('expert_function', 'Board Governance', 1),
    ('expert_function', 'Engineering', 2),
    ('expert_function', 'Finance', 3),
    ('expert_function', 'HR', 4),
    ('expert_function', 'Legal', 5),
    ('expert_function', 'Marketing', 6),
    ('expert_function', 'Operations', 7),
    ('expert_function', 'Product', 8),
    ('expert_function', 'Regulatory', 9),
    ('expert_function', 'Sales', 10),
    ('expert_function', 'Strategy', 11),
    ('expert_function', 'Supply Chain', 12),
    ('expert_function', 'Technology', 13)
ON CONFLICT (category, value) DO NOTHING;

-- =====================================================
-- Seed: Salutation
-- =====================================================
INSERT INTO lookup_tables (category, value, display_order) VALUES
    ('salutation', 'Mr.', 1),
    ('salutation', 'Ms.', 2),
    ('salutation', 'Mrs.', 3),
    ('salutation', 'Dr.', 4),
    ('salutation', 'Prof.', 5)
ON CONFLICT (category, value) DO NOTHING;

-- =====================================================
-- Seed: HCMS Classification
-- =====================================================
INSERT INTO lookup_tables (category, value, display_order) VALUES
    ('hcms_classification', 'Standard', 1),
    ('hcms_classification', 'Premium', 2),
    ('hcms_classification', 'Strategic', 3)
ON CONFLICT (category, value) DO NOTHING;
