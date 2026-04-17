# Employee History
Recommendation

- Keep the normalized ExpertExperience table (one row per experience for an expert).
- Do not move experiences into a single JSONB field unless your use-case is strictly “store and display” with minimal querying/filtering.
Why Normalized Is Better Here

- Queryability:
  - Easy filtering and analytics: find experts by role_title, by date ranges (start_year/end_year), count per company, etc.
  - Straightforward indexes on columns like role_title, start_year, end_year enable fast queries.
- Data integrity:
  - Column types, NOT NULL, and constraints are enforced by the schema.
  - You can add uniqueness rules or foreign keys later (e.g., linking companies to a master table) — difficult with JSONB.
- Maintainability:
  - Clear migrations and evolution as requirements change (add columns, constraints).
  - Simpler updates to a single experience without rewriting a whole JSON array.
- Scale is fine:
  - 10+ rows per expert is normal for relational databases; the table will perform well with proper indexes.
When JSONB Makes Sense

- The experience shape is highly variable across experts and may change frequently.
- You rarely filter or aggregate by specific fields; most use is “load and render”.
- You want to accept semi-structured payloads where strict validation isn’t needed.
- You prefer a single write per expert even if the payload is large and unstructured.
Hybrid Approach (Optional)

- Keep normalized writes and queries, and expose experiences as JSON for the UI:
  - Your model already does this: Expert.experiences relationship and serialization to_dict: experiences returns an array of objects for the frontend.
- If you need faster “all-in-one” fetches, consider a materialized view or a computed API response that aggregates experiences via JSON functions in SQL for bulk list endpoints.
- If caching is desired, you can add an optional experiences_cache JSONB column to experts and keep it in sync via application logic or a trigger, but be mindful of consistency and duplication.
Code References

- Current normalized model is in models.py: ExpertExperience and Expert.experiences serialization .

Bottom Line
- For your domain, the normalized table is the better, more future-proof choice. It supports robust queries, indexing, analytics, and constraints, while your API can still return a clean JSON array to the UI. JSONB-only storage trades away these advantages for convenience, which doesn’t fit your needs if you plan any meaningful querying or data quality enforcement.


# Employee Skills
Short Answer

- Keep strengths normalized as separate rows, not JSONB.
- Return strengths to the UI as a JSON array for convenience, exactly like your current strengths_list.
Why Not JSONB For Strengths

- Querying and filtering:
  - You’ll often search by phrases, partial matches, or categories (“web development”, “full stack”).
  - Column indexes (btree, trigram) on a normalized table make these queries fast and precise; JSONB needs GIN indexes and still awkward for phrase-level filtering.
- Deduplication and grouping:
  - Normalization avoids duplicates and lets you group, count, and rank strengths (e.g., top strengths across experts).
- Data quality and evolution:
  - Constraints, uniqueness, and referential rules are easier on columns than inside arrays.
  - Updating a single strength doesn’t require rewriting a whole JSON array.
Handling Synonyms And Variants

- Canonical taxonomy:
  - Create a canonical strengths list (e.g., “Web Development”) and map variant phrases to it.
  - Keep the expert’s original phrase for display, and store the canonical item for search/analytics.
- Synonym mapping:
  - A small synonyms table lets phrases like “Know the web development”, “full stack development”, “strong in frontend” resolve to “Web Development”.
- Indexing:
  - Use pg_trgm (already enabled) for fuzzy and partial matching on topic_name to help auto-map variants.
Practical Model Options

- Current approach (recommended):
  - Keep ExpertStrength as rows (expert_id, topic_name).
  - Continue serializing to a JSON array for the UI via strengths_list in Expert.to_dict .
- Enhanced approach (if you want canonicalization):
  - Add a table (e.g., lk_strengths) for canonical names and a join table expert_strengths linking experts to canonical strengths.
  - Optional strength_synonyms table to map free-text phrases to canonical names.
  - Keep topic_name for the original phrase; keep canonical_id for search and analytics.
When JSONB Makes Sense

- Experiences are strictly for display and you rarely query/filter by fields.
- You accept highly flexible, frequently changing structure (not typical for strengths you want to search and analyze).
Bottom Line

- Use normalized strengths for performance, searchability, deduplication, and analytics.
- Keep returning strengths to the frontend as a JSON list for convenience.
- Add a canonical taxonomy + synonyms if you want robust matching across different phrasings.

# In future we can make it fully automation. Agent will search those things. And scrup data from different sources and store it in table. It is okay ?

- Yes, it’s okay — and recommended — to automate collection. Design it as a robust ingestion pipeline: scrape → stage raw JSON → normalize → map to canonical strengths → store → index → monitor.
Data Model

- Keep normalized tables for searchable entities:
  - Expert: core profile
  - ExpertExperience: one row per experience
  - ExpertStrength: one row per topic_name (optionally link to a canonical strength)
- Add a staging table for raw ingested data:
  - Columns: id, expert_id (nullable), source, retrieved_at, raw_payload JSONB, hash, status, error_message
  - Purpose: store unprocessed data as-is for traceability and reprocessing
Ingestion Pipeline

