# 🔧 Systematic Fix Plan — Resolve All Remaining Runtime Errors

> **Created:** 2026-06-06
> **Goal:** Stop the whack-a-mole cycle. Fix the automated repair pipeline, run it, then handle the remaining manual cases. 3 prompts total.

---

## Diagnosis

- **147 suppressed issues** in `scripts/lint/check-imports.js` (`KNOWN_MISSING_IMPORTS` map). These are all cross-module function calls without proper imports — the root cause of every runtime crash.
- **The auto-fix pipeline exists but is broken**: `scripts/check-cross-module-refs.py` has an indentation error at line ~1088 that prevents it from generating the issues JSON that `add-exports.py` and `fix-imports.py` need.
- **Once fixed**, the pipeline can resolve ~80-90% of the 147 issues automatically: `check-cross-module-refs.py --json > issues.json` → `add-exports.py issues.json` → `fix-imports.py issues.json`.
- **Remaining issues** will be HTML onclick handlers (37 static + 26 JS-generated) that need manual conversion to delegated `data-action` listeners.

---

## Prompt 1 — Fix the Auto-Fix Pipeline & Resolve Bulk Imports

The Python cross-module checker has a bug that prevents the entire automated fix pipeline from working. Fix it, then run the pipeline to resolve the bulk of missing imports/exports.

### Context

Three scripts work as a pipeline:
```
check-cross-module-refs.py --json > tmp_issues.json   (find problems)
add-exports.py tmp_issues.json                          (add 'export' keywords)
fix-imports.py tmp_issues.json                          (add 'import' statements)
```

`check-cross-module-refs.py` has an indentation error that makes it crash. The other two scripts are complete and correct.

### Task

**Step 1: Fix `check-cross-module-refs.py`**

The error is:
```
File "scripts/check-cross-module-refs.py", line 1089
    def _suggest_export_source(from_rel: str, symbol: str, file_exports: dict) -> Optional[str]:
    ^
IndentationError: expected an indented block after function definition on line 1086
```

Look at lines 1085-1095 in `scripts/check-cross-module-refs.py`. The `_suggest_export_source` function definition at line 1089 is likely missing a docstring or a `pass` statement — it needs at least one indented line after the `def` line. Either:
- Add a docstring or `pass` if the function is a stub, OR
- If the function body exists elsewhere, it may have been inadvertently dedented. Search for `_suggest_export_source` across the file to find the real body.

After fixing, verify with:
```powershell
.venv/Scripts/python.exe scripts/check-cross-module-refs.py 2>&1
```
It should run without syntax errors.

**Step 2: Run the pipeline**

```powershell
# Generate issues
.venv/Scripts/python.exe scripts/check-cross-module-refs.py --json > tmp_issues.json

# Add missing exports
.venv/Scripts/python.exe scripts/add-exports.py tmp_issues.json

# Add missing imports
.venv/Scripts/python.exe scripts/fix-imports.py tmp_issues.json
```

Run `add-exports.py` and `fix-imports.py` with `--verbose` to see what they fix. Use `--dry-run` first if you want to preview.

**Step 3: Update the suppression list**

After the auto-fixers run, many of the 147 "known missing imports" in `scripts/lint/check-imports.js` will be resolved. Run:

```powershell
node scripts/lint/check-imports.js --json > tmp_issues.json
```

Then run `node scripts/lint/check-imports.js` (without `--all`) to see which issues are still flagged as "known." Update the `KNOWN_MISSING_IMPORTS` object in `scripts/lint/check-imports.js` — remove ONLY the entries that the auto-fixers resolved (i.e., functions that now have proper imports). Keep entries that still fail.

**Step 4: Verify build**

```powershell
npm run build
```

The build must succeed with no errors.

### Validation
- `check-cross-module-refs.py` runs without syntax errors
- `add-exports.py` and `fix-imports.py` report fixes applied
- `npm run build` succeeds
- `node scripts/lint/check-imports.js` shows fewer or zero known issues

---

## Prompt 2 — Eliminate All Remaining `window.*` Dependencies (Onclick Cleanup)

After Prompt 1, the remaining runtime errors will come from `onclick="..."` handlers in HTML and JS-generated templates that call functions no longer on `window`.

### Context

The project already has the solution pattern implemented in `pages/home/support/event-listeners.js` — a centralized delegated click handler on `document` that dispatches based on `data-action` attributes:

