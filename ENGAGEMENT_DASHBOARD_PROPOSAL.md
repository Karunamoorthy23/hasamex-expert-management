# Engagement Dashboard Technical Proposal

This document outlines the recommended technical approach for building the new Engagement Dashboard feature. The proposal follows a clean, scalable, and production-ready architecture, as would be implemented by an experienced full-stack development team.

## 1. Database Design

After analyzing the existing schema (`projects`, `clients`, `users`, `experts`), and the extensive list of new financial and logistical fields required, we strongly recommend the creation of a new, dedicated `engagements` table.

### 1.1. Recommendation: Create a New `engagements` Table

**Reasoning:**

*   **Centralization:** An engagement is a core business concept representing a billable interaction. It deserves its own dedicated table to act as the single source of truth.
*   **Clarity & Maintainability:** Co-locating all engagement-specific fields (especially the ~25 new financial and payment-related fields) in one table makes the schema cleaner and easier to understand than extending several other tables.
*   **Performance:** For a read-heavy dashboard, having a central, indexed `engagements` table is more performant. It allows for simpler queries with predictable `JOIN` patterns, rather than complex, multi-level joins across extended tables.
*   **Scalability:** As your business grows, the number of engagements will likely grow faster than the number of projects or experts. A separate table allows this data to scale independently without impacting the performance of other core tables.

### 1.2. Proposed `engagements` Table Schema

The new table will store all data unique to a single expert engagement and link to other tables via foreign keys.

```sql
CREATE TABLE engagements (
    -- Core Identifiers
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Foreign Keys to Core Entities
    project_id INTEGER NOT NULL REFERENCES projects(project_id),
    expert_id UUID NOT NULL REFERENCES experts(id),
    client_id INTEGER NOT NULL REFERENCES clients(client_id),
    poc_user_id INTEGER REFERENCES users(user_id), -- Client-side PoC
    call_owner_id INTEGER REFERENCES hasamex_users(id), -- Internal Hasamex owner

    -- Core Engagement Details
    call_date TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_call_duration_mins INTEGER,
    engagement_method_id INTEGER REFERENCES lk_engagement_methods(id),
    notes TEXT,
    transcript_link_folder VARCHAR(512),

    -- Client-Side Financials
    client_rate NUMERIC(12, 2),
    client_currency_id INTEGER REFERENCES lk_currencies(id),
    discount_offered_percent NUMERIC(5, 2) DEFAULT 0,
    -- Calculated Fields (can be stored or calculated on-the-fly)
    billable_client_amount_usd NUMERIC(12, 2),

    -- Expert-Side Financials
    expert_rate NUMERIC(12, 2),
    expert_currency_id INTEGER REFERENCES lk_currencies(id),
    -- Calculated Fields
    prorated_expert_amount_base NUMERIC(12, 2),
    prorated_expert_amount_usd NUMERIC(12, 2),

    -- Margin/Profitability (Calculated)
    gross_margin_percent NUMERIC(5, 2),
    gross_profit_usd NUMERIC(12, 2),

    -- Expert Payment Lifecycle
    expert_post_call_status_id INTEGER REFERENCES lk_post_call_statuses(id),
    expert_payment_due_date DATE,
    actual_expert_payment_date DATE,
    expert_payment_status_id INTEGER REFERENCES lk_payment_statuses(id),
    expert_paid_from VARCHAR(100),
    expert_payout_ref_id VARCHAR(255),

    -- Client Invoicing Lifecycle
    client_invoice_number VARCHAR(100),
    client_invoice_date DATE,
    client_payment_received_date DATE,
    client_payment_received_account VARCHAR(100),

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX idx_engagements_project_id ON engagements(project_id);
CREATE INDEX idx_engagements_expert_id ON engagements(expert_id);
CREATE INDEX idx_engagements_call_date ON engagements(call_date DESC);
CREATE INDEX idx_engagements_payment_status ON engagements(expert_payment_status_id);
```

### 1.3. New Lookup Tables

To maintain normalization, we will create the following new lookup tables for dropdowns and consistent filtering:

