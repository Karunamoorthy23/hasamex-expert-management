# Hasamex Expert Database (HEB) — Project Roadmap

**Document Version:** 1.0  
**Last Updated:** March 10, 2025  
**Tech Stack:** React.js + Flask + PostgreSQL

---

## Executive Summary

This roadmap outlines the architecture, development plan, and integration strategy for the Hasamex Expert Database MVP—a high-performance web application for managing expert profiles with search, filtering, bulk import/export, and email-ready export capabilities. The design follows the [Hasamex](https://www.hasamex.com/) visual identity: clean, professional, and corporate-industrial.

---

## Table of Contents

1. [Visual Identity & UI/UX](#1-visual-identity--uiux)
2. [Database Schema Design](#2-database-schema-design)
3. [API Documentation](#3-api-documentation)
4. [Frontend Component Hierarchy](#4-frontend-component-hierarchy)
5. [Integration Plan](#5-integration-plan)
6. [Data Flow Strategy](#6-data-flow-strategy)
7. [Development Phases](#7-development-phases)

---

## 1. Visual Identity & UI/UX

### 1.1 Design System (Hasamex Reference)

| Element | Specification |
|--------|---------------|
| **Layout** | Clean, professional, corporate-industrial aesthetic with structured grids |
| **Color Palette** | Black (#0a0a0a), White (#ffffff), Greys (#f5f5f5, #e5e5e5, #737373), Accent (subtle blue/grey for CTAs) |
| **Typography** | Modern sans-serif (e.g., Inter, DM Sans, or system-ui) — bold headings, light body text |
| **Components** | Minimalist line-art icons, card-based grids, clear borders/shadows |
| **Responsiveness** | Mobile-first, Tailwind CSS or Styled Components |

### 1.2 Key UI Patterns

- **Navigation:** Top bar with logo, nav links, and primary CTA (e.g., "Add Expert")
- **Data Display:** Table view (desktop) / Card view (mobile) with consistent row/card structure
- **Forms:** Clean labels, validation feedback, duplicate-warning modals
- **Loading States:** Skeleton loaders matching the grid/card layout
- **Empty States:** Clear messaging when no results match filters

---

## 2. Database Schema Design

### 2.1 Entity Relationship Diagram (Conceptual)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           HASAMEX EXPERT DATABASE (HEB)                          │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐         ┌──────────────────────┐
│       experts        │         │   expert_attachments  │         │   lookup_tables       │
├──────────────────────┤         ├──────────────────────┤         ├──────────────────────┤
│ id (PK)              │◄───────►│ id (PK)              │         │ id (PK)              │
│ expert_id (UNIQUE)   │         │ expert_id (FK)       │         │ category             │
│ salutation           │         │ file_type            │         │ value                │
│ first_name           │         │ file_url             │         │ display_order        │
│ last_name            │         │ created_at           │         └──────────────────────┘
│ primary_email        │         └──────────────────────┘         (Region, Sector, Status,
│ secondary_email      │                                           Employment Status, etc.)
│ primary_phone        │
│ secondary_phone      │
│ linkedin_url (UNIQUE)│
│ location             │
│ timezone             │
│ region (FK→lookup)   │
│ current_employment   │
│ seniority            │
│ years_of_experience  │
│ title_headline       │
│ bio                  │
│ employment_history   │
│ primary_sector       │
│ company_role         │
│ expert_function      │
│ strength_topics      │
│ currency             │
│ hourly_rate          │
│ hcms_classification  │
│ expert_status        │
│ notes                │
│ profile_pdf_url      │
│ last_modified        │
│ total_calls          │
│ project_id_added_to  │
│ created_at           │
│ updated_at           │
└──────────────────────┘
```

### 2.2 PostgreSQL Table Definitions

#### `experts`

| Column | Type | Constraints | Index |
|--------|------|-------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | PK |
| expert_id | VARCHAR(20) | UNIQUE, NOT NULL | UNIQUE, B-tree |
| salutation | VARCHAR(10) | | |
| first_name | VARCHAR(100) | NOT NULL | GIN (trgm) |
| last_name | VARCHAR(100) | NOT NULL | GIN (trgm) |
| primary_email | VARCHAR(255) | UNIQUE | UNIQUE, GIN (trgm) |
| secondary_email | VARCHAR(255) | | |
| primary_phone | VARCHAR(50) | | |
| secondary_phone | VARCHAR(50) | | |
| linkedin_url | VARCHAR(500) | UNIQUE | UNIQUE, GIN (trgm) |
| location | VARCHAR(255) | | GIN (trgm) |
| timezone | VARCHAR(100) | | |
| region | VARCHAR(50) | | B-tree |
| current_employment_status | VARCHAR(50) | | B-tree |
| seniority | VARCHAR(50) | | B-tree |
| years_of_experience | INTEGER | | |
| title_headline | VARCHAR(500) | | GIN (trgm) |
| bio | TEXT | | GIN (trgm) |
| employment_history | TEXT | | GIN (trgm) |
| primary_sector | VARCHAR(100) | | B-tree |
| company_role | VARCHAR(100) | | B-tree |
| expert_function | VARCHAR(100) | | B-tree |
| strength_topics | TEXT | | GIN (trgm) |
| currency | VARCHAR(10) | | |
| hourly_rate | DECIMAL(12,2) | | |
| hcms_classification | VARCHAR(50) | | |
| expert_status | VARCHAR(50) | | B-tree |
| notes | TEXT | | |
| profile_pdf_url | VARCHAR(500) | | |
| last_modified | TIMESTAMP | | |
| total_calls_completed | INTEGER | DEFAULT 0 | |
| project_id_added_to | VARCHAR(50) | | |
| created_at | TIMESTAMP | DEFAULT NOW() | |
| updated_at | TIMESTAMP | DEFAULT NOW() | |

**Indexes for Performance:**

```sql
-- Full-text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_experts_search ON experts USING GIN (
  (first_name || ' ' || last_name || ' ' || COALESCE(title_headline, '') || ' ' || COALESCE(primary_sector, '') || ' ' || COALESCE(location, '') || ' ' || COALESCE(linkedin_url, '')) gin_trgm_ops
);

-- Filter columns
CREATE INDEX idx_experts_region ON experts(region);
CREATE INDEX idx_experts_primary_sector ON experts(primary_sector);
CREATE INDEX idx_experts_expert_status ON experts(expert_status);
CREATE INDEX idx_experts_employment_status ON experts(current_employment_status);
CREATE INDEX idx_experts_updated_at ON experts(updated_at DESC);
```

#### `expert_attachments` (optional, for file uploads)

| Column | Type | Constraints |
|--------|------|-------------|
| id | UUID | PK |
| expert_id | UUID | FK → experts.id |
| file_type | VARCHAR(20) | e.g., 'pdf' |
| file_url | VARCHAR(500) | |
| created_at | TIMESTAMP | DEFAULT NOW() |

#### `lookup_tables` (dropdown values)

| Column | Type | Constraints |
|--------|------|-------------|
| id | SERIAL | PK |
| category | VARCHAR(50) | e.g., 'region', 'primary_sector' |
| value | VARCHAR(100) | |
| display_order | INTEGER | |

**Dropdown values from Excel:** Region, Current Employment Status, Expert Status, Primary Sector, Currency, Seniority, Company Role, Expert Function.

---

## 3. API Documentation

### 3.1 Base URL

```
/api/v1
```

### 3.2 Core Endpoints

#### Experts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/experts` | List experts with pagination, search, filters |
| GET | `/api/v1/experts/:id` | Get single expert by UUID |
| POST | `/api/v1/experts` | Create new expert |
| PUT | `/api/v1/experts/:id` | Update expert |
| DELETE | `/api/v1/experts/:id` | Delete expert (optional) |

#### Query Parameters for `GET /api/v1/experts`

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | int | 1 | Page number (1-based) |
| limit | int | 20 | Items per page (max 100) |
| search | string | | Search across name, title, sector, location, LinkedIn |
| region | string | | Filter by region |
| primary_sector | string | | Filter by sector |
| expert_status | string | | Filter by status |
| current_employment_status | string | | Filter by employment |
| sort_by | string | updated_at | Sort field |
| sort_order | string | desc | asc \| desc |

#### Response Format (List)

```json
{
  "data": [
    {
      "id": "uuid",
      "expert_id": "EX-00001",
      "first_name": "Syamal",
      "last_name": "Ram Kishore",
      "primary_email": "syamalram@gmail.com",
      "linkedin_url": "https://linkedin.com/in/...",
      "primary_sector": "Healthcare & Life Sciences",
      "region": "APAC",
      "expert_status": "Active T&Cs (Call Completed)",
      "title_headline": "Co-Founder & Partner..."
    }
  ],
  "meta": {
    "total_records": 150,
    "current_page": 1,
    "total_pages": 8,
    "limit": 20,
    "has_next": true,
    "has_prev": false
  }
}
```

#### Bulk Import / Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/experts/import` | Bulk import from Excel (multipart/form-data) |
| GET | `/api/v1/experts/export` | Export experts as Excel (same format as HEB) |

**Import:** Accept `.xlsx` file, validate rows, return summary (success count, errors, duplicate warnings).

**Export:** Same columns as `Test Hasamex Expert Database (HEB).xlsx` — Current DB sheet format.

#### Lookups

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/lookups` | Get all dropdown values by category |
| GET | `/api/v1/lookups/:category` | Get values for one category (e.g., region, primary_sector) |

#### Email-Ready Export

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/experts/email-export` | Generate email-ready view for selected expert IDs |

**Request body:** `{ "expert_ids": ["uuid1", "uuid2"] }`  
**Response:** Formatted HTML or structured JSON for email template.

---

## 4. Frontend Component Hierarchy

### 4.1 Structure

```
App
├── Layout
│   ├── Header (logo, nav, Add Expert CTA)
│   ├── Main
│   └── Footer (optional)
├── Routes
│   ├── / (ExpertListPage)
│   │   ├── SearchBar (debounced)
│   │   ├── FilterBar (Region, Sector, Status, Employment)
│   │   ├── ExpertTable | ExpertCardGrid (toggle view)
│   │   │   └── ExpertRow | ExpertCard (skeleton variant)
│   │   ├── Pagination
│   │   └── BulkActions (Select, Email Export, Export Excel)
│   ├── /experts/new (AddExpertPage)
│   │   └── ExpertForm
│   ├── /experts/:id (ExpertDetailPage)
│   │   ├── ExpertProfile (read view)
│   │   ├── EditExpertModal | EditExpertPage
│   │   │   └── ExpertForm
│   │   └── LinkedInButton, ProfilePDFLink
│   └── /import (BulkImportPage)
│       └── FileUpload + ImportResults
└── Providers (TanStack Query, Router)
```

### 4.2 State Management for Pagination

- **TanStack Query (React Query):** Manages server state, caching, and pagination.
- **Query keys:** `['experts', page, limit, search, filters]` — each combination = one cache entry.
- **No local filtering:** All filtering/sorting happens via API; frontend only displays `data` and `meta`.

### 4.3 Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| SearchBar | Debounced input → triggers new API request with `search` param |
| FilterBar | Dropdowns for region, sector, status, employment → update query params |
| ExpertTable | Renders `data` from API, supports row selection for bulk actions |
| Pagination | Uses `meta.total_pages`, `meta.current_page` → navigate via `page` param |
| ExpertForm | Add/Edit form with validation (email, URL, duplicate check) |
| SkeletonLoader | Placeholder grid/table matching layout during loading |

---

## 5. Integration Plan

### 5.1 React ↔ Flask Communication

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           REACT FRONTEND                                     │
│  ┌─────────────┐   ┌─────────────────────────────────────────────────────┐  │
│  │ User Action │──►│ TanStack Query (useQuery / useMutation)              │  │
│  └─────────────┘   │ - Query keys: [page, filters, search]                │  │
│                    │ - Automatic refetch on param change                  │  │
│                    └──────────────────────┬──────────────────────────────┘  │
└───────────────────────────────────────────┼────────────────────────────────┘
                                            │ HTTP (fetch / axios)
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLASK API                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Routes: /api/v1/experts, /experts/:id, /import, /export               │   │
│  │ - Parse query params (page, limit, search, filters)                   │   │
│  │ - SQLAlchemy ORM queries with filters + pagination                    │   │
│  │ - Return JSON with data + meta                                        │   │
│  └──────────────────────────────────────┬────────────────────────────────┘   │
└────────────────────────────────────────┼────────────────────────────────────┘
                                         │ SQLAlchemy
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           POSTGRESQL                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 CORS & Environment

- Flask: Enable CORS for frontend origin (e.g., `http://localhost:3000`).
- Environment variables: `DATABASE_URL`, `UPLOAD_FOLDER`, `SECRET_KEY`.

### 5.3 File Storage

- **Profile PDF:** Store URL (e.g., Zoho WorkDrive) or upload to local/S3 path.
- **Bulk Import:** Temporary upload → parse with `openpyxl`/`pandas` → validate → insert/update.

---

## 6. Data Flow Strategy

### 6.1 Debounced Search

```javascript
// 300–500ms debounce on search input
const debouncedSearch = useDebouncedCallback((value) => {
  setSearchParams(prev => ({ ...prev, search: value, page: 1 }));
}, 400);
```

- Prevents API calls on every keystroke.
- Resets to page 1 when search changes.

### 6.2 Loading States

- Use TanStack Query's `isLoading` / `isFetching` to show skeleton loaders.
- Skeleton layout matches ExpertTable/ExpertCard grid.

### 6.3 Duplicate Handling

- On Add/Edit: API checks `linkedin_url` and `primary_email` against existing records.
- Returns `409 Conflict` or `{ duplicate: true, existing_id: "..." }` for frontend to show warning modal.

---

## 7. Development Phases

### Phase 1: Foundation (Days 1–2)

| Task | Deliverable |
|------|-------------|
| PostgreSQL schema + migrations | `experts`, `lookup_tables` tables |
| Flask app structure | Blueprints, config, CORS |
| Seed 10 experts | From HEB Excel |
| GET /api/v1/experts (pagination, search, filters) | Working list endpoint |
| GET /api/v1/lookups | Dropdown data |

### Phase 2: CRUD & UI (Days 2–3)

| Task | Deliverable |
|------|-------------|
| POST/PUT /api/v1/experts | Create, update with validation |
| React app + routing | Layout, Hasamex-style theme |
| ExpertListPage | Search, filters, table/cards, pagination |
| AddExpertPage, ExpertForm | Add with validation |
| ExpertDetailPage, EditExpertModal | View, edit, LinkedIn/PDF links |

### Phase 3: Bulk & Export (Days 3–4)

| Task | Deliverable |
|------|-------------|
| POST /api/v1/experts/import | Excel bulk import (HEB format) |
| GET /api/v1/experts/export | Excel export (same format) |
| BulkImportPage | File upload, results display |
| Bulk select + Email Export | Select experts → email-ready view |

### Phase 4: Polish (Day 4–5)

| Task | Deliverable |
|------|-------------|
| Skeleton loaders | Match grid/table layout |
| Duplicate warning modal | On add/edit |
| Mobile responsiveness | Tailwind breakpoints |
| Architecture note + run instructions | README, .env.example |

---

## Appendix A: Excel Column Mapping (HEB Format)

| Excel Column | DB Column |
|--------------|-----------|
| S.No | (internal/display only) |
| Salutation | salutation |
| Expert ID | expert_id |
| First Name | first_name |
| Last Name | last_name |
| Primary Email 1 | primary_email |
| Secondary Email | secondary_email |
| Primary Phone 1 | primary_phone |
| Secondary Phone 1 | secondary_phone |
| LinkedIn URL | linkedin_url |
| Location | location |
| Timezone | timezone |
| Region | region |
| Current Employment Status | current_employment_status |
| Seniority | seniority |
| Years of Experience | years_of_experience |
| Title / Headline | title_headline |
| BIO | bio |
| Employment History | employment_history |
| Primary Sector | primary_sector |
| Company Role | company_role |
| Expert Function | expert_function |
| Strength Topics | strength_topics |
| Currency | currency |
| Hourly Rate | hourly_rate |
| HCMS Classification | hcms_classification |
| Expert Status | expert_status |
| Last Modified | last_modified |
| Project ID Added To | project_id_added_to |
| Total Calls Completed | total_calls_completed |
| Payment Details | (optional, can add column) |
| Link to Profile PDF | profile_pdf_url |
| Events Invited To | (optional) |
| Notes | notes |

---

## Appendix B: Suggested Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TanStack Query, React Router, Tailwind CSS |
| Backend | Flask, Flask-SQLAlchemy, Flask-CORS |
| Database | PostgreSQL 14+ |
| Excel | openpyxl (read/write), pandas (processing) |
| Validation | Pydantic or marshmallow |

---

*This roadmap aligns with the project requirements document and the Test Hasamex Expert Database (HEB) Excel structure. Adjust phases and scope as needed for the 1–3 day suggested effort.*
