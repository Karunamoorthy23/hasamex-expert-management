-- Migration 003: Seed specific lookup tables
-- =============================================================

INSERT INTO lk_regions (name, display_order) VALUES ('APAC', 1), ('EMEA', 2), ('Americas', 3), ('Global', 4) ON CONFLICT (name) DO NOTHING;

INSERT INTO lk_primary_sectors (name, display_order) VALUES ('Consumer', 1), ('Education', 2), ('Energy', 3), ('Financials', 4), ('Healthcare & Life Sciences', 5), ('Industrials', 6), ('Materials', 7), ('Real Estate', 8), ('TMT', 9), ('Utilities', 10) ON CONFLICT (name) DO NOTHING;

INSERT INTO lk_expert_statuses (name, display_order) VALUES ('Lead', 1), ('Active T&Cs (No Call Yet)', 2), ('Active T&Cs (Call Completed)', 3), ('Expired T&Cs', 4), ('Do Not Contact', 5) ON CONFLICT (name) DO NOTHING;

INSERT INTO lk_employment_statuses (name, display_order) VALUES ('Currently Employed', 1), ('Independent', 2), ('Board Member', 3), ('Retired', 4), ('Freelancer', 5) ON CONFLICT (name) DO NOTHING;

INSERT INTO lk_seniorities (name, display_order) VALUES ('Academic', 1), ('Analyst', 2), ('Associate', 3), ('Board', 4), ('C-Suite', 5), ('Director', 6), ('Founder', 7), ('Manager', 8), ('Senior Manager', 9), ('VP', 10) ON CONFLICT (name) DO NOTHING;

INSERT INTO lk_currencies (name, display_order) VALUES ('USD', 1), ('EUR', 2), ('GBP', 3), ('INR', 4), ('SGD', 5), ('AED', 6) ON CONFLICT (name) DO NOTHING;

INSERT INTO lk_company_roles (name, display_order) VALUES ('Manufacturer', 1), ('Manufacturer / OEM', 2), ('Operator', 3), ('Service Provider', 4), ('Technology Provider', 5), ('Advisor / Consultant', 6), ('Board / Governance', 7), ('Distributor', 8), ('Regulator', 9) ON CONFLICT (name) DO NOTHING;

INSERT INTO lk_expert_functions (name, display_order) VALUES ('Board Governance', 1), ('Engineering', 2), ('Finance', 3), ('HR', 4), ('Legal', 5), ('Marketing', 6), ('Operations', 7), ('Product', 8), ('Regulatory', 9), ('Sales', 10), ('Strategy', 11), ('Supply Chain', 12), ('Technology', 13) ON CONFLICT (name) DO NOTHING;

INSERT INTO lk_salutations (name, display_order) VALUES ('Mr.', 1), ('Ms.', 2), ('Mrs.', 3), ('Dr.', 4), ('Prof.', 5) ON CONFLICT (name) DO NOTHING;

INSERT INTO lk_hcms_classifications (name, display_order) VALUES ('Standard', 1), ('Premium', 2), ('Strategic', 3) ON CONFLICT (name) DO NOTHING;
