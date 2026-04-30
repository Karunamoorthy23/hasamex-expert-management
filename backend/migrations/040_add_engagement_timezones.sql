-- Migration: Add expert and client timezone columns to engagements
-- Created at: 2026-04-17

ALTER TABLE engagements ADD COLUMN expert_timezone VARCHAR(100);
ALTER TABLE engagements ADD COLUMN client_timezone VARCHAR(100);
