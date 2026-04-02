CREATE TABLE IF NOT EXISTS project_form_submissions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
    availability_dates JSONB,
    project_qns_ans JSONB,
    compliance_onboarding JSONB,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT clock_timestamp()
);
