-- Migration 002: Create experts table
-- =====================================

CREATE TABLE IF NOT EXISTS experts (
    id                        UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id                 VARCHAR(20)     UNIQUE NOT NULL,
    salutation                VARCHAR(10),
    first_name                VARCHAR(100)    NOT NULL,
    last_name                 VARCHAR(100)    NOT NULL,
    primary_email             VARCHAR(255)    UNIQUE,
    secondary_email           VARCHAR(255),
    primary_phone             VARCHAR(50),
    secondary_phone           VARCHAR(50),
    linkedin_url              VARCHAR(500)    UNIQUE,
    location                  VARCHAR(255),
    timezone                  VARCHAR(100),
    region                    VARCHAR(50),
    current_employment_status VARCHAR(50),
    seniority                 VARCHAR(50),
    years_of_experience       INTEGER,
    title_headline            VARCHAR(500),
    bio                       TEXT,
    employment_history        TEXT,
    primary_sector            VARCHAR(100),
    company_role              VARCHAR(100),
    expert_function           VARCHAR(100),
    strength_topics           TEXT,
    currency                  VARCHAR(10),
    hourly_rate               DECIMAL(12, 2),
    hcms_classification       VARCHAR(50),
    expert_status             VARCHAR(50),
    notes                     TEXT,
    profile_pdf_url           VARCHAR(500),
    last_modified             TIMESTAMP,
    total_calls_completed     INTEGER         DEFAULT 0,
    project_id_added_to       VARCHAR(50),
    created_at                TIMESTAMP       DEFAULT NOW(),
    updated_at                TIMESTAMP       DEFAULT NOW()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================

-- Full-text trigram search index
CREATE INDEX IF NOT EXISTS idx_experts_search ON experts USING GIN (
    (first_name || ' ' || last_name || ' ' || COALESCE(title_headline, '') || ' ' || COALESCE(primary_sector, '') || ' ' || COALESCE(location, '') || ' ' || COALESCE(linkedin_url, '')) gin_trgm_ops
);

-- Filter column indexes
CREATE INDEX IF NOT EXISTS idx_experts_region ON experts(region);
CREATE INDEX IF NOT EXISTS idx_experts_primary_sector ON experts(primary_sector);
CREATE INDEX IF NOT EXISTS idx_experts_expert_status ON experts(expert_status);
CREATE INDEX IF NOT EXISTS idx_experts_employment_status ON experts(current_employment_status);
CREATE INDEX IF NOT EXISTS idx_experts_updated_at ON experts(updated_at DESC);

-- Individual trigram indexes for specific column searches
CREATE INDEX IF NOT EXISTS idx_experts_first_name ON experts USING GIN (first_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_experts_last_name ON experts USING GIN (last_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_experts_email ON experts USING GIN (primary_email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_experts_location ON experts USING GIN (location gin_trgm_ops);

-- =====================================================
-- Auto-update trigger for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_experts_updated_at
    BEFORE UPDATE ON experts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
