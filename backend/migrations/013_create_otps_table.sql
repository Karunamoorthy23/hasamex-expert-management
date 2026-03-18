CREATE TABLE IF NOT EXISTS hasamex_otps (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hasamex_otps_email ON hasamex_otps (email);
CREATE INDEX IF NOT EXISTS idx_hasamex_otps_expires_at ON hasamex_otps (expires_at);
