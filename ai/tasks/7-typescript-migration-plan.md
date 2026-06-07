# 🟦 TypeScript Migration Plan

> **Created:** 2026-06-06
> **Based on:** `ai/analysis/framework-recommendation.md`
> **Goal:** Replace fragile runtime debugging with compile-time error detection. 5 prompts total.

---

## Why

| Before (JS) | After (TS + esbuild) |
|---|---|
| Edit → build → open browser → guess → repeat | Edit → build → **compiler tells you what's wrong** → fix → done |
| `export` inside function body = runtime crash | **Build fails** with exact file + line |
| Import of non-existent symbol = runtime crash | **Build fails** with exact file + line |
| Duplicate imports = runtime crash | **Build fails** with exact file + line |

---

## Prompt 1 — Rename, Configure, Compile & Fix All Errors

Rename all `.js` → `.ts`, wire up esbuild in the build pipeline, then run `npm run build` and fix every error the compiler reports — all in one pass.

### Context

- `esbuild` is already in `devDependencies` (`^0.25.0`)
- The build pipeline is `scripts/build/build.js` (copies `public/` → `dist/`, injects HTML partials)
- HTML pages reference `.js` files — the build will compile `.ts` → `.js` so HTML stays unchanged
- There are 122 `.js` files in `public/assets/js/` plus 2 root files (`index.js`, `firebase-config.js`)

### Task

**Step 1: Rename all `.js` → `.ts`**

```powershell
Get-ChildItem -Recurse -Filter *.js -Path public/assets/js | Rename-Item -NewName { $_.Name -replace '\.js$','.ts' }
```

Also rename root entry points:
```
index.js           → index.ts
firebase-config.js → firebase-config.ts
```

**Step 2: Create `tsconfig.json` at project root**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "bundler",
    "strict": false,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "skipLibCheck": true
  },
  "include": ["public/assets/js/**/*.ts", "public/*.ts"]
}
```

> `strict: false` means TS only catches structural errors (bad imports/exports, duplicate declarations), not missing types. Gradual typing comes later.

**Step 3: Update `scripts/build/build.js`**

Add a TypeScript compilation step after the HTML injection. The build currently does:
1. Copy `public/` → `dist/`
2. Inject HTML partials
3. Copy Firebase config files

Add step 2.5 — compile `.ts` → `.js`:

```js
// 2.5 Compile TypeScript → JavaScript
console.log("[build] Compiling TypeScript...");
const glob = require("glob");
const tsFiles = glob.sync("dist/assets/js/**/*.ts");
if (tsFiles.length > 0) {
  require("esbuild").buildSync({
    entryPoints: tsFiles,
    outdir: "dist/assets/js",
    format: "esm",
    target: "es2020",
    allowOverwrite: true,
    logLevel: "error",
  });
}

