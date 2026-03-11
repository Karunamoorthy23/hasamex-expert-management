# Hasamex Expert Database — Frontend Sample

A static HTML/CSS/JS prototype for the Expert Database UI, following the [Hasamex](https://www.hasamex.com/) design system and the **Employee Management app** layout pattern (search, filters, Add, Import, Export in a single action bar above the table).

## Layout Reference

Based on `EmployeeDirectory.jsx` / `WorkforceActionBar.jsx`:
- **Action Bar** (within card, above table): Search | Filters | Add Expert | Import | Export
- **Card** wraps action bar + table + pagination
- Single-row toolbar with divider between filters and actions

## Files

| File | Purpose |
|------|---------|
| `index.html` | Main page (header, card with action bar + table, pagination, modal) |
| `styles.css` | Design system (colors, typography, action-bar, responsive) |
| `app.js` | Interactivity (debounced search, filters, Add/Import/Export, view toggle) |

## Run Locally

```bash
# From the frontend-sample directory
python -m http.server 8080
```

Then open http://localhost:8080 in your browser.

## Features Demonstrated

- **Action Bar** — Search (with clear) | Region, Sector, Status, Employment filters | Add Expert | Import | Export
- **Search** — Debounced (400ms) across name, title, sector, location, LinkedIn
- **Filters** — Dropdowns for Region, Sector, Status, Employment
- **Add Expert** — Primary CTA (placeholder for create form)
- **Import** — Bulk Excel import (placeholder)
- **Export** — Full export as Excel (placeholder)
- **View Toggle** — Table / Cards
- **Bulk Selection** — Checkboxes, Email View, Export Selected
- **Expert Detail Modal** — Click name; LinkedIn opens in new tab
- **Empty State** — When no results match