*   `lk_engagement_methods` (e.g., 'Phone Call', 'Video Conference')
*   `lk_post_call_statuses` (e.g., 'Pending', 'Completed', 'N/A')
*   `lk_payment_statuses` (e.g., 'Pending', 'Paid', 'Overdue', 'Failed')

## 2. Backend API Design (Flask)

We will create a new, dedicated blueprint for engagements.

### 2.1. New Blueprint: `engagements_bp`

A new file, `backend/routes/engagements.py`, will be created to house all API logic related to engagements.

### 2.2. Primary Endpoint: `GET /api/v1/engagements`

This will be the workhorse endpoint for the dashboard, designed for efficient data retrieval with full support for filtering, sorting, and pagination.

**Query Strategy:**

*   The primary query will be on the `engagements` table.
*   It will use `LEFT JOIN`s to `projects`, `experts`, `clients`, `users`, and the new lookup tables to fetch related data (names, titles, statuses, etc.).
*   SQLAlchemy's `selectinload` or `joinedload` options will be used to prevent N+1 query problems and ensure efficient data fetching.

**Supported Query Parameters:**

*   **Pagination:** `?page=1&limit=25`
*   **Sorting:** `?sort_by=call_date&order=desc`
*   **Filtering:** A comprehensive set of filters will be supported (e.g., `?project_id=...`, `?expert_id=...`, `?expert_payment_status=Pending`, `?call_date_start=...&call_date_end=...`)

**Sample Response Structure:**

```json
{
    "data": [
        {
            "engagement_id": 101,
            "month": "2024-05",
            "received_date": "2024-05-01",
            "call_date": "2024-05-15T14:00:00Z",
            "project_id": "P-001",
            "project_name": "Market Analysis for AI Tools",
            "expert_name": "Dr. Jane Doe",
            "gross_profit_usd": 1500.00,
            "expert_payment_status": "Pending",
            // ... all other 50+ fields
        }
    ],
    "meta": {
        "total_records": 150,
        "current_page": 1,
        "total_pages": 6,
        "limit": 25
    }
}
```

## 3. Frontend Design (React)

The frontend will be structured into modular, reusable components for a clean and maintainable implementation.

### 3.1. Recommended Component Structure

*   `EngagementDashboardPage.jsx`: The main container component. It will manage the overall state (filters, sorting, pagination) and orchestrate data fetching.
*   `EngagementTable.jsx`: A highly reusable and performant data grid component. We recommend using a headless table library like **TanStack Table** for its flexibility and powerful features out-of-the-box (sorting, filtering, column visibility, etc.).
*   `EngagementFilters.jsx`: A dedicated component containing all filter controls (date range pickers, searchable dropdowns for experts/projects, status selectors).
*   `Pagination.jsx`: A standard pagination control component.

### 3.2. State and Data Fetching

*   **Server State Management:** We will use **TanStack Query (React Query)** to manage all interactions with the backend API. This is a best practice for data-heavy applications.
*   **`useQuery` Hook:** The `EngagementDashboardPage` will use the `useQuery` hook to fetch data from the `/api/v1/engagements` endpoint.
    *   The query key will dynamically include the current page, filters, and sorting state (e.g., `['engagements', { page: 1, filters, sort }]`).
    *   TanStack Query will automatically handle caching, background refetching, and server-side state synchronization, leading to a highly responsive UI.
*   **Client State Management:** Standard React state (`useState`, `useReducer`) will be used to manage UI state, such as the current filter values and sort order.

### 3.3. User Experience (UX) Best Practices

*   **Loading States:** The table will display skeleton loaders (shimmering placeholders) while the initial data is being fetched, providing a smooth user experience.
*   **Debounced Filtering:** For any free-text search inputs (e.g., project name), input will be debounced to prevent firing API requests on every keystroke.
*   **Responsive Design:** The table will be designed to be fully responsive, potentially hiding less critical columns on smaller screens.

This proposal provides a comprehensive, professional, and scalable foundation for the Engagement Dashboard. It leverages modern best practices to ensure the final product is robust, maintainable, and performant.