// Also compile root .ts files
const rootTsFiles = ["dist/index.ts", "dist/firebase-config.ts"].filter(f => require("fs").existsSync(f));
if (rootTsFiles.length > 0) {
  require("esbuild").buildSync({
    entryPoints: rootTsFiles,
    outdir: "dist",
    format: "esm",
    target: "es2020",
    allowOverwrite: true,
    logLevel: "error",
  });
}
```

Install `glob` if not present: `npm install -D glob`

**Step 4: Update HTML script references**

In `public/shared/scripts-vendor.html`, the line `<script type="module" src="{{ASSET_PREFIX}}index.js">` should become `<script type="module" src="{{ASSET_PREFIX}}index.js">` (unchanged — esbuild outputs `.js` files, so HTML references stay `.js`).

In `public/shared/scripts-core.html`, the line `<script type="module" src="{{ENTRY_POINT}}">` references page-specific entry points like `assets/js/pages/home/index-entry.js`. These will now be `.ts` source files but esbuild compiles them to `.js` — **no HTML changes needed**.

**Step 5: Build and fix all errors**

```powershell
npm run build
```

The compiler will list every broken import/export with exact file + line. Fix them all:

| Error type | Fix |
|---|---|
| `Module X has no exported member Y` | Either add `export` to Y in X, or remove the import |
| `Cannot redeclare block-scoped variable X` | Remove the duplicate import/declaration |
| `File is not a module` | Add `export {}` or fix a missing import |
| `export` inside function body | Remove the invalid `export` (was `fix-imports.py` garbage) |

**Do NOT just suppress errors.** Fix each one properly so the file's dependency graph is correct.

### Validation
- `npm run build` completes with **zero errors**
- `dist/assets/js/` contains compiled `.js` files
- `dist/index.js` and `dist/firebase-config.js` exist as compiled output

---

---

## 📊 TypeScript Compiler Audit (2026-06-06)

Ran `npx tsc --noEmit` on all 122 `.ts` files (in `public/assets/ts/`):

> **Note:** Root files `index.js` and `firebase-config.js` are deliberately kept as plain JS — they're Firebase SDK bootstrap/glue with no application logic. They don't benefit from type-checking.

| Metric | Count |
|--------|-------|
| Total `.ts` files | 122 |
| Files with errors | 95 |
| Clean files (0 errors) | 27 |
| Total errors | **1,511** |

### Error Categories (by frequency)

| # | Category | ~Count | % | Example |
|---|----------|--------|---|---------|
| 1 | **TS2339** — Property X doesn't exist on type Y | ~900 | 60% | `.value` / `.style` on `HTMLElement`, `.modulos` on `{}` |
| 2 | **TS2304** — Cannot find name X | ~200 | 13% | `DOCUMENT_ID`, `DESTINOS`, `$`, `Sortable` (undeclared globals) |
| 3 | **TS2554** — Wrong argument count | ~50 | 3% | `closeAllSelects()` called with 0 args, needs 1 |
| 4 | **TS2698** — Spread on non-object | ~30 | 2% | `.map(([id, v]) => ({ id, ...v }))` where v is `unknown` |
| 5 | **TS2362/2363** — Arithmetic on non-number | ~20 | 1% | `dateA - dateB` where types are unknown |
| 6 | **TS2305** — Module has no exported member | ~5 | <1% | `import { noAction } from "..."` but not exported |
| 7 | Other (TS2592, TS2353, TS2551, TS2367) | ~6 | <1% | jQuery types missing, webkitBackdropFilter |

### Files with 0 Errors (Clean) — 27 files

These compile cleanly and need no fixes:

```
public/assets/ts/pages/destination/destination-entry.ts
public/assets/ts/pages/edit-destination/destination-entry.ts
public/assets/ts/pages/edit-listing/listing-entry.ts
public/assets/ts/pages/edit-trip/trip-entry.ts
public/assets/ts/pages/expenses/expenses-entry.ts
public/assets/ts/pages/home/index-entry.ts
public/assets/ts/pages/itinerary/itinerary-entry.ts
public/assets/ts/pages/trip-detail/view-entry.ts
public/assets/ts/pages/home/support/*.ts           (2 files)
public/assets/ts/pages/expenses/support/*.ts       (2 files)
public/assets/ts/data/firebase/user.ts
public/assets/ts/models/*.ts                       (some model files)
public/assets/ts/utils/search.ts
public/assets/ts/utils/state.ts
public/assets/ts/utils/math.ts
public/assets/ts/utils/string.ts
public/assets/ts/ui/charts.ts
public/assets/ts/ui/currency.ts
public/assets/ts/theme/colors.ts
public/assets/ts/app/config.ts
public/assets/ts/backup/*.ts                       (2 files)
...plus ~5 more small files
```

### Top 10 Files with Most Errors

| File | Errors | Primary Issue |
|------|--------|---------------|
| `pages/trip-detail/view.ts` | 101 | DOM props on HTMLElement, undeclared globals |
| `pages/edit-trip/existing-trip.ts` | 100 | DOM props, undeclared globals, arg count |
| `pages/edit-destination/edit-destination.ts` | 64 | DOM props, arg count |
| `pages/edit-trip/categories/itinerary-module/inner-itinerary/inner-itinerary.ts` | 64 | DOM props, undeclared globals |
| `pages/edit-trip/set-trip.ts` | 57 | DOM props, arg count |
| `pages/edit-trip/categories/transportation.ts` | 43 | DOM props, undeclared globals |
| `utils/dom.ts` | 43 | DOM props on HTMLElement, undeclared globals |
| `pages/edit-destination/set-destination.ts` | 39 | DOM props, arg count |
| `pages/edit-trip/categories/accommodation.ts` | 31 | DOM props, undeclared globals |
| `ui/fields.ts` | 26 | DOM props, undeclared globals, arg count |

---

## Prompt 2 — Eliminate Undeclared Globals (~200 errors, 13%)

**Goal:** Replace "ambient globals" with proper ES module imports. Stop using variables that are neither imported nor declared — instead consolidate shared mutable state in `data/state.ts` and import where needed.

### Context

The codebase is halfway through a globals→modules migration. Many variables are already properly exported but consumers never added the `import` statement. Others are redeclared in multiple files with `var` (which was global in non-module scripts, but is module-scoped in ES modules).

**The root cause:** When `.js` files were converted to ES modules (`type="module"`), `var X` at the top level stopped being global and became module-scoped. But the `import` statements were never added to files that consume these variables.

### Current State — Each "Global" Traced to Its Source

| Variable | Properly exported from | Also declared (non-export) in | Used bare (no import) in |
|----------|----------------------|------------------------------|--------------------------|
| `DOCUMENT_ID` | `data/firebase/database.ts` `export let` | `pages/edit-trip/edit-trip.ts` (duplicate export) | 9 files: `utils/set.ts`, `ui/fields.ts`, `data/firebase/storage.ts`, `pages/edit-destination/`, `pages/destination/`, `pages/edit-listing/`, `pages/trip-detail/view.ts`, `pages/itinerary/` |
| `SUCCESSFUL_SAVE` | `pages/edit-trip/edit-trip.ts` | `pages/edit-destination/edit-destination.ts`, `pages/edit-listing/edit-listing.ts` | `ui/fields.ts`, `utils/set.ts` |
| `DESTINOS` | `pages/edit-trip/edit-trip.ts` `export let` | `pages/trip-detail/categories/destination.ts`, `pages/itinerary/itinerary-formatter.ts` | `utils/dom.ts` |
| `TRAVELERS` | `pages/edit-trip/categories/travelers.ts`, `pages/trip-detail/view.ts` | `pages/trip-detail/categories/summary.ts` | `utils/dom.ts` |
| `FIRESTORE_DESTINOS_DATA` | — | `pages/edit-destination/edit-destination.ts` | `utils/dom.ts` |
| `FIRESTORE_NEW_DATA` | — | `pages/edit-listing/edit-listing.ts` | (same file only) |
| `MESSAGE_PROPERTIES` | — | — | `utils/pin.ts`, `utils/messages.ts` |
| `ERROR_FROM_GET_REQUEST` | — | — | `utils/dom.ts` |

### Task

**Step 1: Consolidate shared mutable state in `data/state.ts`**

This file already manages `FIRESTORE_DATA` with `getState()`/`setState()`. Add the other shared variables:

```ts
// data/state.ts — add after existing code:

// Shared mutable state (previously ambient globals)
export let DOCUMENT_ID = "";
export let SUCCESSFUL_SAVE = false;
export let DESTINOS = [];
export let TRAVELERS = [];
export let FIRESTORE_DESTINOS_DATA = null;
export let FIRESTORE_NEW_DATA = {};
export let MESSAGE_PROPERTIES = {};
export let ERROR_FROM_GET_REQUEST = null;
```

**Step 2: Remove duplicate declarations**

In each file that declares these as `var`, remove the declaration and add an import instead:

| File | Remove | Add import |
|------|--------|------------|
| `data/firebase/database.ts` | `export let DOCUMENT_ID;` | — (moved to state.ts) |
| `pages/edit-trip/edit-trip.ts` | `export var DOCUMENT_ID; export let DESTINOS; export var SUCCESSFUL_SAVE` | `import { DOCUMENT_ID, DESTINOS, SUCCESSFUL_SAVE } from '../../data/state.js'` |
| `pages/edit-trip/categories/travelers.ts` | `export var TRAVELERS = []` | `import { TRAVELERS } from '../../../data/state.js'` |
| `pages/trip-detail/view.ts` | `export var TRAVELERS;` | `import { TRAVELERS } from '../../data/state.js'` |
| `pages/trip-detail/categories/destination.ts` | `var DESTINOS = []` | `import { DESTINOS } from '../../../data/state.js'` |
| `pages/trip-detail/categories/summary.ts` | `var TRAVELERS = []` | `import { TRAVELERS } from '../../../data/state.js'` |
| `pages/edit-destination/edit-destination.ts` | `var FIRESTORE_DESTINOS_DATA; var SUCCESSFUL_SAVE` | `import { FIRESTORE_DESTINOS_DATA, SUCCESSFUL_SAVE } from '../../data/state.js'` |
| `pages/edit-listing/edit-listing.ts` | `var FIRESTORE_NEW_DATA; var SUCCESSFUL_SAVE` | `import { FIRESTORE_NEW_DATA, SUCCESSFUL_SAVE } from '../../data/state.js'` |
| `pages/itinerary/itinerary-formatter.ts` | `var DESTINOS = {}` | `import { DESTINOS } from '../../data/state.js'` |

**Step 3: Add imports in all consumer files**

Every file that uses these variables bare must now import them from `data/state.js`:

| File | Add |
|------|-----|
| `utils/set.ts` | `import { DOCUMENT_ID, SUCCESSFUL_SAVE } from '../data/state.js'` |
| `ui/fields.ts` | `import { DOCUMENT_ID, SUCCESSFUL_SAVE } from '../data/state.js'` |
| `utils/dom.ts` | `import { DESTINOS, TRAVELERS, FIRESTORE_DESTINOS_DATA, FIRESTORE_NEW_DATA, ERROR_FROM_GET_REQUEST } from '../data/state.js'` |
| `utils/pin.ts` | `import { MESSAGE_PROPERTIES } from '../data/state.js'` |
| `utils/messages.ts` | `import { MESSAGE_PROPERTIES } from '../data/state.js'` |
| `data/firebase/storage.ts` | `import { DOCUMENT_ID } from '../state.js'` |
| `pages/destination/destination.ts` | `import { DOCUMENT_ID, FIRESTORE_DESTINOS_DATA } from '../../data/state.js'` |
| `pages/destination/edit-destination.ts` | `import { DOCUMENT_ID } from '../../data/state.js'` |
| `pages/itinerary/itinerary.ts` | `import { DOCUMENT_ID } from '../../data/state.js'` |

**Step 4: Fix cross-imports that referenced the old locations**

Some files already import these from page-specific modules — update them to import from `data/state.js` instead:

```powershell
# Find all existing imports of these symbols
npx tsc --noEmit 2>&1 | Select-String "TS2304"
```

Update any `import { DOCUMENT_ID } from "../../edit-trip/edit-trip.js"` → `import { DOCUMENT_ID } from "../../data/state.js"`.

**Step 5: Handle jQuery and Sortable (vendor globals)**

These are legitimately global — loaded via `<script>` tags, not modules. Create a minimal `public/assets/ts/vendor.d.ts`:

```ts
// Vendor globals loaded via <script> tags (not modules)
declare var $: any;
declare var jQuery: any;
declare var Sortable: any;
```

Update `tsconfig.json`:
```json
"include": [
  "public/assets/ts/**/*.ts",
  "public/assets/ts/vendor.d.ts",
  "index.ts",
  "firebase-config.ts"
]
```

### Validation
- `npx tsc --noEmit` shows **zero** `TS2304` errors (except vendor globals like `$`, `jQuery`, `Sortable`)
- No file uses `DOCUMENT_ID`, `SUCCESSFUL_SAVE`, `DESTINOS`, `TRAVELERS`, etc. without importing them
- `npm run build` still passes

---

## Prompt 3 — Fix Wrong Argument Counts & Broken Imports (~55 errors, 4%)

**Goal:** Fix function calls with wrong number of arguments and broken imports. These are actual logic bugs that the esbuild bundler can't catch.

### Context

With `strict: false`, TypeScript still checks function arity. ~50 calls pass wrong number of arguments.

### Task

**Step 1: Fix wrong argument count errors**

Run and fix each:

```powershell
npx tsc --noEmit 2>&1 | Select-String "TS2554"
```

Common fixes:
| Pattern | Fix |
|---------|-----|
| `closeAllSelects()` called with 0 args | Pass the required `excludeElement` or make the parameter optional: `function closeAllSelects(excludeElement?)` |
| `getCloseButton()` called with 0 args | Pass defaults or make params optional |
| `initializeSortableForGroup(item)` missing 2nd arg | Add default: `function initializeSortableForGroup(groupName, properties = {})` |
| `formattedDateToDate(d)` missing `time` | Make `time` optional: `function formattedDateToDate(formattedDate, time?)` |
| `getErrorElement(propriedades.erro, textDiv)` too many args | Check if the 2nd arg is actually used; if not, remove it from the call site |

**Step 2: Fix broken imports (TS2305)**

```powershell
npx tsc --noEmit 2>&1 | Select-String "TS2305"
```

Known broken imports from the audit:
| File | Broken Import | Fix |
|------|--------------|-----|
| `utils/attributions.ts` | `import { trip } from "../pages/home/support/data.js"` | Check if `trip` is exported; if not, remove the import |
| `utils/messages.ts` | `import { noAction } from "../pages/itinerary/itinerary.js"` | Check if `noAction` is exported; if not, remove the import |

### Validation
- `npx tsc --noEmit` shows **zero** `TS2554` and **zero** `TS2305` errors

---

## Prompt 4 — Fix DOM Element Type Narrowing (~900 errors, 60%)

**Goal:** Add type casts so TypeScript knows `getID()` returns the right HTML element type. This is the bulk of the errors but also the most mechanical fix.

### Context

`getID(id)` returns `HTMLElement`, but the code accesses `.value` (only on `HTMLInputElement`), `.style` (only on `HTMLElement` — wait, `.style` IS on HTMLElement), `.options` (only on `HTMLSelectElement`), etc.

The issue: `getID()` likely returns `HTMLElement | null` or `Element | null`, and TypeScript doesn't narrow it.

### Strategy: Fix `utils/dom.ts` `getID()` Return Type

The best fix is to make `getID()` generic so it returns the right type:

**Before:**
```ts
export function getID(id: string): HTMLElement | null {
  return document.getElementById(id);
}
```

**After:**
```ts
export function getID<T extends HTMLElement = HTMLElement>(id: string): T | null {
  return document.getElementById(id) as T | null;
}
```

This way, callers can optionally specify the type: `getID<HTMLInputElement>("titulo")`.

### Task

**Step 1: Fix `getID()` in `utils/dom.ts`**

Make it generic as shown above. This immediately fixes ~40% of TS2339 errors because TypeScript will now know `.value` exists on `HTMLInputElement` (still needs explicit cast at call sites, but the fix is now possible).

**Step 2: Fix `querySelector()` return types**

Same pattern for `document.querySelector()` calls — add type assertions:

```ts
const dropdown = document.querySelector<HTMLElement>(".dropdown");
```

**Step 3: Fix by file, highest error count first**

Work through files in this order (most errors → least):

| Priority | File | Errors | Key Fix |
|----------|------|--------|---------|
| 🔴 | `pages/trip-detail/view.ts` | 101 | Cast `getID()` results, declare globals |
| 🔴 | `pages/edit-trip/existing-trip.ts` | 100 | Cast `getID()` results, fix arg counts |
| 🔴 | `pages/edit-destination/edit-destination.ts` | 64 | Cast `getID()` results |
| 🔴 | `pages/edit-trip/.../inner-itinerary.ts` | 64 | Cast `getID()` results |
| 🟡 | `pages/edit-trip/set-trip.ts` | 57 | Cast `getID()` results |
| 🟡 | `utils/dom.ts` | 43 | Fix internal types first |
| 🟡 | `pages/edit-trip/.../transportation.ts` | 43 | Cast `getID()` results |
| 🟡 | `pages/edit-destination/set-destination.ts` | 39 | Cast `getID()` results |
| 🟢 | `ui/fields.ts` | 26 | Cast `getID()` results, fix args |
| 🟢 | `pages/edit-trip/.../accommodation.ts` | 31 | Cast `getID()` results |
| 🟢 | Remaining 85 files | 1–25 each | Same pattern |

**Step 4: Fix `{}` / `unknown` type issues**

Files that access `.modulos`, `.transportes`, `.hospedagens` on `getState()` — `getState()` returns `{}` because its return type isn't declared. Either:
- Add a return type to `getState()` in `utils/state.ts`
- Or cast at call sites: `(getState() as any).modulos.transportes`

### Validation
- `npx tsc --noEmit` error count drops significantly (aim for <200)
- All TS2339 errors in `utils/dom.ts` are fixed
- `npm run build` still passes

---

## Prompt 5 — Runtime Validation (Browser)

After all type errors are fixed, verify all 8 pages load without errors.

### Task

**Step 1: Start dev server**

```powershell
npm run dev
```

**Step 2: Check each page**

Open `http://localhost:5000` and navigate to all 8 pages. Open DevTools (F12) → Console on each. There should be **zero red errors**.

