-- Internal Hasamex (team) authentication tables.
-- Keep existing `users` table for client users.

CREATE TABLE IF NOT EXISTS hasamex_users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS ix_hasamex_users_email ON hasamex_users (email);

CREATE TABLE IF NOT EXISTS hasamex_password_reset_tokens (
    id SERIAL PRIMARY KEY,
    hasamex_user_id INTEGER REFERENCES hasamex_users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'ix_hasamex_password_reset_tokens_token_unique'
    ) THEN
        CREATE UNIQUE INDEX ix_hasamex_password_reset_tokens_token_unique ON hasamex_password_reset_tokens (token);
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS ix_hasamex_password_reset_tokens_user_id ON hasamex_password_reset_tokens (hasamex_user_id);
CREATE INDEX IF NOT EXISTS ix_hasamex_password_reset_tokens_expires_at ON hasamex_password_reset_tokens (expires_at);

