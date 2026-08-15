# Vendor Globals Cleanup Analysis

> **Date:** 2026-07-05  
> **Context:** `vendor.d.ts` still declares ~60 legacy globals from the pre-migration era. The TS codebase has been largely migrated to ES modules, but the declarations linger — some are dead code, others mask real cross-module leakage.

---

## 1. Safe to Delete Immediately (28 declarations)

These have **zero references** in any TS file. They are either dead code or shadowed by local `const`/`let` declarations.

### Variables (7)

| Global | Reason |
|---|---|
| `END` | No references anywhere |
| `START` | No references anywhere |
| `CURRENCY_DISPLAY` | No references anywhere |
| `TEXT_REPLACEMENT_APPLIED` | No references anywhere |
| `TODAY` | Local `const TODAY` in 3 files; global never used |
| `TOMORROW` | Local `const TOMORROW` in 3 files; global never used |
| `VALOR_OPTIONS` | No references anywhere |

### Functions (10)

| Global | Reason |
|---|---|
| `_afterDragInnerExpense` | No references |
| `_buildDestinosObject` | No references |
| `_buildGastosObject` | No references |
| `_buildTripObject` | No references |
| `_descriptionSelectChangeAction` | No references |
| `_loadViewEmbedAction` | No references |
| `_setFirestoreData` | No references |
| `_unloadMedias` | No references |
| `_updateTikTokLinks` | No references |
| `openIndexPage` | No references |

### DOM-element Globals (9)

| Global | Reason |
|---|---|
| `div` | All real uses are `const div = getID(...)` locals |
| `link` | All real uses are local variables/parameters |
| `upload` | All real uses are `const upload = getID(...)` locals |
| `pin` | All real uses are locals; `export var PIN` in protected-data.ts shadows it |
| `PIN` | `export var PIN` and `export let PIN` in modules — module-scoped |
| `value` | All real uses are local variables/properties |
| `result` | All real uses are local variables |
| `settings` | All real uses are local variables |
| `get` | Always used as `import { get } from '.../database.js'` |

> **Action:** Delete all 28 declarations from `vendor.d.ts`. No code changes needed.

---

## 2. Already Migrated but Declaration Lingers (19 declarations)

These globals are **properly exported/imported as ES modules** in the TS source. The `declare var` in `vendor.d.ts` is now redundant — it exists only as a fallback for any unconverted JS file that might still reference them as bare globals.

| Global | Exported from | Imported by |
|---|---|---|
| `ACTIVE_CATEGORY` | `pages/destination/categories.ts` | `destination.ts` |
| `ACTIVE_DESTINATION` | `pages/trip-detail/categories/destination.ts` | `view.ts` |
| `ACTIVE_PLANNED_DESTINATION` | `pages/destination/edit-destination.ts` | `support/trip.ts` |
| `CONTENT` | `pages/destination/destination.ts` | (same module) |
| `DATABASE_EDITABLE_DOCUMENTS` | `data/firebase/database.ts` | `backup/restore.ts` |
| `FILTER_SORT_DATA` | `pages/destination/support/sort-and-filter/` | `filter.ts`, `content.ts`, `price-bucket.ts` |
| `FIRESTORE_EXPENSES_DATA` | `pages/edit-trip/edit-trip.ts` | `set-protected-data.ts`, `expenses.ts` |
| `FIRESTORE_EXPENSES_PROTECTED_NEW_DATA` | `pages/edit-trip/set-trip.ts` | `set-protected-data.ts` |
| `FIRESTORE_PROTECTED_DATA` | `edit-trip.ts`, `itinerary.model.ts`, `edit-listing.ts`, `itinerary.ts` | (module-level `var` in 4 files) |
| `FIRESTORE_PROTECTED_NEW_DATA` | `pages/edit-trip/set-trip.ts` | `set-protected-data.ts` |
| `EXPENSES_DATA` | `pages/expenses/expenses.ts` | `expense.model.ts`, `currency.ts`, `data.ts` |
| `LANGUAGES` | `i18n/translation.ts` | `edit-destination.ts`, `content.ts`, `description.ts` |
| `LOGO_DARK` / `LOGO_LIGHT` | `theme/visibility.ts` | `view.ts`, `theme.ts` |
| `MEDIA_HYPERLINKS` | `pages/destination/support/media-embed.ts` | `destination.ts`, `visibility.ts` |
| `MESSAGE_MODAL_OPEN` | `utils/messages.ts` | `view.ts`, `loading.ts` |
| `PLANNED_DESTINATION` | `pages/destination/support/trip.ts` | `destination.ts`, `sort-and-filter.ts` |
| `SCHEDULE_OPEN` | `pages/trip-detail/categories/itinerary-module/inner-itinerary.ts` | `itinerary-module.ts` |
| `THEME_COLOR` | `theme/colors.ts` | `visibility.ts`, `swiper.ts`, `theme.ts` |

