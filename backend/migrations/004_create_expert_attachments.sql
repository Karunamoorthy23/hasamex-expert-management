-- Migration 004: Create expert_attachments table (optional, for file uploads)
-- =============================================================================

CREATE TABLE IF NOT EXISTS expert_attachments (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    expert_id       UUID            NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
    file_type       VARCHAR(20),
    file_url        VARCHAR(500),
    created_at      TIMESTAMP       DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attachments_expert_id ON expert_attachments(expert_id);
