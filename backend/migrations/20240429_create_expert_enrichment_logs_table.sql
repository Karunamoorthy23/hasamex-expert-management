CREATE TABLE IF NOT EXISTS expert_enrichment_logs (
    id SERIAL PRIMARY KEY,
    expert_id UUID REFERENCES experts(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(project_id) ON DELETE SET NULL,
    raw_json JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
