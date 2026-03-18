-- 007_create_client_management_tables.sql
-- Create Users, Clients, Projects, ProjectExperts, and Calls tables

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
    client_id SERIAL PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    location VARCHAR(255),
    status VARCHAR(50),
    company VARCHAR(255),
    type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
    project_id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    sector VARCHAR(100),
    description TEXT,
    status VARCHAR(50) DEFAULT 'Planning',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Experts (Mapping) table
CREATE TABLE IF NOT EXISTS project_experts (
    project_expert_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
    stage VARCHAR(50) DEFAULT 'sourced',
    call_completed BOOLEAN DEFAULT FALSE,
    call_date TIMESTAMP,
    expert_rate NUMERIC(10, 2),
    UNIQUE(project_id, expert_id)
);

-- Calls table
CREATE TABLE IF NOT EXISTS calls (
    call_id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    expert_id UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
    client_user VARCHAR(255),
    zoom_link VARCHAR(500),
    recording_url VARCHAR(500),
    transcript_url VARCHAR(500),
    call_status VARCHAR(50) DEFAULT 'scheduled'
);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_clients_modtime BEFORE UPDATE ON clients FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_projects_modtime BEFORE UPDATE ON projects FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
