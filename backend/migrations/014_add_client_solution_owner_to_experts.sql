ALTER TABLE experts
ADD COLUMN IF NOT EXISTS client_solution_owner_id INTEGER REFERENCES hasamex_users(id);

CREATE INDEX IF NOT EXISTS idx_experts_client_solution_owner_id
ON experts(client_solution_owner_id);
