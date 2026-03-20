ALTER TABLE clients
ADD COLUMN IF NOT EXISTS client_solution_owner_ids TEXT,
ADD COLUMN IF NOT EXISTS sales_team_ids TEXT,
ADD COLUMN IF NOT EXISTS expert_ids TEXT;

