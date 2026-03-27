CREATE TABLE IF NOT EXISTS lk_location (
    id SERIAL PRIMARY KEY,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    display_name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    timezone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_location_unique ON lk_location (city, state, country);

ALTER TABLE users ADD COLUMN IF NOT EXISTS location_id INT REFERENCES lk_location(id);
