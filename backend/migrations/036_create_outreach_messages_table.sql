CREATE TABLE IF NOT EXISTS outreach_messages (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    email_content TEXT,
    linkedin_content TEXT,
    whatsapp_sms_content TEXT,
    linkedin_inmail_content TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for faster lookups by project
CREATE INDEX IF NOT EXISTS outreach_messages_project_id_idx ON outreach_messages(project_id);
