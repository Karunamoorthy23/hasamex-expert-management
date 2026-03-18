-- 010_project_module.sql
-- Project Management module schema additions

-- Project Type lookup
CREATE TABLE IF NOT EXISTS lk_project_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL
);

-- Target geographies lookup (countries)
CREATE TABLE IF NOT EXISTS lk_project_target_geographies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) UNIQUE NOT NULL
);

-- Extend projects table with required fields
ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS received_date DATE,
    ADD COLUMN IF NOT EXISTS project_title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS project_type_id INTEGER REFERENCES lk_project_type(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS project_description TEXT,
    ADD COLUMN IF NOT EXISTS target_companies TEXT,
    ADD COLUMN IF NOT EXISTS target_region_id INTEGER REFERENCES lk_regions(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS target_functions_titles TEXT,
    ADD COLUMN IF NOT EXISTS current_former_both VARCHAR(20),
    ADD COLUMN IF NOT EXISTS number_of_calls INTEGER,
    ADD COLUMN IF NOT EXISTS profile_question_1 TEXT,
    ADD COLUMN IF NOT EXISTS profile_question_2 TEXT,
    ADD COLUMN IF NOT EXISTS profile_question_3 TEXT,
    ADD COLUMN IF NOT EXISTS compliance_question_1 TEXT,
    ADD COLUMN IF NOT EXISTS project_deadline DATE,
    ADD COLUMN IF NOT EXISTS poc_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS project_created_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS last_modified_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Target geographies mapping (multi-select)
CREATE TABLE IF NOT EXISTS project_target_geographies (
    project_id INTEGER NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
    geography_id INTEGER NOT NULL REFERENCES lk_project_target_geographies(id) ON DELETE CASCADE,
    PRIMARY KEY (project_id, geography_id)
);

-- Seed project types
INSERT INTO lk_project_type (name) VALUES
('Expert Call'),
('Expert Meeting'),
('File Filing / Written Report'),
('Long Term Project')
ON CONFLICT (name) DO NOTHING;

-- Seed countries (common list; can be extended later)
INSERT INTO lk_project_target_geographies (name) VALUES
('Afghanistan'), ('Albania'), ('Algeria'), ('Andorra'), ('Angola'), ('Antigua and Barbuda'), ('Argentina'),
('Armenia'), ('Australia'), ('Austria'), ('Azerbaijan'), ('Bahamas'), ('Bahrain'), ('Bangladesh'), ('Barbados'),
('Belarus'), ('Belgium'), ('Belize'), ('Benin'), ('Bhutan'), ('Bolivia'), ('Bosnia and Herzegovina'), ('Botswana'),
('Brazil'), ('Brunei'), ('Bulgaria'), ('Burkina Faso'), ('Burundi'), ('Cabo Verde'), ('Cambodia'), ('Cameroon'),
('Canada'), ('Central African Republic'), ('Chad'), ('Chile'), ('China'), ('Colombia'), ('Comoros'),
('Congo (Congo-Brazzaville)'), ('Costa Rica'), ('Croatia'), ('Cuba'), ('Cyprus'), ('Czechia'), ('Denmark'),
('Djibouti'), ('Dominica'), ('Dominican Republic'), ('Ecuador'), ('Egypt'), ('El Salvador'), ('Equatorial Guinea'),
('Eritrea'), ('Estonia'), ('Eswatini'), ('Ethiopia'), ('Fiji'), ('Finland'), ('France'), ('Gabon'), ('Gambia'),
('Georgia'), ('Germany'), ('Ghana'), ('Greece'), ('Grenada'), ('Guatemala'), ('Guinea'), ('Guinea-Bissau'),
('Guyana'), ('Haiti'), ('Honduras'), ('Hungary'), ('Iceland'), ('India'), ('Indonesia'), ('Iran'), ('Iraq'),
('Ireland'), ('Israel'), ('Italy'), ('Jamaica'), ('Japan'), ('Jordan'), ('Kazakhstan'), ('Kenya'), ('Kiribati'),
('Kuwait'), ('Kyrgyzstan'), ('Laos'), ('Latvia'), ('Lebanon'), ('Lesotho'), ('Liberia'), ('Libya'),
('Liechtenstein'), ('Lithuania'), ('Luxembourg'), ('Madagascar'), ('Malawi'), ('Malaysia'), ('Maldives'), ('Mali'),
('Malta'), ('Marshall Islands'), ('Mauritania'), ('Mauritius'), ('Mexico'), ('Micronesia'), ('Moldova'), ('Monaco'),
('Mongolia'), ('Montenegro'), ('Morocco'), ('Mozambique'), ('Myanmar (Burma)'), ('Namibia'), ('Nauru'), ('Nepal'),
('Netherlands'), ('New Zealand'), ('Nicaragua'), ('Niger'), ('Nigeria'), ('North Korea'), ('North Macedonia'),
('Norway'), ('Oman'), ('Pakistan'), ('Palau'), ('Panama'), ('Papua New Guinea'), ('Paraguay'), ('Peru'),
('Philippines'), ('Poland'), ('Portugal'), ('Qatar'), ('Romania'), ('Russia'), ('Rwanda'),
('Saint Kitts and Nevis'), ('Saint Lucia'), ('Saint Vincent and the Grenadines'), ('Samoa'), ('San Marino'),
('Sao Tome and Principe'), ('Saudi Arabia'), ('Senegal'), ('Serbia'), ('Seychelles'), ('Sierra Leone'),
('Singapore'), ('Slovakia'), ('Slovenia'), ('Solomon Islands'), ('Somalia'), ('South Africa'), ('South Korea'),
('South Sudan'), ('Spain'), ('Sri Lanka'), ('Sudan'), ('Suriname'), ('Sweden'), ('Switzerland'), ('Syria'),
('Taiwan'), ('Tajikistan'), ('Tanzania'), ('Thailand'), ('Timor-Leste'), ('Togo'), ('Tonga'),
('Trinidad and Tobago'), ('Tunisia'), ('Turkey'), ('Turkmenistan'), ('Tuvalu'), ('Uganda'), ('Ukraine'),
('United Arab Emirates'), ('United Kingdom'), ('United States'), ('Uruguay'), ('Uzbekistan'), ('Vanuatu'),
('Vatican City'), ('Venezuela'), ('Vietnam'), ('Yemen'), ('Zambia'), ('Zimbabwe')
ON CONFLICT (name) DO NOTHING;

