# Multi-person Expenses Overhaul (F071)

Date: 2026-08-22
Scope: Edit trip page + Expenses page/view + Database migration.

## Goals

1. **Edit trip page**
   - Each expense can have an optional **link**.
   - Each expense has a **payer** (`person`, single) plus **split-with people** (`people`, multi-select checkboxes).
   - New **Shopping** expense type.
   - Improved item rendering: show price per item, subtotal per type group, and total per category (preTrip / duringTrip). Drag keeps working.

2. **Expenses page / View**
   - **View modes**: unified (all) or a single traveler (filter).
   - **Split equally**: when an expense has `people`, each associated person's share = `price / people.length`.
   - **Clickable links** in the table rows.
   - **Auto-scroll** when content is too tall.

3. **Database**
   - Migration 20 adds `link: ''` and `people: []` to every expense entry (public + protected docs), idempotent + dry-run.

## Data model

```ts
// ExpenseEntry (expenses/{tripId} preTrip/duringTrip, + protected variant)
{
  name: string,
  type: string,            // i18n key or custom string
  price: number,
  currency: string,
  person: string,          // payer traveler ID (existing, kept)
  people?: string[],       // NEW: traveler IDs that split the cost
  link?: string,           // NEW: optional URL
}
```

## Files

### Edit trip page
- `public/assets/ts/pages/edit-trip/categories/expenses.ts`
  - `getInnerExpenseContent`: add Shopping option, Split-with checkbox list, Link input.
  - `openInnerExpense`: populate new fields.
  - `saveInnerExpense`: persist `people` + `link`.
  - `loadExpensesHTML` / `buildInnerExpense`: show price per item + subtotal per type + category total; keep drag.
- `public/assets/css/edit/edit.css` — styles for item price, subtotals, category totals, checkbox list, link input.
- `public/edit/trip.html` — no structural change needed (containers already exist).

### Expenses page / view
- `public/assets/ts/models/expense.model.ts`
  - `getExpenseShare(expense)` → 1 / people.length (or 1).
  - `isExpenseForPerson(expense, personId)`.
  - `getEffectiveExpensesList(type)` → filtered + share-adjusted when a traveler filter is active.
  - `calculateConvertedExpenses` reads the effective list.
  - `processConvertedTravelerExpenses` splits equally via `getExpenseShare`.
- `public/assets/ts/pages/expenses/mount.ts`
  - `ACTIVE_PERSON` state + traveler view selector (render + listener).
- `public/assets/ts/pages/expenses/support/data.ts`
  - Fix `EXPENSES_DATA?.people?.[item.person]` → `EXPENSES_DATA?.travelers?.[item.person]` (bug).
  - Render clickable link in rows (carry `link` through `updateItems`).
- `public/assets/ts/pages/expenses/categories.ts` — re-render when the traveler filter changes (via mount).
- `public/shared/expenses-content.html` — traveler view selector skeleton.
- `public/assets/css/expenses/expenses.css` — auto-scroll + link styles + selector.

### i18n
- `public/assets/json/languages/en.json` + `pt.json`
  - `trip.expenses.shopping`, `trip.expenses.link`, `trip.expenses.split_with`, `trip.expenses.all`, `trip.expenses.people`, `labels.open_link` (or reuse).

### Database
- `functions/src/migrations/20-migrate-expense-fields.ts`
- Register `migrateExpenseFields` in `functions/src/index.ts` (temporary, to run once).

## Validation (done)
- `npm run typecheck` ✅
- `npm run build` ✅ (esbuild + partials + iconify bundle + tsc)
- `npm --prefix functions run build` ✅
- Emulator end-to-end: seeded legacy expenses (public + protected), dry-run, apply, re-run → idempotent (`entriesUpdated 0` on re-run), all original fields preserved.

> ⚠️ **Firestore gotcha:** you cannot update array elements by index via dot-path
> (`preTrip.0.link`) — Firestore converts the array into a map and drops the
> other fields. The migration therefore reads each `preTrip`/`duringTrip` array,
> patches the entries, and writes the whole array back.

## Production run (when deploying)
```bash
# 1. Temporarily re-register in functions/src/index.ts:
#    import * as m from './migrations/20-migrate-expense-fields';
#    export const migrateExpenseFields = m.migrate;
# 2. Deploy functions
firebase deploy --only functions:migrateExpenseFields
# 3. Dry-run, then apply
curl "https://<region>-trip-viewer-prd.cloudfunctions.net/migrateExpenseFields?dryRun=true"
curl "https://<region>-trip-viewer-prd.cloudfunctions.net/migrateExpenseFields"
# 4. Remove the registration from index.ts and commit
```

## Tasks / README
- Feature **F071** (Multi-person expenses) — move from Medium Priority to Done when complete.
