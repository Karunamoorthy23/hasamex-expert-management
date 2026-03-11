-- Migration: Add payment_details column to experts table
-- Date: 2026-03-11

ALTER TABLE experts ADD COLUMN IF NOT EXISTS payment_details TEXT;