And functions: `accommodationsAddListenerAction`, `addSetResponse`, `getDestinationsAccordionBodyHTML`, `setProtectedDataAndExpenses`, `transportationAddListenerAction`, `validatePinField` — all properly exported/imported.

> **Action:** These can be removed from `vendor.d.ts` **after** verifying that no unconverted `.js` file (e.g., in `functions/`, `scripts/`, or inline `<script>` tags in HTML) still references them as bare globals.

---

## 3. True Globals — Still Need Migration (13 issues in 9 items)

These are **actually used as bare globals** across module boundaries without proper imports. They represent real technical debt.

### 3a. Variable cross-module leakage (7)

| Global | Problem | Files involved |
|---|---|---|
| `CURRENT_CURRENCY` | Module-level `var` in `currency.ts`, used bare in `expense.model.ts` and `categories.ts` | `currency.ts`, `expense.model.ts`, `categories.ts` |
| `DEFAULT_CURRENCY` | Same pattern as above | `currency.ts`, `expense.model.ts` |
| `CURRENCY_CONVERSION` | Used bare in `expense.model.ts` (L41-58) — no import from `currency.ts` | `currency.ts`, `expense.model.ts` |
| `EXPENSES_CONVERTED` | Used bare in `expense.model.ts` (L129-219) and `categories.ts` — no import | `expense.model.ts`, `categories.ts` |
| `NEW_TRIP` | Module-level `var` in `edit-trip.ts`, used bare in `event-listeners.ts` L208 without import | `edit-trip.ts`, `event-listeners.ts` |
| `PERMISSIONS` | Module-level `var` in 3 files (`storage.ts`, `edit-listing.ts`, `edit-trip.ts`) — no centralized import | `storage.ts`, `edit-listing.ts`, `edit-trip.ts` |
| `TYPE` | `export var TYPE = "trips"` in `view.ts` — unclear if used elsewhere as bare global | `view.ts` |

### 3b. Function cross-module leakage (6)

| Global | Problem | Files involved |
|---|---|---|
| `applyExpenses` | Defined in `expenses.ts` (not exported), used bare in `currency.ts` L106 — no import | `expenses.ts`, `currency.ts` |
| `embedAfterLoadAction` | Defined in `embed.ts` (not exported), used bare in `expenses.ts` L140 — no import | `embed.ts`, `expenses.ts` |
| `sendHeightMessageToParent` | Defined in `embed.ts` (not exported), used bare in `expenses.ts` L243 — no import | `embed.ts`, `expenses.ts` |
| `buildCompartilhamentoObject` | Referenced in `edit-listing.ts` L130 — **not defined in any TS file!** Must come from legacy `<script>` tag | `edit-listing.ts` (consumer), unknown (provider) |
| `buildDestinosArray` | Referenced in `edit-listing.ts` L137 — same issue | `edit-listing.ts` (consumer), unknown (provider) |
| `buildImagemObject` | Referenced in `edit-listing.ts` L138 — same issue | `edit-listing.ts` (consumer), unknown (provider) |
| `buildLinksObject` | Referenced in `edit-listing.ts` L139 — same issue | `edit-listing.ts` (consumer), unknown (provider) |
| `getFormattedDate` | Referenced in `trip.model.ts` L46,50 — **not defined in any TS file!** | `trip.model.ts` (consumer), unknown (provider) |