- Source adapters:
  - Separate modules per source (LinkedIn export, internal CRM, files, web pages), each yielding a normalized JSON schema
- Staging:
  - Write raw payload to a staging table (JSONB), compute a content hash to deduplicate
- Processing:
  - Validate and transform into normalized rows (experiences, strengths)
  - Maintain idempotency: upsert based on stable keys (expert identifier + field hash)
- Scheduling and execution:
  - Use a job runner (e.g., Celery/RQ) with retries, backoff, and observability
  - Schedule periodic runs via cron or a scheduler service
Normalization & Canonicalization

- Canonical strengths:
  - A lookup table (e.g., lk_strengths) for standard names (“Web Development”)
  - Map variants from ingested text to canonical via rules + fuzzy matching
- Synonyms:
  - A strength_synonyms table for common phrases; store original phrase in ExpertStrength for display, canonical_id for search/analytics
- Fuzzy matching:
  - Use pg_trgm indexes to suggest canonical matches; allow human curation to approve mappings
Search & Indexing

- Add indexes on normalized columns:
  - ExpertStrength.topic_name with pg_trgm for “contains” and fuzzy search
  - Experience.role_title, start_year/end_year for range and keyword queries
- Optional full-text:
  - TSVector columns for richer search across multiple fields
Operations & Compliance

- Respect source policies:
  - Check terms of service, robots.txt, and legal constraints for scraping
  - Apply rate limits, identify yourself via User-Agent, and handle CAPTCHAs where applicable
- Observability:
  - Log per-job metrics: success/failure counts, source latency, dedup rate
  - Keep audit trails: who/what/when added data and transformation steps
- Error handling:
  - Record failures in staging with error_message; allow reprocess and manual review
Data Quality

- Deduplication:
  - Use hashes of normalized strength phrases and experience records
- Confidence scores:
  - Track mapping confidence for canonicalization; review low-confidence items
- Backfill/upsert:
  - Always upsert rather than insert-only, so repeated ingestion improves data and fixes errors
Recommended Next Steps

- Add staging_raw table (JSONB) and basic ETL jobs.
- Create lk_strengths and optional strength_synonyms to support canonicalization.
- Introduce pg_trgm indexes for strengths and role titles.
- Wire a background worker to process staged payloads into normalized tables with idempotent upserts.
This setup lets an agent fully automate discovery, while you keep clean, queryable data for product features and analytics.

# n8n Integration — Step‑by‑Step (Production‑Ready)

## Goal
- Connect the existing Flask backend to n8n for orchestration.
- Later, trigger a workflow when a new Project is created to enrich experts from LinkedIn based on target companies, geographies, and keywords.

## Install n8n (Windows)
- Option A: Docker (recommended for prod)
  - Step 1: Install Docker Desktop
  - Step 2: Create a deployment folder (e.g., C:\n8n) and add a docker-compose.yml:

```yaml
version: "3.7"
services:
  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - N8N_ENCRYPTION_KEY=replace-with-strong-random
      - N8N_USER_FOLDER=/home/node/.n8n
      # Optional: Basic Auth
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=replace-strong-pass
      # Optional: use Postgres in prod (instead of default SQLite)
      # - DB_TYPE=postgresdb
      # - DB_POSTGRESDB_HOST=<db-host>
      # - DB_POSTGRESDB_PORT=5432
      # - DB_POSTGRESDB_DATABASE=<db-name>
      # - DB_POSTGRESDB_USER=<db-user>
      # - DB_POSTGRESDB_PASSWORD=<db-password>
    volumes:
      - n8n_data:/home/node/.n8n
volumes:
  n8n_data:
```

  - Step 3: Customize environment
    - Set N8N_ENCRYPTION_KEY to a strong random string.
    - Keep Basic Auth enabled for the UI with a strong password.
    - If exposing via a domain/reverse proxy, set N8N_HOST to your hostname and N8N_PROTOCOL=https.
    - For production persistence and scale, switch to Postgres by setting the DB_* variables.
  - Step 4: Start n8n
    - In the folder with docker-compose.yml run: docker compose up -d
    - To view logs: docker compose logs -f n8n
    - To stop: docker compose down
  - Step 5: Open the UI
    - Visit http://localhost:5678 and sign in (Basic Auth if enabled).
  - Step 6: Verify persistence
    - Confirm the n8n_data volume exists; credentials and workflows persist across restarts.

- Option B: Node.js (simple local run)
  - Install Node.js LTS
  - In PowerShell:

```bash
npm install -g n8n
setx N8N_ENCRYPTION_KEY "replace-with-strong-random"
setx N8N_BASIC_AUTH_ACTIVE "true"
setx N8N_BASIC_AUTH_USER "admin"
setx N8N_BASIC_AUTH_PASSWORD "replace-strong-pass"
n8n start
```

- Option C: n8n Desktop
  - Download from n8n.io (quick local testing; not recommended for production).

## First‑Time Setup
- Step 1: Open n8n and sign in
  - Start n8n (Docker or Node).
  - Visit http://localhost:5678 and log in with Basic Auth if enabled.
  
