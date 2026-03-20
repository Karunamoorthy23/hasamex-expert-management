-- Ensure UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Lookup Tables First (Dependencies)
CREATE TABLE IF NOT EXISTS lk_engagement_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS lk_post_call_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS lk_payment_statuses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- 2. Seed Lookup Tables
INSERT INTO lk_engagement_methods (name) VALUES 
('Phone Call'), ('Video Conference'), ('In-Person Meeting'), ('Email Consultation')
ON CONFLICT (name) DO NOTHING;

INSERT INTO lk_post_call_statuses (name) VALUES 
('Pending'), ('Completed'), ('N/A'), ('Follow-up Required')
ON CONFLICT (name) DO NOTHING;

INSERT INTO lk_payment_statuses (name) VALUES 
('Pending'), ('Paid'), ('Overdue'), ('Processing'), ('Failed')
ON CONFLICT (name) DO NOTHING;

-- 3. Create Engagements Table
CREATE TABLE IF NOT EXISTS engagements (
    -- Core Identifiers
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Foreign Keys to Core Entities
    project_id INTEGER NOT NULL REFERENCES projects(project_id),
    expert_id UUID NOT NULL REFERENCES experts(id),
    client_id INTEGER NOT NULL REFERENCES clients(client_id),
    poc_user_id INTEGER REFERENCES users(user_id), -- Client-side PoC
    call_owner_id INTEGER REFERENCES hasamex_users(id), -- Internal Hasamex owner

    -- Core Engagement Details
    call_date TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_call_duration_mins INTEGER,
    engagement_method_id INTEGER REFERENCES lk_engagement_methods(id),
    notes TEXT,
    transcript_link_folder VARCHAR(512),

    -- Client-Side Financials
    client_rate NUMERIC(12, 2),
    client_currency_id INTEGER REFERENCES lk_currencies(id),
    discount_offered_percent NUMERIC(5, 2) DEFAULT 0,
    -- Calculated Fields
    billable_client_amount_usd NUMERIC(12, 2),

    -- Expert-Side Financials
    expert_rate NUMERIC(12, 2),
    expert_currency_id INTEGER REFERENCES lk_currencies(id),
    -- Calculated Fields
    prorated_expert_amount_base NUMERIC(12, 2),
    prorated_expert_amount_usd NUMERIC(12, 2),

    -- Margin/Profitability (Calculated)
    gross_margin_percent NUMERIC(5, 2),
    gross_profit_usd NUMERIC(12, 2),

    -- Expert Payment Lifecycle
    expert_post_call_status_id INTEGER REFERENCES lk_post_call_statuses(id),
    expert_payment_due_date DATE,
    actual_expert_payment_date DATE,
    expert_payment_status_id INTEGER REFERENCES lk_payment_statuses(id),
    expert_paid_from VARCHAR(100),
    expert_payout_ref_id VARCHAR(255),

    -- Client Invoicing Lifecycle
    client_invoice_number VARCHAR(100),
    client_invoice_date DATE,
    client_payment_received_date DATE,
    client_payment_received_account VARCHAR(100),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_engagements_project_id ON engagements(project_id);
CREATE INDEX IF NOT EXISTS idx_engagements_expert_id ON engagements(expert_id);
CREATE INDEX IF NOT EXISTS idx_engagements_call_date ON engagements(call_date DESC);
CREATE INDEX IF NOT EXISTS idx_engagements_payment_status ON engagements(expert_payment_status_id);
