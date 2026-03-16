-- Migration 002: Create experts table
-- =====================================

CREATE TABLE IF NOT EXISTS lk_regions ( id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE NOT NULL, display_order INTEGER DEFAULT 0 );
CREATE TABLE IF NOT EXISTS lk_primary_sectors ( id SERIAL PRIMARY KEY, name VARCHAR(100) UNIQUE NOT NULL, display_order INTEGER DEFAULT 0 );
CREATE TABLE IF NOT EXISTS lk_expert_statuses ( id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE NOT NULL, display_order INTEGER DEFAULT 0 );
CREATE TABLE IF NOT EXISTS lk_employment_statuses ( id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE NOT NULL, display_order INTEGER DEFAULT 0 );
CREATE TABLE IF NOT EXISTS lk_seniorities ( id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE NOT NULL, display_order INTEGER DEFAULT 0 );
CREATE TABLE IF NOT EXISTS lk_currencies ( id SERIAL PRIMARY KEY, name VARCHAR(10) UNIQUE NOT NULL, display_order INTEGER DEFAULT 0 );
CREATE TABLE IF NOT EXISTS lk_company_roles ( id SERIAL PRIMARY KEY, name VARCHAR(100) UNIQUE NOT NULL, display_order INTEGER DEFAULT 0 );
CREATE TABLE IF NOT EXISTS lk_expert_functions ( id SERIAL PRIMARY KEY, name VARCHAR(100) UNIQUE NOT NULL, display_order INTEGER DEFAULT 0 );
CREATE TABLE IF NOT EXISTS lk_salutations ( id SERIAL PRIMARY KEY, name VARCHAR(10) UNIQUE NOT NULL, display_order INTEGER DEFAULT 0 );
CREATE TABLE IF NOT EXISTS lk_hcms_classifications ( id SERIAL PRIMARY KEY, name VARCHAR(50) UNIQUE NOT NULL, display_order INTEGER DEFAULT 0 );

CREATE TABLE IF NOT EXISTS experts (
    id                        UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id                 VARCHAR(20)     UNIQUE NOT NULL,
    salutation_id             INT REFERENCES lk_salutations(id),
    first_name                VARCHAR(100)    NOT NULL,
    last_name                 VARCHAR(100)    NOT NULL,
    primary_email             VARCHAR(255)    UNIQUE,
    secondary_email           VARCHAR(255),
    primary_phone             VARCHAR(50),
    secondary_phone           VARCHAR(50),
    linkedin_url              VARCHAR(500)    UNIQUE,
    location                  VARCHAR(255),
    timezone                  VARCHAR(100),
    region_id                 INT REFERENCES lk_regions(id),
    current_employment_status_id INT REFERENCES lk_employment_statuses(id),
    seniority_id              INT REFERENCES lk_seniorities(id),
    years_of_experience       INTEGER,
    title_headline            VARCHAR(500),
    bio                       TEXT,
    primary_sector_id         INT REFERENCES lk_primary_sectors(id),
    company_role_id           INT REFERENCES lk_company_roles(id),
    expert_function_id        INT REFERENCES lk_expert_functions(id),
    currency_id               INT REFERENCES lk_currencies(id),
    hourly_rate               DECIMAL(12, 2),
    hcms_classification_id    INT REFERENCES lk_hcms_classifications(id),
    expert_status_id          INT REFERENCES lk_expert_statuses(id),
    notes                     TEXT,
    profile_pdf_url           VARCHAR(500),
    last_modified             TIMESTAMP,
    total_calls_completed     INTEGER         DEFAULT 0,
    created_at                TIMESTAMP       DEFAULT NOW(),
    updated_at                TIMESTAMP       DEFAULT NOW(),
    payment_details           TEXT,
    events_invited_to         TEXT
);

-- 1-to-Many Tables
CREATE TABLE IF NOT EXISTS expert_experiences (
    id SERIAL PRIMARY KEY,
    expert_id UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
    company_name VARCHAR(255) NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    start_year INTEGER,
    end_year INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expert_strengths (
    id SERIAL PRIMARY KEY,
    expert_id UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
    topic_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expert_projects (
    expert_id UUID REFERENCES experts(id) ON DELETE CASCADE,
    project_id VARCHAR(50) NOT NULL,
    added_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (expert_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_exp_company ON expert_experiences(company_name);
CREATE INDEX IF NOT EXISTS idx_exp_strength_topic ON expert_strengths(topic_name);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_experts_updated_at ON experts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_experts_email ON experts(primary_email);

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