```js
document.addEventListener("click", function (event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const action = target.getAttribute("data-action");
    switch (action) {
        case "sign-out": signOut(); break;
        case "open-trip-dialog": { const id = target.getAttribute("data-trip-id"); ... } break;
        // ...
    }
});
```

**Every page** needs this same pattern for its own onclick handlers.

### Task

There are two categories of onclick handlers to convert. The full inventory is documented in `ai/tasks/5-onclick-cleanup-plan.md`.

**Category A: Static HTML onclick attributes (37 occurrences)**

For each page, add static element handlers to the page's `event-listeners.js` for elements that exist at page load, and add `data-action` entries to a centralized `document` click handler for dynamic elements.

Important pages and their handler files:
| Page | Event listeners file |
|------|---------------------|
| `destination.html` | `pages/destination/support/event-listeners.js` |
| `view.html` | `pages/trip-detail/support/event-listeners.js` |
| `expenses.html` | `pages/expenses/support/event-listeners.js` |
| `itinerary.html` | `pages/itinerary/support/event-listeners.js` |
| `edit/trip.html` | `pages/edit-trip/support/event-listeners.js` |
| `edit/destination.html` | `pages/edit-destination/support/event-listeners.js` |
| `edit/listing.html` | `pages/edit-listing/support/event-listeners.js` |

For each page:
1. Find all `onclick="_functionName(...)"` attributes in the HTML
2. Replace them with `data-action="action-name"` + any needed `data-*` parameters
3. Add the corresponding `case` to the centralized handler in that page's `event-listeners.js`
4. Import the function at the top of the event-listeners file
5. **Remove** the old `window._functionName = ...` assignments if they still exist

**Category B: JS-generated onclick in template literals (26 occurrences)**

For each template literal that generates `onclick="functionName(${param})"`:
1. Replace `onclick="functionName(${param})"` with `data-action="action-name" data-param="${param}"`
2. Add the corresponding `case` to the page's centralized document click handler
3. Make sure the function is imported in the event-listeners file

Full inventory is in `ai/tasks/5-onclick-cleanup-plan.md` sections A and B.

**Shared handlers**: These appear on multiple pages and should use a consistent `data-action` name:
- `open-attributions` — footer attributions button (7 pages)
- `close-toast` — toast close button (6 pages)
- `close-modal` — modal close, with `data-modal="name"` (3 edit pages)

### Validation
- Zero `window._*` or `window.*` assignments related to onclick handlers
- All pages load without `ReferenceError: X is not defined` in the browser console
- `npm run build` succeeds
- `node scripts/lint/check-imports.js` shows no new issues

---

## Prompt 3 — Runtime Validation Across All Pages

After Prompts 1 and 2, validate that all 8 pages load without errors.

### Task

**Step 1: Run the runtime checker**

```powershell
node scripts/check-errors.js --verbose
```

This uses Puppeteer to open each page in a headless browser and captures console errors. Fix any remaining errors it finds.

**Step 2: Manual smoke test**

Run the dev server and manually verify each page:

```powershell
npm run dev
```

Open in browser and check:
- `index.html` — login page loads, buttons work
- `view.html` — trip view with calendar, destinations, transportation, accommodations
- `destination.html` — destinations list with filter/sort
- `expenses.html` — expenses summary
- `itinerary.html` — itinerary view
- `edit/trip.html` — trip editor
- `edit/destination.html` — destination editor
- `edit/listing.html` — listing editor

**Step 3: Clean up suppression list**

Run `node scripts/lint/check-imports.js` one final time. Any remaining entries in `KNOWN_MISSING_IMPORTS` should be either:
- Actually resolved (remove from the list), OR
- Documented as intentionally global (add a comment explaining why)

### Validation
- `check-errors.js` reports zero errors across all 8 pages
- All pages render correctly in manual testing
- `npm run build` succeeds cleanly

---

## Summary

| Prompt | What It Does | Expected Impact | 
|--------|-------------|----------------|
| **1** | Fix Python checker + run auto-fix pipeline + update suppressions | Resolves ~80% of 147 issues automatically |
| **2** | Convert onclick handlers to delegated data-action listeners | Eliminates remaining window dependencies |
| **3** | Runtime validation + cleanup | Confirms everything works, removes dead suppressions |

After these 3 prompts, the branch should be stable — all the architectural improvements from the 44 commits preserved, but without the runtime errors.
