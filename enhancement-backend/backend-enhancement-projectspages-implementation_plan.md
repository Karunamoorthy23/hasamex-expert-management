# Projects Pages — API Call Optimization Plan

> **Goal**: Achieve production-level performance for the Projects module (`ProjectsPage`, `ProjectEditPage`, `ProjectDetails`) by eliminating client-side array filtering, preventing heavy 1000-record dropdown fetches, and shifting filter logic securely to the server.

---

## 1. Current State & Root Cause Analysis

### 1.1 ProjectsPage.jsx (List Page)

| # | API Call | Trigger | Issue |
|---|---------|---------|-------|
| 1 | `GET /clients?limit=1000` | Mount | 🔴 Downloads 1000 clients just to map `client_id` to `client_name` and build filter dropdowns. |
| 2 | `GET /users?limit=1000` | Mount | 🔴 Downloads 1000 users just to map `poc_user_id` to `user_name`. |
| 3 | `GET /projects?limit=1000` | Mount | 🔴 Downloads all projects in the database just to extract unique filter options (RA names, Months, Years). |
| 4 | `GET /projects?page=X&limit=20` | Dynamic | 🔴 Fetches only 20 rows from the backend, but then the frontend attempts to apply array filters (`.filter(...)`) on these 20 rows. **This breaks pagination completely**, as a filter might exclude all 20 rows, showing an empty page instead of pulling the next matching rows from the server. |

**Root Cause:**
* Server-side filtering is missing for RA names, Received Date months, and years.
* The frontend forces 3 massive payload downloads on initial load to build dictionary maps.

### 1.2 ProjectEditPage.jsx & ProjectCreatePage.jsx

| # | API Call | Trigger | Issue |
|---|---------|---------|-------|
| 1 | `GET /lookups` | Mount | Returns giant dictionaries of `hasamex_users` and `experts_codes`. |
| 2 | `GET /clients?limit=1000` | Mount | 🔴 Unnecessary full-table HTTP fetch just for dropdowns. |
| 3 | `GET /users?limit=1000` | Mount | 🔴 Unnecessary full-table HTTP fetch just for dropdowns. |
| 4 | `GET /projects/<id>` | Mount | ✅ OK. |

---

## 2. Proposed Production-Level Enhancements

### Phase 1: Backend — `GET /projects/summary`

**Endpoint: `backend/routes/projects.py`**
Create a new optimized endpoint purely for the frontend table.
* **Server-side Filtering:** Accepts `client_ids`, `ra_names`, `months`, and `years` via request parameters.
* **SQL Aggregation:** Converts month/year filters directly into SQL `extract(month from received_date)` queries, completely eliminating the need for the frontend to filter arrays locally.
* **Pre-Joined Lookups:** The JSON response will structurally include `"client_name"` and `"poc_user_name"` directly attached to each project dictionary.

### Phase 2: Backend — `GET /projects/filter-options`

**Endpoint: `backend/routes/projects.py`**
Returns distinct filter values in **a single lightweight call** (Replaces the 3x `limit=1000` fetches on page load):
* `client_names`: Extracted distinct names.
* `ra_names`: Extracted distinct strings from `client_solution_owner_names`.
* `months`: Extracted distinct months.
* `years`: Extracted distinct years.

### Phase 3: Backend — `GET /projects/form-lookups`

**Endpoint: `backend/routes/projects.py`**
Single consolidated endpoint for the `ProjectEditPage` and `ProjectCreatePage` UI.
Returns specifically tailored minimal JSON objects instead of 3 huge independent API lists:
```json
{
  "clients": [ {"id": 1, "name": "Acme Corp"} ],
  "users": [ {"id": 1, "name": "John Doe", "client_id": 1} ],
  "lookups": { "hasamex_users": [...], "experts_codes": [...] }
}
```

### Phase 4: Frontend — ProjectsPage.jsx

**Component: `frontend/src/pages/projects/ProjectsPage.jsx`**
* Destroy the entire client-side `.filter()` block. Send filter parameters directly to the new `fetchProjectSummary` wrapper.
* Remove `clientById` and `userById` mapping hooks, relying simply on the enriched data returned by the summary endpoint.
* Replace the `limit=1000` hooks with a single `fetchProjectFilterOptions` hook fired once on mount.

### Phase 5: Frontend — ProjectEditPage.jsx

**Component: `frontend/src/pages/projects/ProjectEditPage.jsx`**
* Consolidate fetching `clients`, `users`, and `lookups` into a single `Promise.all` calling the new `fetchProjectFormLookups()`.

---

## 3. Impact Analysis

| Page | Before | After | Improvement |
|------|--------|-------|-------------|
| **ProjectsPage** | 3 giant downloads + 1 breaking query | **2 optimized queries** | **95% memory + fully working pagination** |
| **ProjectEditPage** | 4 parallel HTTP requests | **2 parallel HTTP requests** | **50% bandwidth reduction** |
| **ProjectDetails** | 1 targeted request | 1 targeted request | No changes needed |

**Files Targetted For Modification:**
* `backend/routes/projects.py`
* `frontend/src/api/projects.js`
* `frontend/src/pages/projects/ProjectsPage.jsx`
* `frontend/src/pages/projects/ProjectEditPage.jsx`
* (We will also evaluate ProjectCreatePage and duplicate the optimized lookup fetching).
