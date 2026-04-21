ALTER TABLE engagements 
ADD COLUMN call_completed_duration_mins INTEGER,
ADD COLUMN completed_client_rate NUMERIC(12, 2),
ADD COLUMN completed_expert_rate NUMERIC(12, 2),
ADD COLUMN completed_prorated_expert_amount_base NUMERIC(12, 2),
ADD COLUMN completed_prorated_expert_amount_usd NUMERIC(12, 2),
ADD COLUMN completed_billable_client_amount_usd NUMERIC(12, 2);
