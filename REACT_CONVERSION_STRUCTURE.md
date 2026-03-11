# React Conversion Structure (Hasamex Expert Database)

This document defines a **reusable React file structure**, **global styling approach**, and **API-driven pagination** plan (20 records per request) to convert `frontend-sample/index.html` into React.

---

## Goals

- **Reuse components** (buttons, inputs, modal, table, card grid, filter dropdowns).
- **Global CSS** (design tokens, base layout) + component-level styles.
- **Server-side search/filter/sort** (no heavy client filtering for production).
- **Pagination:** **20 experts per API call**.
- **Performance:** debounced search, cached queries, skeleton loaders.

---

## Recommended React Stack

- **React 18**
- **React Router**
- **TanStack Query** (server state, caching, pagination)
- Styling (pick one):
  - **Option A (fastest):** TailwindCSS + a small `globals.css` for tokens
  - **Option B:** CSS Modules + `src/styles/globals.css` for design system tokens

This structure works for both.

---

## Proposed Folder / File Tree

```text
src/
  app/
    App.tsx
    router.tsx
    providers.tsx               # QueryClientProvider, RouterProvider, etc.

  pages/
    experts/
      ExpertsPage.tsx           # main page mapping from index.html
      ExpertDetailPage.tsx      # optional route (modal can be replaced by a page later)
      ExpertCreatePage.tsx
      ExpertEditPage.tsx
      ImportExpertsPage.tsx

  components/
    layout/
      Header.tsx
      PageShell.tsx             # container, spacing, footer (optional)

    experts/
      ExpertsActionBar.tsx      # search + Filters button + Add/Import/Export
      ExpertsFiltersPanel.tsx   # panel wrapper + Clear all + Close
      FilterDropdown.tsx        # region/sector/status/employment dropdown with popover
      ExpertsTable.tsx
      ExpertsCardGrid.tsx
      ExpertCard.tsx
      ExpertModal.tsx           # view profile modal
      BulkActionsBar.tsx
      Pagination.tsx
      Skeletons.tsx

    ui/                         # reusable, app-wide components
      Button.tsx
      IconButton.tsx
      Input.tsx
      Checkbox.tsx
      Badge.tsx
      Modal.tsx
      DropdownPopover.tsx

  hooks/
    useDebouncedValue.ts
    useOutsideClick.ts

  api/
    http.ts                     # fetch/axios wrapper, base URL, interceptors
    experts.ts                  # API functions for experts
    lookups.ts                  # dropdown values if coming from API

  queries/
    expertsKeys.ts              # query key factory
    useExpertsQuery.ts          # list query (page/limit/search/filters)
    useExpertQuery.ts
    useExportExperts.ts
    useImportExperts.ts

  types/
    expert.ts
    api.ts

  styles/
    globals.css                 # global reset + tokens + typography
    components.css              # optional shared utility styles

  utils/
    excel.ts                    # export helpers (client-side) OR request server export
    format.ts
    cn.ts                       # className join helper if needed
```

---

## How `frontend-sample/index.html` maps to React

### Layout

- `header.header` → `components/layout/Header.tsx`
- `.container` + main spacing → `components/layout/PageShell.tsx`

### Experts Page (`pages/experts/ExpertsPage.tsx`)

This page composes:

- `ExpertsActionBar` (search + filter button + add/import/export)
- `ExpertsFiltersPanel` (expand/collapse)
  - four `FilterDropdown` components (Region, Sector, Status, Employment)
- `BulkActionsBar`
- `ExpertsTable` OR `ExpertsCardGrid` depending on view toggle
- `Pagination`
- `ExpertModal` (open when clicking a row/card)

---

## Global CSS / Design System

Put these in `src/styles/globals.css`:

- CSS variables for tokens (from `frontend-sample/styles.css`):
  - colors (`--color-black`, greys, accent)
  - typography (`--font-sans`, sizes)
  - radii/shadows/spacing
- Base resets
- Layout helpers (`.container` equivalent) OR use Tailwind container

Component-specific styling:
- **Tailwind:** keep global tokens + use utility classes in components
- **CSS Modules:** `ExpertsActionBar.module.css`, `ExpertCard.module.css`, etc.

---

## API Contract (Pagination = 20)

### Endpoint (list)

`GET /api/v1/experts?page=1&limit=20&search=...&region=...&primary_sector=...&expert_status=...&current_employment_status=...`

### Response

```json
{
  "data": [ /* experts */ ],
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

### Filters (multi-select)

Prefer comma-separated lists:

- `region=APAC,EMEA`
- `primary_sector=Energy,TMT`
- `expert_status=Lead,Active%20T%26Cs%20(Call%20Completed)`
- `current_employment_status=Currently%20Employed,Independent`

Backend should parse into arrays.

---

## TanStack Query Data Flow (20 per call)

### Query key design

```ts
['experts', { page, limit: 20, search, filters, sort }]
```

### Hook: `useExpertsQuery`

Inputs:
- `page` (1-based)
- `limit` fixed to `20`
- `search` (debounced 300–500ms)
- `filters` (arrays)
- `sort` (optional)

Behavior:
- keeps previous data during page changes (`keepPreviousData`)
- shows skeletons while fetching

---

## Component Contracts (high-level)

### `ExpertsActionBar`

Props:
- `search`, `onSearchChange`
- `onToggleFilters`, `activeFiltersCount`
- `onAdd`, `onImport`, `onExport`

### `ExpertsFiltersPanel`

Props:
- `open`, `onClose`, `onClearAll`
- `filters`, `setFilters`
- `lookups` (options) OR internally uses `useLookupsQuery`

### `FilterDropdown`

Props:
- `label`
- `options: string[]`
- `selected: string[]`
- `onChange(next: string[])`
- renders popover with search + scroll + checkbox list
- closes on outside click

### `Pagination`

Props:
- `page`, `totalPages`
- `onPageChange(nextPage)`
- uses `meta` from API

---

## Minimal State Model (in `ExpertsPage`)

Client/UI state:
- `view` = `'table' | 'cards'`
- `selectedIds: Set<string>` for bulk actions
- `filtersPanelOpen: boolean`

URL state (recommended):
- `page`, `search`, `filters` in querystring so back/forward works

Server state:
- experts list via TanStack Query

---

## Step-by-Step Conversion Plan

1. Create `globals.css` with tokens from `frontend-sample/styles.css`.
2. Build `Header` + `PageShell`.
3. Build `ExpertsPage` layout and plug in placeholders.
4. Implement `ExpertsActionBar` (debounced search).
5. Implement `ExpertsFiltersPanel` + `FilterDropdown` (multi-select).
6. Implement `useExpertsQuery` calling Flask API with `limit=20`.
7. Implement `ExpertsTable` + `ExpertsCardGrid` + `ExpertModal`.
8. Implement pagination using `meta` (page, total_pages).
9. Add Import/Export flows:
   - Import: `POST /api/v1/experts/import` (multipart)
   - Export: `GET /api/v1/experts/export?...` (download)

---

## Notes for Production

- Replace demo client-side filtering with server-side filters.
- Add proper empty states, skeletons, and error banners.
- Use cursor pagination if offsets become slow at very large volumes.