---

## 4. Suggested Cleanup Prompts

The work naturally breaks into **3 prompts**:

---

### Prompt A: Delete dead declarations (~5 min)

> Delete 28 declarations from `vendor.d.ts` that have zero references in the TS codebase. Remove the 7 dead variables (`END`, `START`, `CURRENCY_DISPLAY`, `TEXT_REPLACEMENT_APPLIED`, `TODAY`, `TOMORROW`, `VALOR_OPTIONS`), the 10 dead functions (`_afterDragInnerExpense`, `_buildDestinosObject`, `_buildGastosObject`, `_buildTripObject`, `_descriptionSelectChangeAction`, `_loadViewEmbedAction`, `_setFirestoreData`, `_unloadMedias`, `_updateTikTokLinks`, `openIndexPage`), and all 9 DOM-element globals (`div`, `link`, `upload`, `pin`, `PIN`, `value`, `result`, `settings`, `get`). No other files need changes.

---

### Prompt B: Remove migrated declarations + verify JS fallback (~15 min)

> 1. Remove the 19 already-migrated declarations from `vendor.d.ts` (listed in Section 2 above).  
> 2. Before removal, search for each global name in all `.html` files under `public/` and `edit/`, and all `.js` files under `functions/` and `scripts/`, to confirm no unconverted JS still references them as bare globals.  
> 3. If any are found in legacy JS/HTML, add an `import` or keep only those specific declarations with a comment explaining why.

---

### Prompt C: Fix cross-module leakage (~30 min)

This is the real work. Fix the 13 true-global issues from Section 3:

1. **`CURRENT_CURRENCY` + `DEFAULT_CURRENCY` + `CURRENCY_CONVERSION`** — In `expense.model.ts`, add proper imports from `pages/expenses/support/currency.ts`. If circular dependency is a concern, extract these into a shared `models/currency-config.ts`.

2. **`EXPENSES_CONVERTED`** — In `expense.model.ts` and `categories.ts`, add proper imports from wherever it's defined.

3. **`NEW_TRIP`** — In `event-listeners.ts`, add `import { NEW_TRIP } from '../edit-trip/edit-trip.js'`.

4. **`PERMISSIONS`** — Centralize into a single module (e.g., `data/permissions.ts`), import from all 3 consumers.

5. **`TYPE`** — Audit whether any other file uses `TYPE` as a bare global. If yes, import it; if not, remove the `declare var` line.

6. **`applyExpenses` / `embedAfterLoadAction` / `sendHeightMessageToParent`** — In the defining files (`expenses.ts`, `embed.ts`), add `export` keyword. In the consuming files, add proper `import` statements.

7. **`buildCompartilhamentoObject` / `buildDestinosArray` / `buildImagemObject` / `buildLinksObject`** — These are referenced in `edit-listing.ts` but **not defined in any TS file**. Search for them in:
   - Legacy JS files under `public/assets/js/`
   - Inline `<script>` tags in `edit/listing.html`
   - The `functions/` directory
   
   Once found, either migrate them to a proper TS module or create stub implementations.

8. **`getFormattedDate`** — Referenced in `trip.model.ts` but not defined in TS. Check `utils/dates.ts` (the natural home). If it already exists there, just add the import. If not, implement or find it in legacy JS.

After all fixes, remove the remaining declarations from `vendor.d.ts`.

---

## 5. Summary

| Category | Count | Effort |
|---|---|---|
| ✅ Safe to delete now | 28 | Trivial |
| ⚠️ Migrated, verify JS fallback | 19 | Quick search |
| 🔴 True globals needing migration | 13 | Real work (~30 min) |
| **Total declarations in `vendor.d.ts`** | **~60** | |

After all 3 prompts are completed, `vendor.d.ts` should only contain the third-party library globals:
- `$`, `jQuery`, `Sortable`, `firebase`
- `AOS`, `bootstrap`, `Chart`, `GLightbox`, `instgrm`, `Isotope`, `Swiper`, `Typed`, `Waypoint`
- `dev` (DevHost)
- `Window` interface extension
