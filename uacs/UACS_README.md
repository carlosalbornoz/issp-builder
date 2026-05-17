# UACS Sub-Object Code Reference
**Source:** List_of_Sub-Object_Code (as of 2026-05-15)  
**Standard:** Unified Accounts Code Structure (UACS), Philippine Government

## Files

| File | Description | Size |
|------|-------------|------|
| `uacs_active.json` | Active entries only (1,262) — use for front-end development | 426 KB |
| `uacs_active.min.json` | Same, minified — use for front-end production bundles | 360 KB |
| `uacs_full.json` | All entries including 28 inactive codes | 437 KB |
| `uacs_codes.sql` | Full SQL schema + INSERT statements + views — use for back-end/database | 267 KB |
| `uacs_explorer.html` | Standalone browser-based hierarchy explorer — no server needed, just open it | 564 KB |
| `uacs.d.ts` | TypeScript type definitions + usage examples — only needed if using TypeScript | — |

## When to Use What

| Scenario | Files needed |
|----------|-------------|
| Front-end only (React, Vue, plain JS) | `uacs_active.min.json` |
| Front-end with TypeScript (Next.js, Angular) | `uacs_active.min.json` + `uacs.d.ts` |
| Back-end / database (Postgres, MySQL, SQLite*) | `uacs_codes.sql` |
| Full-stack app | `uacs_codes.sql` for DB, generate JSON from DB for front-end |
| Just browsing / reference | `uacs_explorer.html` |

*SQLite users: replace `SERIAL` with `INTEGER PRIMARY KEY AUTOINCREMENT` and remove the `LEFT()` call in the prefix index.

## Entry Structure

```json
{
  "uacs": "5020101000",
  "label": "Basic Salary",
  "classification": "Expenses",
  "sub_class": "Personnel Services",
  "group": "Salaries and Wages",
  "object_code": "Salaries and Wages - Regular",
  "sub_object_code": "Basic Salary"
}
```

## Classification Breakdown (Active)

| Classification | Count |
|---|---|
| Assets | 476 |
| Expenses | 530 |
| Liabilities | 53 |
| Revenue/Income | 198 |
| Equity | 5 |
| **Total** | **1,262** |

## Common App Patterns

### Front-end (JavaScript)
```js
// Load and build lookup
import uacs from './uacs_active.min.json';
const lookup = Object.fromEntries(uacs.map(e => [e.uacs, e]));

// Lookup by code
lookup['5020101000'].label  // → "Basic Salary"

// Search
uacs.filter(e => e.label.toLowerCase().includes('salary'))

// Filter by classification
uacs.filter(e => e.classification === 'Expenses')

// Filter by UACS prefix (e.g. all Personnel Services = 5020...)
uacs.filter(e => e.uacs.startsWith('5020'))
```

### Back-end (SQL)
```sql
-- Import
psql -U user -d mydb -f uacs_codes.sql       -- PostgreSQL
mysql -u user -p mydb < uacs_codes.sql        -- MySQL
sqlite3 mydb.db < uacs_codes.sql              -- SQLite (see note above)

-- Lookup by code
SELECT * FROM uacs_codes WHERE uacs = '5020101000';

-- Autocomplete search
SELECT uacs, label, classification FROM uacs_active
WHERE label ILIKE '%salary%' LIMIT 20;

-- Pre-built views: uacs_active, uacs_ps, uacs_mooe, uacs_co, uacs_summary
```