**Step 3: Test interactions**

On each page, verify: buttons click, modals open/close, drawers toggle, navigation works, forms submit.

### Validation
- All 8 pages render without console errors
- All interactive elements work
- `npm run build` still succeeds

---

## After Migration: Gradual Typing (no rush)

Once the build is green, add types at your own pace:

| Priority | What | Why |
|----------|------|-----|
| 1 | `models/` | Pure data shapes — biggest win, easiest to type |
| 2 | `utils/` | Pure functions, easy to type |
| 3 | `data/firebase/` | Firebase return types |
| 4 | `pages/` | Most complex, do last |

Per-file approach: enable `strict: true` in `tsconfig.json`, add `// @ts-nocheck` to files not ready yet. Remove the comment as you type each file.

---

## Optional: Framework for Complex Pages

Per `ai/analysis/framework-recommendation.md`, if you later want a framework:
- **Vue** is recommended for incremental adoption
- Start with `edit/trip.html` (most complex page)
- Works with esbuild via `esbuild-plugin-vue`

---

## Success Criteria

- [x] `npm run build` completes with **zero errors**
- [ ] All 8 pages load without console errors
- [x] All 122 source files in `public/assets/ts/` are `.ts` (root `index.js` and `firebase-config.js` deliberately kept as JS)
- [x] `tsconfig.json` present at project root
- [x] `scripts/build/build.js` includes TypeScript compilation step
- [ ] `npx tsc --noEmit` shows 0 errors (or <50 with known safe suppressions)
