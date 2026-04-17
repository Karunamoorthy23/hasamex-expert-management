-- Migration to transition project profile questions to a dynamic JSONB array
ALTER TABLE projects ADD COLUMN project_questions JSONB DEFAULT '[]'::jsonb;

-- Migrate existing data into the new JSONB array
UPDATE projects SET project_questions = (
    SELECT COALESCE(jsonb_agg(q), '[]'::jsonb)
    FROM (
        SELECT profile_question_1 AS q WHERE profile_question_1 IS NOT NULL AND profile_question_1 != ''
        UNION ALL
        SELECT profile_question_2 AS q WHERE profile_question_2 IS NOT NULL AND profile_question_2 != ''
        UNION ALL
        SELECT profile_question_3 AS q WHERE profile_question_3 IS NOT NULL AND profile_question_3 != ''
    ) sub
);

-- Drop the old static columns
ALTER TABLE projects DROP COLUMN profile_question_1;
ALTER TABLE projects DROP COLUMN profile_question_2;
ALTER TABLE projects DROP COLUMN profile_question_3;
