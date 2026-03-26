ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS engagement_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_projects_engagement_ids ON projects USING GIN (engagement_ids);

WITH grouped AS (
    SELECT e.project_id, COALESCE(jsonb_agg(DISTINCT e.id), '[]'::jsonb) AS ids
    FROM engagements e
    GROUP BY e.project_id
)
UPDATE projects p
SET engagement_ids = COALESCE(g.ids, '[]'::jsonb)
FROM grouped g
WHERE p.project_id = g.project_id;
