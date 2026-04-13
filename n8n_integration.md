# n8n Integration — Project → Expert Search → Email Invites

This document summarizes the end‑to‑end n8n workflow used in the Expert Management app, covering how a new Project triggers a LinkedIn expert search via Apify and how invite emails are sent to lead experts.

## Overview
- Trigger: Creating a Project in the app posts minimal project context to an n8n webhook.
- Orchestration: n8n calls back the app to execute a “filter‑first” LinkedIn search using Apify and stores experts in the database.
- Outreach: n8n (or the app) triggers invitation emails to lead experts with a link to the expert form.

## Key Endpoints
- Project creation (fires webhook): [projects.py:create_project](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/projects.py#L311-L397)
- n8n health/status: [n8n_webhook.py:n8n_status](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/n8n_webhook.py#L22-L31)
- n8n → App (search experts): [n8n_webhook.py:search_experts](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/n8n_webhook.py#L36-L231)
- n8n → App (send emails): [n8n_webhook.py:send_emails](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/n8n_webhook.py#L243-L303)
- Background invite email sender: [projects.py:_bg_send_project_invites](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/projects.py#L667-L745)

## Authentication
- n8n calls are protected with `N8N_SERVICE_TOKEN`. The app accepts it either as:
  - Header: `Authorization: Bearer <token>`
  - Query param: `?token=<token>`
- See authorization logic in [search_experts](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/n8n_webhook.py#L41-L59) and [send_emails](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/n8n_webhook.py#L248-L261).

## End‑to‑End Flow
1) Create a New Project
- Frontend posts to the app’s Project API, which persists the project and immediately notifies the n8n webhook in a background thread.
- Code path:
  - Persistence: [create_project](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/projects.py#L311-L397)
  - Webhook notify: [_notify_n8n_project_created](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/projects.py#L16-L45)
- Payload includes search‑relevant fields (title, target companies, geographies, functions, description).

2) n8n Orchestrates Expert Search
- n8n receives the webhook and then calls the app’s `/api/v1/n8n/search-experts` endpoint with `N8N_SERVICE_TOKEN`.
- The app parses the project fields and performs a structured “filter‑first” search via Apify (LinkedIn):
  - Actor ID: configured as `SEARCH_ACTOR` (see [search_experts](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/n8n_webhook.py#L120-L127))
  - Structured payload: `currentJobTitles`, `currentCompanies`, `locations`, `profileScraperMode: "Full"`
  - Small batches (`maxItems`, `takePages`) to keep queries targeted
- Full process is detailed in [apify_search_process.md](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/apify_search_process.md).

3) Filter‑First Search Details
- The app sends structured filters to LinkedIn (via Apify), so LinkedIn does the heavy filtering first.
- For each returned profile, the app:
  - Calculates total years of experience.
  - Computes a simple relevance score from the project title/description vs. profile headline/bio.
  - Upserts the expert in the database and stores recent experience cuts.
- Code path:
  - Request loop and scoring: [search_experts](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/n8n_webhook.py#L137-L205)
  - Upsert + experience calc: [_store_expert_from_profile_final](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/n8n_webhook.py#L307-L502)
  - Experience years merging: [_calculate_total_experience](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/n8n_webhook.py#L603-L658)
  - Final top‑N: [ranking & response](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/n8n_webhook.py#L206-L231)

4) Prepare and Send Invite Emails
- n8n can call `/api/v1/n8n/send-emails` with the project id. The app will:
  - Load the project, collect `leads_expert_ids`, resolve Expert records and emails.
  - Convert leads → invited in the project record for UI reflection.
  - Spawn a background thread to send transactional emails.
- Code path:
  - Entry point: [send_emails](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/n8n_webhook.py#L243-L303)
  - Background sender: [_bg_send_project_invites](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/projects.py#L667-L745)
  - Mailer provider (Brevo/Resend): [services/mailer.py](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/services/mailer.py)
- Each email includes a CTA link for the expert to open the public Project Form:
  - Link pattern: `/project-form/:project_id?expert_id=:expert_code` (see `_bg_send_project_invites` for assembly)
  - Public form endpoints:
    - Fetch form data: [get_project_form_public](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/projects.py#L751-L771)
    - Submit application: [submit_project_form_public](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/routes/projects.py#L772-L902)

## Simplified PPT Narrative
- Step 1 — Create Project in CMS
  - User fills required fields (title, target geographies/functions/companies, deadlines, owners).
  - App persists and notifies n8n webhook with search‑relevant payload.
- Step 2 — n8n Runs Filter‑First Search
  - n8n triggers `/api/v1/n8n/search-experts` with service token.
  - App queries Apify’s LinkedIn actor using structured filters.
  - App validates total experience, scores relevance, stores Top 15 experts.
- Step 3 — Lead Outreach
  - n8n calls `/api/v1/n8n/send-emails` (or app UI uses `/projects/:id/send-invite`).
  - App updates project status lists (leads → invited) and emails experts.
  - Experts click the CTA link and submit availability + details via the public form.
- Step 4 — Feedback Loop
  - Accepted/scheduled/completed calls update the project’s engagement metrics shown in Projects and Engagement dashboards.

## Configuration Checklist
- In `backend/flask.env`:
  - `N8N_WEBHOOK_URL` — n8n incoming webhook for project creation.
  - `N8N_SERVICE_TOKEN` — token n8n uses to call app endpoints.
  - `APIFY_API_TOKEN` — for the Apify LinkedIn actor.
  - Email provider keys (e.g., `BREVO_API_KEY`) if sending via Brevo.

## Troubleshooting
- Unauthorized (401): Ensure `N8N_SERVICE_TOKEN` sent as Bearer token or `?token=...`.
- Empty/Mock Results: Check Apify token validity and actor limits; app provides a high‑fidelity mock fallback for demo continuity.
- Emails not sending: Verify `EMAIL_PROVIDER` and respective API keys; inspect logs in [services/mailer.py](file:///c:/Users/User/Desktop/demo/Expert-Searching-App/backend/services/mailer.py).

