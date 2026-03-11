-- Migration 001: Enable required PostgreSQL extensions
-- =====================================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Trigram-based full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
