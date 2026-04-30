-- Migration: Create staging_expert_enhancement table
-- Created At: 2024-04-28

CREATE TABLE IF NOT EXISTS staging_expert_enhancement (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(project_id) ON DELETE CASCADE,
    basic_details JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add index on project_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_staging_experts_project_id ON staging_expert_enhancement(project_id);