- Step 2: Create Backend API credentials
  - In the left sidebar, click “Credentials”, then “New Credential”.
  - Choose “HTTP Header Auth”. (Alternatively: in any HTTP Request node, set Authentication to “Header Auth” and click “Create New Credential”.) or Choose Bearer Auth if you have a JWT or API token and want n8n to send Authorization: Bearer <token> automatically. This is the simplest for your Flask backend.</token>
  - Header Name: Authorization
  - Header Value: Bearer <service-token-from-backend>
  - Name: Backend API → Save.
  - In the HTTP Request node: set Authentication to “Header Auth” and select “Backend API”. Set the node’s URL to your Flask API (e.g., http://localhost:5000/api/v1/…).
- Step 3: Create alerting credentials (optional)
  - Slack: Credentials → New → Slack; paste your Bot User OAuth Token (xoxb-…). Use this in Slack nodes for notifications.
  - Email (SMTP): Credentials → New → SMTP; fill host, port, TLS/SSL, username, password, and “from” address. Use this in Email nodes.
- Step 4: Organization & security settings
  - Set an encryption key to protect stored credentials:
    - Docker: set N8N_ENCRYPTION_KEY in docker-compose and restart.
    - Node: setx N8N_ENCRYPTION_KEY "strong-random-key" then restart n8n.
  - Enable authentication to protect the UI:
    - Docker: N8N_BASIC_AUTH_ACTIVE=true, N8N_BASIC_AUTH_USER=admin, N8N_BASIC_AUTH_PASSWORD=<strong-pass>.
    - Node: setx N8N_BASIC_AUTH_ACTIVE "true", setx N8N_BASIC_AUTH_USER "admin", setx N8N_BASIC_AUTH_PASSWORD "<strong-pass>" and restart.
  - Prefer Postgres DB in production for resilience (set DB_* envs).

## Connect Backend → n8n
- Preferred: Backend triggers n8n via a Webhook node when a new Project is created.
- In n8n:
  - Create Workflow “Project Created → LinkedIn Enrichment”.
  - Add a Webhook node:
    - Path: /webhook/project-created/<long-secret-token>
    - Method: POST
    - Response: 200 with { received:true }
    - Optional: Basic Auth in workflow’s first step.
  - Copy the webhook URL (Production URL if behind reverse proxy).
- In Flask (concept):
  - After creating a project, POST the project payload to the webhook:

```python
import os, requests
N8N_WEBHOOK_URL = os.getenv("N8N_PROJECT_CREATED_WEBHOOK")
def notify_n8n_project_created(project_dict):
    if not N8N_WEBHOOK_URL:
        return
    try:
        requests.post(N8N_WEBHOOK_URL, json=project_dict, timeout=5)
    except Exception:
        pass  # log error in production
```

## Workflow: Project → LinkedIn Enrichment
- Nodes:
  - Webhook (input: project_id, target_companies, target_geographies, keywords)
  - Function:
    - Validate payload; expand combinations of company × geography × keyword
    - Produce an array of queries
  - Split In Batches:
    - Batch size: e.g., 10; sleep/backoff between batches to respect upstream rate limits
  - HTTP Request (Backend Ingestion API):
    - POST /api/v1/ingest/expert
    - Body: { source:"linkedin", input:{ company, geography, keyword }, options:{ mode:"search" } }
    - The backend adapter calls Proxycurl or compliant provider, normalizes data, upserts Experts/Experiences/Strengths, and returns canonical payload
  - If (error):
    - Slack/Email alert with counts and failing inputs
  - (Optional) Postgres:
    - Write a summary row: project_id, total_processed, inserted, deduped, errors
- Concurrency & Limits:
  - Use Split In Batches to throttle
  - Implement retries with exponential backoff on non‑2xx responses and 429 rate limits

## Security
- Keep provider API keys (e.g., Proxycurl) in backend env, not in n8n, when possible.
- Protect webhook:
  - Use long secret path + Basic Auth
  - Optionally check a shared signature header from backend in the workflow’s Function node
- Run n8n behind HTTPS (reverse proxy) and restrict access (VPN/allowlist) in production.

## Observability
- Add daily summary workflow:
  - Cron → Postgres/Backend → Slack/Email: processed count, errors, dedup rate
- Correlation IDs:
  - Include X‑Correlation‑Id from backend → n8n; log it across requests for debugging.
- Error handling:
  - Error Trigger node to capture exceptions globally and notify.

## Testing
- Manual trigger:
  - Call the webhook with a sample project JSON (Postman/curl)
  - Validate batches execute; check n8n execution logs
  - Confirm experts are inserted via backend API or DB queries
- UI trigger:
  - Create a new Project in the app; verify backend posts to webhook and workflow runs.

## Rollout
- Staging:
  - Point n8n to staging backend; dry‑run with small batches
  - Tune batch sizes and backoff
- Production:
  - Switch credentials/URLs; enable Basic Auth and HTTPS
  - Monitor first runs; adjust thresholds; document on‑call alerts

## Useful Links
- n8n Docs: https://docs.n8n.io
- n8n Docker: https://docs.n8n.io/hosting/installation/docker/
- Webhook Node: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- HTTP Request Node: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httpRequest/
