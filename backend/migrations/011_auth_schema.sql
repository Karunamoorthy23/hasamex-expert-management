-- (DEPRECATED) Auth schema additions
-- Previously added auth fields to the client `users` table.
-- Internal authentication is now handled by:
--   - `hasamex_users`
--   - `hasamex_password_reset_tokens`
-- See: 012_hasamex_auth_users.sql

-- No-op (kept for migration history).


-- example 
INSERT INTO users (user_name, email, role, is_active, created_at, updated_at)
VALUES
  ('Admin User', 'admin@yourcompany.com', 'admin', true, NOW(), NOW()),
  ('Ops User',   'ops@yourcompany.com',   'ops',   true, NOW(), NOW()),
  ('Viewer',     'viewer@yourcompany.com','viewer',true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE
SET role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

