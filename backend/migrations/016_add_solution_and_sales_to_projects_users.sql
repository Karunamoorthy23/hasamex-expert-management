ALTER TABLE projects
ADD COLUMN IF NOT EXISTS client_solution_owner_ids TEXT,
ADD COLUMN IF NOT EXISTS sales_team_ids TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS client_solution_owner_ids TEXT,
ADD COLUMN IF NOT EXISTS sales_team_ids TEXT;
