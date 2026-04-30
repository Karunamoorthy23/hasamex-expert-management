-- Migration 043: Add education JSONB column to experts table
-- ============================================================
-- Stores structured education history extracted from PDFs.
-- Format: [{ "institution": "...", "degree": "...", "field": "...", "start_year": 2010, "end_year": 2014 }]

ALTER TABLE experts ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN experts.education IS 'Structured education history as JSON array. Each entry: { institution, degree, field, start_year, end_year }';
