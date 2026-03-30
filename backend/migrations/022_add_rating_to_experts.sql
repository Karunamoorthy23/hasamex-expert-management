-- Migration to add rating column to experts table
ALTER TABLE experts ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 0;
