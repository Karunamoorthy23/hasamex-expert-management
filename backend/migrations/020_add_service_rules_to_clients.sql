-- Add 'service_rules' column to clients table to store rules/instructions text
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS service_rules TEXT;

