# Hasamex Agent-Based Automation Architecture

## Document Purpose

This document defines the complete architecture for transforming the Hasamex Expert Database from a **fully manual workflow** into a **fully automated, AI-agent-driven platform**. It covers agent design, orchestration, database strategy, implementation plan, and code-level integration details.

---

## Table of Contents

1. [System Overview — Manual vs Automated](#1-system-overview)
2. [Why Hybrid Database (PostgreSQL + MongoDB) — Not Complete MongoDB](#2-database-strategy)
3. [AI Agent Architecture — 5-Agent Pipeline](#3-ai-agent-architecture)
4. [Orchestration Engine — n8n Workflow Design](#4-orchestration-engine)
5. [Semantic Search — pgvector Embeddings](#5-semantic-search)
6. [Integration with Existing Codebase](#6-integration)
7. [Implementation Roadmap — 4 Phases, 16 Weeks](#7-implementation-roadmap)
8. [Cost, Risk & Security](#8-cost-risk-security)

---

## 1. System Overview

### 1.1 Current State — Fully Manual

Every step in the Hasamex expert management workflow is currently performed manually by staff:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CURRENT WORKFLOW (MANUAL)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Staff browses LinkedIn ──► Manual data entry ──► Create project    │
│        │                         │                      │           │
│        ▼                         ▼                      ▼           │
│  Find experts            Add to database         Assign experts     │
│  (hours per project)     (error-prone)           (by memory)        │
│        │                         │                      │           │
│        ▼                         ▼                      ▼           │
│  Compose emails          Send via app            Schedule calls     │
│  (inconsistent)          (one by one)            (back-and-forth)   │
│        │                         │                      │           │
│        ▼                         ▼                      ▼           │
│  Track responses         Update pipeline         Create engagement  │
│  (manual follow-up)      (manual stage change)   (manual entry)     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Future State — AI Agent-Driven

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FUTURE WORKFLOW (AUTOMATED)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Staff creates project ──► WEBHOOK ──► n8n Orchestrator             │
│                                            │                        │
│                              ┌─────────────┼─────────────┐          │
│                              ▼             ▼             ▼          │
│                        Agent 1:      Agent 2:      Agent 3:         │
│                        Analyze       Discover      Match &          │
│                        Project       Experts       Rank             │
│                              │             │             │          │
│                              ▼             ▼             ▼          │
│                        [HUMAN REVIEW CHECKPOINT]                    │
│                              │                                      │
│                     ┌────────┼────────┐                              │
│                     ▼                 ▼                              │
│               Agent 4:          Agent 5:                             │
│               Compose           Schedule                            │
│               Emails            Calls                               │
│                     │                 │                              │
│                     ▼                 ▼                              │
│               Send via          Book meetings                       │
│               Resend API        Calendar API                        │
│                     │                 │                              │
│                     ▼                 ▼                              │
│               Auto-create engagement records                        │
│               Notify staff via dashboard                            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.3 Technology Stack Summary

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Orchestration** | n8n (self-hosted, Docker) | Visual workflow engine, triggers, human approval nodes |
| **AI — Analysis & Writing** | Claude Sonnet 4 (Anthropic API) | Project analysis, email composition |
| **AI — Extraction & Scoring** | OpenAI GPT-4o | Structured data extraction, expert matching scores |
| **AI — Embeddings** | OpenAI `text-embedding-3-small` | Expert profile vector embeddings |
| **Vector Store** | pgvector (PostgreSQL extension) | Semantic similarity search |
| **Expert Sourcing** | ProxyCurl API | LinkedIn profile data (legal, structured) |
| **Primary Database** | PostgreSQL (existing) | Core business data: experts, clients, projects, engagements |
| **Document Store** | MongoDB Atlas | AI-generated data: scraped profiles, agent logs, email drafts |
| **Cache** | Redis | Rate limiting, session cache, job deduplication |
| **Email** | Resend API (existing) | Transactional email delivery |
| **Calendar** | Google Calendar API / Calendly | Meeting scheduling |
| **Video Calls** | Zoom / Google Meet API | Auto-generate meeting links |

---

## 2. Database Strategy — Why Hybrid, Not Complete MongoDB

### 2.1 Executive Decision

> **DECISION: Hybrid (PostgreSQL + MongoDB)**
>
> Keep PostgreSQL for all core business data. Add MongoDB only for new AI-generated and scraped data. This is overwhelmingly the correct choice for Hasamex.

### 2.2 The Hasamex Data Model is Deeply Relational

The current database has **12 interconnected models** and **15 lookup tables** with extensive foreign key relationships:

```
engagements (9 Foreign Keys)
├── → projects.project_id
├── → experts.id
├── → clients.client_id
├── → users.user_id (POC contact)
├── → hasamex_users.id (call owner)
├── → lk_currencies.id (client currency)
├── → lk_currencies.id (expert currency)
├── → lk_engagement_methods.id
├── → lk_payment_statuses.id
└── → lk_post_call_statuses.id

experts (9 FK Lookups + 2 Child Tables)
├── → lk_salutations.id
├── → lk_regions.id
├── → lk_employment_statuses.id
├── → lk_seniorities.id
├── → lk_primary_sectors.id
├── → lk_company_roles.id
├── → lk_expert_functions.id
├── → lk_currencies.id
├── → lk_hcms_classifications.id
├── → lk_expert_statuses.id
├── ←── expert_experiences (1:N child)
└── ←── expert_strengths (1:N child)

projects (Multiple FKs + M2M)
├── → clients.client_id
├── → lk_project_type.id
├── → lk_regions.id (target region)
├── → users.user_id (POC)
└── ←→ lk_project_target_geographies (M2M junction table)
```

### 2.3 Detailed Comparison — Hasamex-Specific

| Factor | Hybrid (PG + Mongo) | Complete MongoDB |
|--------|---------------------|-----------------|
| **Financial Precision** | ✅ `Numeric(12,2)` — exact decimal math for rates, margins, payments | ❌ IEEE 754 floating point — `0.1 + 0.2 = 0.30000000000000004` — unacceptable for invoicing |
| **Multi-Table Queries** | ✅ `SELECT ... JOIN engagements JOIN projects JOIN clients JOIN experts` — single query | ❌ Requires `$lookup` aggregation or multiple queries — slow, complex |
| **15 Lookup Tables** | ✅ FK constraints guarantee data integrity; auto-populated dropdowns | ❌ Must embed or reference — stale embedded data or no integrity |
| **Duplicate Detection** | ✅ `UNIQUE` on `primary_email`, `linkedin_url` — enforced by DB engine | ⚠️ Unique indexes work but no cascade protection |
| **Expert Pipeline** | ✅ JSONB arrays (`leads_expert_ids`, `invited_expert_ids`) with FK validation possible | ⚠️ No FK validation — orphaned expert references undetectable |
| **Scraped LinkedIn Data** | ❌ Rigid schema needs ALTER TABLE for new fields | ✅ Schema-less — store any ProxyCurl response shape |
| **AI Agent Logs** | ❌ JSONB works but forced for high-volume append | ✅ Natural document fit — variable I/O, nested, time-series |
| **Email Draft Versions** | ❌ Awkward relational modeling for version arrays | ✅ Embed all versions in single document |
| **Vector Search** | ✅ pgvector — same DB, zero network hop, free | ⚠️ Atlas Vector Search — paid tier ($0.10/hr min) |
| **ORM & API** | 🟢 Zero changes to 12 models + 12 route files | 🔴 Rewrite ~950 lines models.py + ~150K chars routes |
| **Migration Risk** | 🟢 None — existing system untouched | 🔴 6-8 weeks rewrite with HIGH regression risk |

### 2.4 Migration Cost: 3-4 Days vs 6-8 Weeks

#### Complete MongoDB Migration (NOT Recommended)

| Component | Current Scale | Work Required | Time |
|-----------|-------------|---------------|------|
| `models.py` (12 SQLAlchemy models) | 952 lines | Full rewrite to Mongoengine/PyMongo | 2-3 weeks |
| `routes/` (12 route files) | 150K+ chars | Rewrite all ORM queries to PyMongo | 3-4 weeks |
| 30+ `to_dict()` serialization methods | Coupled to ORM `.relationship()` | Redesign for embedded/referenced docs | 1-2 weeks |
| `config.py` connection setup | 150 lines | Replace entirely | 1 day |
| Frontend API layer | 25K chars | Fix `_id` vs `id`, pagination format | 3-5 days |
| Data migration ETL | N/A | Write script to migrate all production data | 1 week |
| **TOTAL** | | | **6-8 weeks** |
| **RISK** | | | **HIGH — production downtime, regression bugs, data loss** |

#### Hybrid Setup (RECOMMENDED)

| Component | Work Required | Time |
|-----------|---------------|------|
| Add `pymongo` to requirements | `pip install pymongo` | 5 min |
| Create `backend/services/mongo_client.py` | MongoDB connection singleton | 1-2 hrs |
| Add config entries to `config.py` | `MONGO_URI`, `MONGO_DB_NAME` | 30 min |
| Define MongoDB collections & indexes | 3 collections with indexes | 2-3 days |
| Install pgvector extension | `CREATE EXTENSION vector;` | 1 hr |
| **TOTAL** | | **3-4 days** |
| **RISK** | | **NONE — existing system untouched** |

### 2.5 When MongoDB-Only Would Be Correct

MongoDB-only is the right database choice when:

| Condition | Does it apply to Hasamex? |
|-----------|--------------------------|
| Building from scratch with no existing data | ❌ Running production system with real data |
| Data is mostly document-shaped (CMS, IoT, logs) | ❌ Highly relational — 9 FKs on engagements alone |
| No need for financial precision | ❌ Tracks rates, margins, payments to 2 decimals |
| No need for complex multi-table joins | ❌ Dashboards join Projects → Clients → Experts → Engagements |
| Team experienced in MongoDB, willing to rewrite | ❓ Rewrite cost is 6-8 weeks regardless |

**Verdict: None apply. Hybrid is the correct architecture.**

### 2.6 What Goes Where — Simple Rule

> **If the data has foreign keys or needs financial precision → PostgreSQL**
> **If the data is AI-generated, scraped, or has variable structure → MongoDB**

| Database | Data Stored | Why This DB |
|----------|------------|------------|
| **PostgreSQL** (keep) | Experts, Clients, Projects, Engagements, Users, 15 Lookup tables | ACID, JOINs, `Numeric(12,2)`, existing ORM |
| **pgvector** (add extension) | Expert profile embeddings (1536-dim vectors) | Zero network hop, free, fast cosine similarity |
| **MongoDB Atlas** (add) | Scraped profiles, AI agent logs, email drafts, conversation history | Schema-less, variable structure, append-heavy |
| **Redis** (add) | Rate limits, session cache, job deduplication | Sub-millisecond reads, TTL auto-expiry |

### 2.7 Data Flow Between Databases

```
PostgreSQL (Existing)                     MongoDB Atlas (New)
┌──────────────────────┐                 ┌──────────────────────┐
│ experts              │                 │ scraped_profiles     │
│ clients              │◄── import ──────│ (raw ProxyCurl data) │
│ projects             │     approved    │                      │
│ engagements          │                 │ agent_execution_logs │
│ users                │                 │ (AI agent I/O)       │
│ hasamex_users        │                 │                      │
│ 15 lookup tables     │                 │ email_drafts         │
│                      │                 │ (AI-composed, multi  │
│ expert_embeddings    │                 │  version)            │
│ (pgvector)           │                 │                      │
└──────────────────────┘                 │ ai_conversations     │
                                         │ (per-project chat)   │
                                         └──────────────────────┘
         Redis (New)
┌──────────────────────┐
│ rate_limits          │
│ session_cache        │
│ job_deduplication    │
└──────────────────────┘
```

### 2.8 MongoDB Collection Schemas

#### Collection: `scraped_profiles`

```javascript
{
  _id: ObjectId("..."),
  linkedin_url: "https://linkedin.com/in/john-doe-pharma",
  source: "proxycurl",                    // proxycurl | manual | bulk_import
  raw_data: { /* full ProxyCurl JSON — variable structure */ },
  normalized: {
    first_name: "John",
    last_name: "Doe",
    headline: "VP of Strategy at Pharma Corp",
    location: "New York, NY",
    experiences: [
      { company: "Pharma Corp", title: "VP Strategy", start: "2019", end: null },
      { company: "McKinsey", title: "Senior Associate", start: "2014", end: "2019" }
    ],
    skills: ["Healthcare Strategy", "M&A", "Due Diligence"],
    education: [{ school: "Harvard Business School", degree: "MBA", year: 2014 }]
  },
  ai_analysis: {
    sector_tags: ["Healthcare", "Pharma", "Life Sciences"],
    seniority_level: "VP",
    years_experience_estimated: 15,
    fit_scores: {
      "project_123": { score: 87, reasoning: "Strong pharma background with 15 years..." },
      "project_456": { score: 42, reasoning: "Wrong geographic focus..." }
    }
  },
  dedup_check: {
    email_match: null,
    linkedin_match: null,
    similarity_score: 0.0
  },
  status: "pending_review",               // pending_review | approved | rejected | imported
  imported_expert_id: null,               // PostgreSQL experts.id after import
  scraped_at: ISODate("2026-04-01T10:00:00Z"),
  reviewed_at: null,
  reviewed_by: null,
  project_trigger_id: 123
}
```

#### Collection: `agent_execution_logs`

```javascript
{
  _id: ObjectId("..."),
  workflow_id: "wf_abc123",
  workflow_name: "expert-discovery",
  agent_name: "project_analyzer",          // project_analyzer | expert_discovery | matcher | email_composer | scheduler
  project_id: 123,
  trigger: "webhook",                      // webhook | cron | manual
  input: { /* full agent input */ },
  output: { /* full agent output */ },
  model_used: "claude-sonnet-4-20250514",
  tokens_used: { input: 2340, output: 890, total: 3230 },
  cost_usd: 0.0097,
  latency_ms: 3200,
  status: "success",                       // success | error | timeout | rate_limited
  error_message: null,
  retry_count: 0,
  created_at: ISODate("2026-04-01T10:05:00Z")
}
```

#### Collection: `email_drafts`

```javascript
{
  _id: ObjectId("..."),
  project_id: 123,
  expert_id: "uuid-of-expert",
  expert_name: "John Doe",
  template_type: "initial_outreach",       // initial_outreach | follow_up | scheduling
  versions: [
    {
      version: 1,
      subject: "Opportunity: Healthcare Strategy Project",
      body_html: "<html>...",
      generated_by: "claude-sonnet-4",
      generated_at: ISODate("2026-04-01T10:10:00Z"),
      edited_by: null
    },
    {
      version: 2,
      subject: "Opportunity: Healthcare Strategy Project — Updated",
      body_html: "<html>...(staff edited)...",
      generated_by: "staff_edit",
      generated_at: ISODate("2026-04-01T11:00:00Z"),
      edited_by: 5
    }
  ],
  status: "sent",
  sent_at: ISODate("2026-04-01T11:05:00Z"),
  resend_message_id: "msg_abc123",
  delivery_status: "delivered",
  follow_up_scheduled_at: ISODate("2026-04-04T10:00:00Z"),
  created_at: ISODate("2026-04-01T10:10:00Z")
}
```

---

## 3. AI Agent Architecture — 5-Agent Pipeline

### 3.1 Pipeline Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Agent 1    │     │   Agent 2    │     │   Agent 3    │     │   Agent 4    │     │   Agent 5    │
│   PROJECT    │────►│   EXPERT     │────►│   EXPERT     │────►│   EMAIL      │────►│   CALL       │
│   ANALYZER   │     │   DISCOVERY  │     │   MATCHER    │     │   COMPOSER   │     │   SCHEDULER  │
│              │     │              │     │              │     │              │     │              │
│ Claude       │     │ ProxyCurl +  │     │ pgvector +   │     │ Claude       │     │ Calendar API │
│ Sonnet 4     │     │ GPT-4o       │     │ GPT-4o       │     │ Sonnet 4     │     │ + Zoom       │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                    │                    │                    │                    │
      ▼                    ▼                    ▼                    ▼                    ▼
  PostgreSQL           MongoDB            PostgreSQL            MongoDB            PostgreSQL
  (read project)    (store scraped)     (query experts +     (store drafts)     (create engagement)
                                         pgvector search)
```

### 3.2 Agent 1: Project Analyzer

**Purpose:** Extract structured requirements from a newly created project.

| Property | Value |
|----------|-------|
| **LLM** | Claude Sonnet 4 (Anthropic API) |
| **Input** | Project record from PostgreSQL (title, description, sector, target companies, target region, profile questions) |
| **Output** | Structured JSON with search parameters |
| **Trigger** | n8n webhook when project is created/updated |
| **Data Source** | PostgreSQL `projects` table |
| **Data Sink** | MongoDB `agent_execution_logs` |

**Prompt Template:**

```
SYSTEM: You are an expert requirements analyst for Hasamex, an expert network
company that connects clients with industry experts for consultation calls.

Given a project brief, extract structured requirements that will be used to
search for and match suitable experts. Be specific and practical.

INPUT: {project_json}

OUTPUT: Return ONLY valid JSON:
{
  "required_skills": ["skill1", "skill2", ...],
  "target_sectors": ["Healthcare", "Pharma", ...],
  "target_seniority": ["Director", "VP", "C-Level"],
  "target_geographies": ["North America", "Europe"],
  "target_companies": ["Pfizer", "McKinsey", ...],
  "employment_preference": "current" | "former" | "both",
  "min_years_experience": 10,
  "max_hourly_rate_usd": 500,
  "linkedin_search_queries": [
    "healthcare strategy director pharma",
    "VP operations pharmaceutical company"
  ],
  "must_have_criteria": ["..."],
  "nice_to_have_criteria": ["..."],
  "disqualifying_factors": ["competitor company", "too junior"]
}
```

### 3.3 Agent 2: Expert Discovery

**Purpose:** Find new expert profiles from LinkedIn that match project requirements.

| Property | Value |
|----------|-------|
| **LLM** | GPT-4o (for structured data extraction) |
| **External API** | ProxyCurl (LinkedIn profile data) |
| **Input** | Structured requirements from Agent 1 |
| **Output** | Normalized expert profiles stored in MongoDB |
| **Trigger** | Chained from Agent 1 via n8n |
| **Data Source** | ProxyCurl API |
| **Data Sink** | MongoDB `scraped_profiles` |

**Workflow Steps:**

```
1. Take search queries from Agent 1
2. Call ProxyCurl Person Search API for each query
3. For each result:
   a. Fetch full profile via ProxyCurl Profile API
   b. Store raw response in MongoDB (scraped_profiles.raw_data)
   c. Use GPT-4o to normalize into structured format
   d. Run deduplication check against PostgreSQL (email, LinkedIn URL)
   e. Store normalized + dedup result in MongoDB
4. Return list of discovered profiles
```

**GPT-4o Normalization Prompt:**

```
SYSTEM: You are a data extraction specialist. Given a raw LinkedIn profile
JSON from ProxyCurl, extract and normalize the following fields.

INPUT: {raw_proxycurl_json}

OUTPUT: Return ONLY valid JSON matching the Hasamex expert schema:
{
  "first_name": "John",
  "last_name": "Doe",
  "primary_email": "john@example.com",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "location": "New York, NY",
  "timezone": "America/New_York",
  "title_headline": "VP of Strategy at Pharma Corp",
  "bio": "15+ years in healthcare strategy...",
  "years_of_experience": 15,
  "current_employment_status": "Employed",
  "seniority": "VP / SVP",
  "primary_sector": "Healthcare",
  "company_role": "VP Strategy",
  "expert_function": "Strategy & Consulting",
  "experiences": [
    {"company_name": "Pharma Corp", "role_title": "VP Strategy", "start_year": 2019, "end_year": null},
    {"company_name": "McKinsey", "role_title": "Senior Associate", "start_year": 2014, "end_year": 2019}
  ],
  "strength_topics": ["Healthcare Strategy", "M&A", "Due Diligence"]
}

RULES:
- Map seniority to one of: Analyst, Associate, Manager, Director, VP / SVP, C-Level, Board
- Map employment status to: Employed, Self-Employed, Retired, Between Roles
- If email is not available, set to null
- Extract ALL work experiences, not just current
```

### 3.4 Agent 3: Expert Matcher

**Purpose:** Score and rank experts against project requirements using semantic similarity + AI reasoning.

| Property | Value |
|----------|-------|
| **LLM** | GPT-4o (for scoring + reasoning) |
| **Vector Search** | pgvector (cosine similarity) |
| **Input** | Project requirements + expert pool (internal DB + newly scraped) |
| **Output** | Ranked expert list with match scores (0-100) and reasoning |
| **Trigger** | Chained from Agent 2 via n8n |
| **Data Source** | PostgreSQL (experts + expert_embeddings via pgvector) |
| **Data Sink** | MongoDB `agent_execution_logs` |

**Two-Stage Matching Process:**

```
Stage 1: VECTOR SIMILARITY (fast, coarse filter)
  - Generate embedding for project requirements text
  - Query pgvector for top 50 experts by cosine similarity
  - Filter by hard constraints (region, seniority, status)
  - Result: ~20-30 candidate experts

Stage 2: AI SCORING (accurate, fine-grained)
  - Send candidate profiles + requirements to GPT-4o
  - Score each expert 0-100 with weighted criteria
  - Return ranked list with reasoning for each score
```

**GPT-4o Scoring Prompt:**

```
SYSTEM: You are an expert matching engine for Hasamex. Given project
requirements and a list of expert profiles, score each expert's fit
on a scale of 0-100 and explain your reasoning.

SCORING WEIGHTS:
1. Sector alignment (30%) — Does the expert's sector match?
2. Specific skill overlap (25%) — Do they have the required skills?
3. Seniority match (20%) — Are they at the right level?
4. Geographic/timezone fit (15%) — Can they attend calls in the right timezone?
5. Rate & availability (10%) — Are they within budget and available?

INPUT:
Project Requirements: {requirements_json}
Expert Profiles: {experts_json}

OUTPUT: Return ONLY valid JSON array, sorted by score descending:
[
  {
    "expert_id": "uuid-123",
    "expert_name": "John Doe",
    "match_score": 87,
    "reasoning": "Strong pharma background with 15 years experience...",
    "strengths": ["Exact sector match", "VP-level seniority"],
    "concerns": ["Based in Europe — timezone may be challenging"],
    "recommended_rate_usd": 350
  }
]
```

### 3.5 Agent 4: Email Composer

**Purpose:** Generate personalized outreach emails for each shortlisted expert.

| Property | Value |
|----------|-------|
| **LLM** | Claude Sonnet 4 (superior writing quality) |
| **Input** | Expert profile + project context + match reasoning |
| **Output** | Personalized email (subject + HTML body + follow-up schedule) |
| **Trigger** | After human approval of expert shortlist |
| **Data Source** | PostgreSQL (expert + project) |
| **Data Sink** | MongoDB `email_drafts` |

**Claude Prompt:**

```
SYSTEM: You are an expert outreach specialist for Hasamex, a premium expert
network company. Write a professional, warm, and personalized outreach email
to invite an expert for a paid consultation call.

GUIDELINES:
- Address the expert by name
- Reference their specific experience that makes them relevant
- Briefly describe the project without revealing confidential client details
- Mention compensation (hourly rate range)
- Include a clear call-to-action
- Keep it concise (under 200 words)
- Professional but not overly formal

EXPERT PROFILE: {expert_json}
PROJECT CONTEXT: {project_json}
MATCH REASONING: {match_reasoning}

OUTPUT: Return ONLY valid JSON:
{
  "subject": "Invitation: Paid Strategy Consultation — Healthcare Project",
  "body_html": "<html>...",
  "body_text": "Dear John...",
  "follow_up_days": 3,
  "follow_up_subject": "Following up: Healthcare Strategy Consultation"
}
```

### 3.6 Agent 5: Call Scheduler

**Purpose:** Automatically schedule consultation calls after expert acceptance.

| Property | Value |
|----------|-------|
| **APIs** | Google Calendar API + Zoom API |
| **Input** | Accepted expert + client POC + timezone constraints |
| **Output** | Confirmed meeting + engagement record |
| **Trigger** | Expert reply parsed as "accepted" |
| **Data Source** | PostgreSQL (expert timezone, client timezone, POC) |
| **Data Sink** | PostgreSQL (create engagement record), MongoDB (log) |

**Workflow:**

```
1. Get expert timezone (from experts.timezone or lk_location)
2. Get client POC timezone (from users.location → lk_location.timezone)
3. Find overlapping business hours (9am-6pm both timezones)
4. Propose 3 time slots within next 5 business days
5. Generate Zoom/Google Meet link
6. Send calendar invites to both parties
7. Create Engagement record in PostgreSQL:
   - project_id, expert_id, client_id, poc_user_id
   - call_date, engagement_method = "Video Call"
   - expert_rate (from expert profile)
8. Update project pipeline: expert_scheduled[] += expert_id
9. Notify Hasamex staff via dashboard
```

### 3.7 Human-in-the-Loop Checkpoints

> **MANDATORY for v1 deployment — gradually relax as accuracy improves.**

| # | Checkpoint | Location in Pipeline | What Staff Reviews | Auto-Approve Criteria (Future) |
|---|-----------|---------------------|-------------------|-------------------------------|
| 1 | Expert shortlist approval | After Agent 3 (Matcher) | Ranked list with scores | Score > 80 AND no concerns flagged |
| 2 | New expert profile review | After Agent 2 (Discovery) | Scraped data accuracy | Email verified AND dedup score < 0.3 |
| 3 | Email draft approval | After Agent 4 (Composer) | Subject + body content | Template used > 10 times with > 30% open rate |
| 4 | Scheduling confirmation | After Agent 5 (Scheduler) | Proposed time slots | Both parties confirmed availability via Calendly |

---

## 4. Orchestration Engine — n8n Workflow Design

### 4.1 Why n8n

| Requirement | n8n Capability |
|------------|---------------|
| Visual workflow designer | ✅ Drag-and-drop node editor |
| Native OpenAI/Claude nodes | ✅ Built-in AI nodes |
| Webhook triggers from Flask | ✅ Webhook node with instant trigger |
| Human approval gates | ✅ Wait node + external webhook resume |
| Error handling & retry | ✅ Built-in retry, error workflow |
| Self-hosted (data privacy) | ✅ Docker, own infrastructure |
| 400+ integrations | ✅ HTTP, Google Calendar, Zoom, Slack, etc. |

### 4.2 Workflow 1: Expert Auto-Discovery Pipeline

```
[Webhook: New Project] 
    → [HTTP: Fetch project from Flask API] 
    → [AI: Claude — Analyze requirements] 
    → [HTTP: pgvector similarity search via Flask API] 
    → [IF: Enough internal matches?]
        → YES: [AI: GPT-4o — Score & rank]
        → NO:  [HTTP: ProxyCurl — Search LinkedIn]
               → [AI: GPT-4o — Normalize profiles]
               → [HTTP: Flask API — Check duplicates]
               → [HTTP: MongoDB — Store scraped profiles]
               → [AI: GPT-4o — Score & rank ALL candidates]
    → [Wait: Human approval via dashboard]
    → [IF: Approved?]
        → YES: [HTTP: Flask API — Import new experts]
               → [HTTP: Flask API — Assign to project pipeline]
               → [Trigger: Email Outreach Workflow]
        → NO:  [HTTP: MongoDB — Archive rejected profiles]
```

### 4.3 Workflow 2: Automated Email Outreach

```
[Trigger: Expert assigned to project]
    → [HTTP: Fetch expert + project details]
    → [AI: Claude — Compose personalized email]
    → [HTTP: MongoDB — Save draft]
    → [Wait: Staff review via dashboard]
    → [IF: Edited by staff?]
        → YES: [HTTP: MongoDB — Update draft]
    → [HTTP: Resend API — Send email]
    → [HTTP: MongoDB — Log delivery status]
    → [Schedule: Wait 3 days]
    → [IF: Response received?]
        → Accept:  [Trigger: Scheduling Workflow]
        → Decline: [HTTP: Flask API — Update pipeline (declined)]
        → No response: [AI: Claude — Compose follow-up]
                        → [Loop back to Send email]
```

### 4.4 Workflow 3: Meeting Scheduling

```
[Trigger: Expert accepted invitation]
    → [HTTP: Fetch expert timezone + client POC timezone]
    → [Code: Calculate overlapping business hours]
    → [HTTP: Google Calendar — Check availability]
    → [Code: Propose 3 optimal time slots]
    → [HTTP: Zoom API — Generate meeting link]
    → [HTTP: Google Calendar — Create event + send invites]
    → [HTTP: Flask API — Create Engagement record]
    → [HTTP: Flask API — Update project pipeline (expert_scheduled)]
    → [HTTP/Email: Notify Hasamex staff]
```

### 4.5 Flask ↔ n8n Integration

**Flask fires webhooks to n8n:**

```python
# backend/services/automation.py
import requests
import os
import logging

logger = logging.getLogger(__name__)
N8N_BASE = os.getenv("N8N_WEBHOOK_BASE_URL", "http://localhost:5678")

def trigger_workflow(workflow_name: str, payload: dict):
    """Fire-and-forget webhook to n8n. Non-blocking."""
    url = f"{N8N_BASE}/webhook/{workflow_name}"
    try:
        requests.post(url, json=payload, timeout=5)
        logger.info(f"[automation] Triggered {workflow_name}")
    except Exception as e:
        logger.warning(f"[automation] Failed to trigger {workflow_name}: {e}")
```

**Usage in routes/projects.py:**

```python
from services.automation import trigger_workflow

@projects_bp.route('', methods=['POST'])
def create_project():
    # ... existing project creation logic ...
    db.session.commit()
    
    # Trigger AI pipeline
    trigger_workflow("new-project", {
        "project_id": project.project_id,
        "client_id": project.client_id,
        "title": project.title,
        "description": project.project_description,
        "sector": project.sector,
        "target_region": project.rel_target_region.name if project.rel_target_region else None,
    })
    
    return jsonify({'data': project.to_dict()}), 201
```

**n8n calls back to Flask API:**

```
n8n HTTP Request Node:
  Method: POST
  URL: {{$env.FLASK_API_URL}}/api/v1/experts
  Headers: Authorization: Bearer {{$env.FLASK_API_TOKEN}}
  Body: {expert profile data from Agent 2}
```

---

## 5. Semantic Search — pgvector Embeddings

### 5.1 How It Works

```
Expert Profile                    Project Requirements
     │                                   │
     ▼                                   ▼
[Concatenate text]              [Concatenate text]
  Title + Bio +                   Skills + Sectors +
  Sectors + Skills +              Description + 
  Employment History              Target Companies
     │                                   │
     ▼                                   ▼
[OpenAI text-embedding-3-small]  [OpenAI text-embedding-3-small]
     │                                   │
     ▼                                   ▼
[1536-dim vector]               [1536-dim vector]
     │                                   │
     ▼                                   ▼
[Store in pgvector]             [Cosine similarity search]
                                         │
                                         ▼
                                [Top 20-50 matches with scores]
```

### 5.2 Database Schema

```sql
-- Enable pgvector extension (one-time)
CREATE EXTENSION IF NOT EXISTS vector;

-- Expert embeddings table
CREATE TABLE expert_embeddings (
    id SERIAL PRIMARY KEY,
    expert_id UUID REFERENCES experts(id) ON DELETE CASCADE UNIQUE,
    embedding vector(1536) NOT NULL,
    source_text_hash VARCHAR(64) NOT NULL,  -- SHA-256; skip re-embed if unchanged
    model_version VARCHAR(50) DEFAULT 'text-embedding-3-small',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- HNSW index for fast approximate nearest neighbor search
CREATE INDEX idx_expert_embeddings_hnsw 
    ON expert_embeddings 
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Query: Find top 20 experts similar to project requirements
SELECT 
    e.id, e.expert_id, e.first_name, e.last_name,
    e.title_headline, e.primary_sector,
    1 - (ee.embedding <=> $1::vector) AS similarity_score
FROM expert_embeddings ee
JOIN experts e ON e.id = ee.expert_id
WHERE e.expert_status_id IS NOT NULL  -- only active experts
ORDER BY ee.embedding <=> $1::vector
LIMIT 20;
```

### 5.3 Python Service

```python
# backend/services/embeddings.py
import hashlib
import openai
import os
from extensions import db

openai.api_key = os.getenv("OPENAI_API_KEY")


def build_expert_text(expert) -> str:
    """Build a rich text representation for embedding."""
    parts = [
        expert.title_headline or "",
        expert.bio or "",
        expert.primary_sector or "",
        expert.company_role or "",
        expert.expert_function or "",
        expert.strength_topics or "",
        expert.employment_history or "",
        expert.region or "",
        f"{expert.years_of_experience or 0} years experience",
    ]
    return " | ".join([p for p in parts if p.strip()])


def get_embedding(text: str) -> list[float]:
    """Generate embedding via OpenAI API."""
    response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding


def sync_expert_embedding(expert):
    """Create or update embedding for a single expert."""
    text = build_expert_text(expert)
    text_hash = hashlib.sha256(text.encode()).hexdigest()
    
    # Check if embedding already exists and is up to date
    existing = db.session.execute(
        db.text("SELECT id, source_text_hash FROM expert_embeddings WHERE expert_id = :eid"),
        {"eid": expert.id}
    ).fetchone()
    
    if existing and existing.source_text_hash == text_hash:
        return  # No change, skip
    
    embedding = get_embedding(text)
    
    if existing:
        db.session.execute(
            db.text("""
                UPDATE expert_embeddings 
                SET embedding = :emb, source_text_hash = :hash, updated_at = NOW()
                WHERE expert_id = :eid
            """),
            {"emb": str(embedding), "hash": text_hash, "eid": expert.id}
        )
    else:
        db.session.execute(
            db.text("""
                INSERT INTO expert_embeddings (expert_id, embedding, source_text_hash)
                VALUES (:eid, :emb, :hash)
            """),
            {"eid": expert.id, "emb": str(embedding), "hash": text_hash}
        )
    
    db.session.commit()


def search_similar_experts(requirements_text: str, limit: int = 20) -> list[dict]:
    """Find experts similar to project requirements using vector search."""
    query_embedding = get_embedding(requirements_text)
    
    results = db.session.execute(
        db.text("""
            SELECT e.id, e.expert_id, e.first_name, e.last_name,
                   e.title_headline, e.primary_sector,
                   1 - (ee.embedding <=> :emb::vector) AS similarity_score
            FROM expert_embeddings ee
            JOIN experts e ON e.id = ee.expert_id
            ORDER BY ee.embedding <=> :emb::vector
            LIMIT :lim
        """),
        {"emb": str(query_embedding), "lim": limit}
    ).fetchall()
    
    return [
        {
            "id": r.id,
            "expert_id": r.expert_id,
            "name": f"{r.first_name} {r.last_name}",
            "title": r.title_headline,
            "sector": r.primary_sector,
            "similarity_score": round(float(r.similarity_score), 4)
        }
        for r in results
    ]
```

---

## 6. Integration with Existing Codebase

### 6.1 Backend Files — New & Modified

```
backend/
├── services/
│   ├── mailer.py                  # EXISTING — keep unchanged
│   ├── automation.py              # NEW — n8n webhook triggers
│   ├── embeddings.py              # NEW — pgvector embedding generation & search
│   └── mongo_client.py            # NEW — MongoDB connection + helpers
│
├── routes/
│   ├── experts.py                 # MODIFY — add embedding sync on create/update
│   ├── projects.py                # MODIFY — add n8n webhook trigger on create
│   ├── automation.py              # NEW — approval queue, workflow status endpoints
│   ├── clients.py                 # EXISTING — no changes
│   ├── engagements.py             # EXISTING — no changes
│   ├── users.py                   # EXISTING — no changes
│   └── ...                        # EXISTING — no changes
│
├── models.py                      # MODIFY — add ExpertEmbedding SQLAlchemy model
├── config.py                      # MODIFY — add MONGO_URI, OPENAI_API_KEY, N8N config
├── requirements.txt               # MODIFY — add pymongo, openai
└── ...
```

### 6.2 Frontend Files — New

```
frontend/src/
├── pages/
│   ├── automation/
│   │   ├── AutomationDashboard.jsx    # NEW — monitor running workflows
│   │   ├── ApprovalQueue.jsx          # NEW — review AI-suggested expert matches
│   │   └── EmailDraftsPage.jsx        # NEW — review/edit AI-composed emails
│   └── ...                            # EXISTING — no changes
│
├── components/
│   ├── automation/
│   │   ├── WorkflowStatusCard.jsx     # NEW — workflow status badges
│   │   ├── ExpertMatchCard.jsx        # NEW — AI match score display (0-100)
│   │   └── ApprovalActions.jsx        # NEW — approve/reject/edit buttons
│   └── ...                            # EXISTING — no changes
│
└── api/
    ├── automation.js                   # NEW — automation API client
    └── ...                            # EXISTING — no changes
```

### 6.3 New Configuration Entries

```python
# Addition to backend/config.py

# MongoDB (for AI data only — not replacing PostgreSQL)
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
MONGO_DB_NAME = os.getenv('MONGO_DB_NAME', 'hasamex_ai')

# OpenAI (for embeddings + structured extraction)
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

# Anthropic (for project analysis + email composition)
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

# n8n Orchestration
N8N_WEBHOOK_BASE_URL = os.getenv('N8N_WEBHOOK_BASE_URL', 'http://localhost:5678')

# ProxyCurl (LinkedIn data)
PROXYCURL_API_KEY = os.getenv('PROXYCURL_API_KEY')
```

### 6.4 MongoDB Client Service

```python
# backend/services/mongo_client.py
import os
from pymongo import MongoClient

_client = None
_db = None

def get_mongo_db():
    """Singleton MongoDB connection."""
    global _client, _db
    if _db is None:
        uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
        db_name = os.getenv('MONGO_DB_NAME', 'hasamex_ai')
        _client = MongoClient(uri)
        _db = _client[db_name]
        # Create indexes on first connection
        _db.scraped_profiles.create_index("linkedin_url", unique=True)
        _db.scraped_profiles.create_index("status")
        _db.scraped_profiles.create_index("project_trigger_id")
        _db.agent_execution_logs.create_index([("created_at", -1)])
        _db.agent_execution_logs.create_index("project_id")
        _db.email_drafts.create_index("project_id")
        _db.email_drafts.create_index("expert_id")
        _db.email_drafts.create_index("status")
    return _db

def get_scraped_profiles():
    return get_mongo_db().scraped_profiles

def get_agent_logs():
    return get_mongo_db().agent_execution_logs

def get_email_drafts():
    return get_mongo_db().email_drafts
```

---

## 7. Implementation Roadmap — 4 Phases, 16 Weeks

### Phase 1: Foundation (Weeks 1-4)

| # | Task | Details | Days |
|---|------|---------|------|
| 1.1 | Set up n8n (Docker) | Self-hosted instance, PostgreSQL backend, basic auth | 2 |
| 1.2 | Set up MongoDB Atlas | Free tier cluster, connection from Flask | 1 |
| 1.3 | Install pgvector extension | `CREATE EXTENSION vector;` + create `expert_embeddings` table | 1 |
| 1.4 | Create `embeddings.py` service | OpenAI embedding generation + pgvector queries | 2 |
| 1.5 | Batch embed existing experts | Generate embeddings for all ~100+ existing experts | 2 |
| 1.6 | Create `automation.py` service | Flask → n8n webhook triggers | 2 |
| 1.7 | Build n8n → Flask callbacks | n8n HTTP nodes calling Flask API with auth | 2 |
| 1.8 | Build Agent 1: Project Analyzer | n8n workflow with Claude Sonnet 4 | 3 |
| 1.9 | Testing & validation | End-to-end test with sample project data | 3 |
| | **Phase 1 Total** | | **18 days** |

### Phase 2: Expert Discovery & Matching (Weeks 5-8)

| # | Task | Details | Days |
|---|------|---------|------|
| 2.1 | ProxyCurl integration | n8n HTTP node + API key, test with sample queries | 2 |
| 2.2 | Build Agent 2: Expert Discovery | Search → scrape → normalize → dedup workflow | 5 |
| 2.3 | Build Agent 3: Expert Matcher | Vector search + GPT-4o scoring workflow | 4 |
| 2.4 | MongoDB collections & indexes | `scraped_profiles`, `agent_execution_logs` with indexes | 1 |
| 2.5 | Approval Queue UI | React page: approve/reject/edit scraped profiles | 5 |
| 2.6 | Auto-import approved profiles | n8n → Flask API → INSERT into PostgreSQL experts | 2 |
| 2.7 | Testing & prompt tuning | Test with 3-5 real projects, tune prompts for accuracy | 3 |
| | **Phase 2 Total** | | **22 days** |

### Phase 3: Communication Automation (Weeks 9-12)

| # | Task | Details | Days |
|---|------|---------|------|
| 3.1 | Build Agent 4: Email Composer | Claude-powered personalized email drafts | 3 |
| 3.2 | Email Drafts UI | React page: review/edit/approve AI-composed emails | 3 |
| 3.3 | Resend webhook integration | Track delivery, opens, replies, bounces | 2 |
| 3.4 | Follow-up automation | n8n timed re-send workflow (3-day intervals) | 2 |
| 3.5 | Response parsing | AI-powered email classification (accept/decline/question) | 3 |
| 3.6 | Pipeline auto-update | Auto-move experts through stages based on email responses | 2 |
| 3.7 | Testing & email A/B testing | Test with real outreach, compare AI vs manual open rates | 3 |
| | **Phase 3 Total** | | **18 days** |

### Phase 4: Scheduling & Engagement (Weeks 13-16)

| # | Task | Details | Days |
|---|------|---------|------|
| 4.1 | Google Calendar API setup | OAuth2 + n8n Calendar node | 3 |
| 4.2 | Zoom/Meet link generation | API integration for auto-generating meeting links | 2 |
| 4.3 | Build Agent 5: Scheduler | Timezone-aware slot proposal + booking workflow | 4 |
| 4.4 | Auto-create Engagement records | n8n → Flask API: create engagement on booking confirmed | 2 |
| 4.5 | Automation Dashboard UI | React page: monitor running workflows, success metrics | 3 |
| 4.6 | Real-time notifications | WebSocket or SSE for workflow status updates | 3 |
| 4.7 | End-to-end testing | Full pipeline: project → discovery → match → email → schedule | 4 |
| | **Phase 4 Total** | | **21 days** |

### Phase 5: Optimization (Ongoing)

| Task | Details |
|------|---------|
| Match quality feedback loop | Staff rates expert-project fit → feeds back to scoring prompts |
| Prompt optimization | A/B test agent prompts based on real outcomes |
| Analytics dashboard | Conversion rates, time-to-match, cost-per-engagement |
| Gradual auto-approval | Remove human checkpoints as accuracy exceeds 90% |
| Cost optimization | Batch API calls, cache embeddings, use cheaper models for simple tasks |

---

## 8. Cost, Risk & Security

### 8.1 Monthly Cost Estimate

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| n8n (Docker self-hosted) | On existing server | $0–$20 |
| OpenAI API (GPT-4o + embeddings) | Pay-as-you-go | $50–$150 |
| Anthropic API (Claude Sonnet 4) | Pay-as-you-go | $30–$100 |
| ProxyCurl | 100 credits/month | $49 |
| MongoDB Atlas | Free / Shared tier | $0–$25 |
| Redis (Docker self-hosted) | On existing server | $0 |
| Resend | Existing plan | $0–$20 |
| Google Calendar API | Free tier | $0 |
| Zoom API | Free/basic | $0 |
| **Total** | | **$130–$365/month** |

> **Compare to:** Hiring an additional analyst at $3,000–$5,000/month. The AI pipeline provides 24/7 automated operation at ~5-10% of the cost.

### 8.2 Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| LinkedIn scraping compliance | 🔴 High | Use ProxyCurl (compliant API); never direct scrape |
| AI hallucination in matching | 🟡 Medium | Human review checkpoints; confidence thresholds |
| Email deliverability | 🟡 Medium | SPF/DKIM setup; warm-up volume; bounce monitoring |
| Data privacy (GDPR/PDPA) | 🔴 High | Consent management; retention policies; right-to-erasure |
| API cost overrun | 🟡 Medium | Budget alerts; caching; batch operations |
| n8n workflow failures | 🟡 Medium | Error nodes; retry logic; Sentry alerting |
| Database risk | 🟢 Low | Hybrid approach — zero changes to existing PostgreSQL |
| Expert data quality | 🟡 Medium | AI validation + staff review step |

### 8.3 Security Measures

| Area | Requirement |
|------|------------|
| API Keys | Environment variables only; never in code; rotate quarterly |
| n8n Access | Internal network only; built-in auth; HTTPS |
| MongoDB | Authentication enabled; IP whitelist; TLS connections |
| PII (Expert data) | Encrypt at rest; limit access to authorized staff only |
| AI Prompt Security | Validate all inputs; prevent injection; sanitize user data |
| Audit Trail | All agent decisions logged in MongoDB with full traceability |

---

## Summary of Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Database** | Hybrid (PG + Mongo) | 3-4 day setup vs 6-8 week full rewrite; zero production risk |
| **Orchestration** | n8n (self-hosted) | Visual builder, native AI nodes, human approval gates |
| **AI Primary** | Claude Sonnet 4 | Best reasoning for analysis & writing |
| **AI Secondary** | OpenAI GPT-4o | Best structured JSON extraction & scoring |
| **Vector Search** | pgvector | Free, same DB, zero network hop |
| **Expert Sourcing** | ProxyCurl | Legal, structured, cost-effective |
| **Email** | Resend (existing) | Already integrated, keep current setup |
| **Deployment** | Same server (Docker Compose) | n8n + MongoDB + Redis alongside Flask |
