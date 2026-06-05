# 🔄 Second Refactoring Plan — Cleanup & Polish

> **Status:** ✅ Complete
> **Created:** 2026-06-05
> **Goal:** Fix the remaining issues from the first refactoring (E034) — eliminate duplicated HTML, remove `window.*` pollution, clean up Portuguese remnants, and finish the target architecture.

---

## 📋 Current Gaps (from E034 review)

| # | Issue | Severity |
|---|-------|----------|
| 1 | Top-bar HTML duplicated across all 8 pages instead of using shared partial | 🔴 High |
| 2 | ~30 `window.xxx = xxx` backward-compat attachments never removed | 🔴 High |
| 3 | `scripts-vendor.html` has malformed `<script>` tag (`type=text/JSX"`) | 🔴 Bug |
| 4 | `assets/js/components/` directory never created; files still in `support/` | 🟡 Medium |
| 5 | `getCores()` / `loadCores()` still Portuguese (should be `getColors` / `loadColors`) | 🟡 Medium |
| 6 | Portuguese comments remain in JS files | 🟢 Low |
| 7 | Build.js still transpiles ES modules → IIFE unnecessarily (legacy bridge) | 🟢 Low |
| 8 | HTML element IDs still Portuguese (`hospedagens-*`, `destinos-search`, etc.) | 🟢 Low |

---

## 🗺️ Prompt Plan (6 prompts)

| # | What It Does | Risk |
|---|-------------|------|
| **P1** | Fix `scripts-vendor.html` syntax bug | None |
| **P2** | Wire top-bar partial into all HTML files | Low — build-time injection, easy to verify |
| **P3** | Remove `window.*` backward-compat attachments | Medium — some dynamic calls may need refactoring |
| **P4** | Create `assets/js/components/`, move files, update imports | Medium — import path changes |
| **P5** | Rename `getCores` → `getColors`, clean Portuguese comments | Low |
| **P6** | Clean build pipeline + validate everything | Low |

---

## Prompt P1 — Fix `scripts-vendor.html` Syntax Bug

```
Fix the malformed script tag in:
  d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public\shared\scripts-vendor.html

The line currently reads:
  <script data-main src="{{ASSET_PREFIX}}../index.js" type=text/JSX"></script>

Fix it to:
  <script src="{{ASSET_PREFIX}}../index.js" type="text/javascript"></script>

Changes:
1. Add missing opening quote on the type attribute
2. Change `text/JSX` to `text/javascript` (valid MIME type)
3. Remove the `data-main` attribute (it's a RequireJS convention, not used here)

Do NOT change anything else in the file.
```

**Validation:** `npm run build` succeeds. No HTML validation warnings on the script tag.

---

## Prompt P2 — Wire Top-Bar Shared Partial Into All HTML Files

```
The shared top-bar partial exists at public/shared/top-bar.html but is never used.
Every HTML file has the full top-bar markup duplicated inline (60+ lines each).

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public

STEP 1: Verify the shared/top-bar.html has the correct top-bar markup.
  - It should use {{ASSET_PREFIX}} and {{HOME_HREF}} placeholders.
  - The inject-partials.js script already handles these placeholders.

STEP 2: For EACH of these 8 HTML files, replace the inline top-bar
        with <!-- #include shared/top-bar.html -->:

  - index.html
  - view.html
  - destination.html
  - expenses.html
  - itinerary.html
  - edit/trip.html
  - edit/destination.html
  - edit/listing.html

  HOW TO FIND THE TOP-BAR IN EACH FILE:
  The top-bar starts with one of these patterns:
    - <div class="top-bar loadable" id="top-bar" style="display: none">
    - <div class="top-bar" id="top-bar">
    - <div class="loadable" style="display: none">\n    <div class="top-bar">

  It ends at the closing </div> that matches the top-bar's opening,
  which is right before a comment like:
    - "<!-- ======= Header =======" (view.html)
    - "<!-- ======= Hero Section =======" (index.html)
    - "<!-- ======= Mobile nav toggle button =======" (some pages)

  Replace the ENTIRE top-bar block (from opening <div class="top-bar...">
  through its matching closing </div>) with:
    <!-- #include shared/top-bar.html -->

STEP 3: Run `npm run build` and verify the dist/ HTML files have the
        full top-bar content injected correctly.

STEP 4: Spot-check that placeholder substitution works:
  - Root pages should have ASSET_PREFIX="" and HOME_HREF="index.html"
  - Edit pages should have ASSET_PREFIX="../" and HOME_HREF="../index.html"

IMPORTANT: 
- Some pages wrap the top-bar in an extra <div class="loadable" style="display: none">.
  If a page has this wrapper, keep the wrapper div and put the include inside it.
- The SVG logo colors differ between index.html (#00b6ea stroke) and other pages 
  (#595a5a stroke). The shared partial uses the index.html style. If other pages 
  need a different stroke color, note which pages and we'll handle it separately.
- Do NOT change anything else in the HTML files.
```

**Validation:** `npm run build` → all 8 dist/ HTML files have complete top-bar. `firebase serve` → top-bar renders correctly on every page.

---

## Prompt P3 — Remove `window.*` Backward-Compat Attachments

```
During the ES module migration (P9-P12), functions were attached to the window
object so old <script> tags would still work. Now that all pages use 
<script type="module">, these attachments are dead code and must be removed.

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public

STEP 1: In assets/js/support/styles/visibility.js:
  Remove ALL lines matching the pattern:
    window.xxx = xxx;

  These are at the bottom of the file (~lines 348-376). There are ~28 of them.
  Example of lines to REMOVE:
    window.loadVisibility = loadVisibility;
    window.loadDarkMode = loadDarkMode;
    window.loadLightMode = loadLightMode;
    window.applyThemeAttribute = applyThemeAttribute;
    window.loadUserVisibility = loadUserVisibility;
    window.applyMode = applyMode;
    window.switchVisibility = switchVisibility;
    window.autoVisibility = autoVisibility;
    window.disableScroll = disableScroll;
    window.enableScroll = enableScroll;
    window.hasCSSRule = hasCSSRule;
    window.isOnDarkMode = isOnDarkMode;
    window.openModal = openModal;
    window.closeModal = closeModal;
    window.isModalOpen = isModalOpen;
    window.loadEditModule = loadEditModule;
    window.loadListener = loadListener;
    window.showContent = showContent;
    window.hideContent = hideContent;
    window.addRemoveChildListener = addRemoveChildListener;
    window.toggleFadingVisibility = toggleFadingVisibility;
    window.searchDestinationsListenerAction = searchDestinationsListenerAction;
    window.visibilityAdd = visibilityAdd;
    window.getVisibility = getVisibility;
    window.loadExternalVisibility = loadExternalVisibility;
    window.CHANGED_SVGS = CHANGED_SVGS;
    window.LOGO_LIGHT = LOGO_LIGHT;
    window.LOGO_DARK = LOGO_DARK;

STEP 2: In assets/js/support/styles/stylesheets.js:
  Remove window.setCSSRule and window.removeCSSRule lines at the bottom.

STEP 3: Check for window.xxx assignments in ALL other .js files under assets/js/.
  Search for the pattern: /^window\.\w+\s*=\s*\w+;?$/m
  Remove any found (they should only be in visibility.js and stylesheets.js).

STEP 4: CRITICAL — Check for dynamic window access before removing.
  In visibility.js, there's code that does:
    if (typeof window[dynamicFunctionName] === "function") {
        window[dynamicFunctionName]();
    }
  
  This is at ~line 318. This code calls functions BY NAME from the window object.
  Since we're removing window attachments, this will break.
  
  FIX: Replace the dynamic window call pattern with a local lookup object.
  At the TOP of visibility.js (after imports), add:
    const _exports = {};
  Then change each `window.xxx = xxx;` line to `_exports.xxx = xxx;`
  Then change the dynamic call at line ~318 from:
    window[dynamicFunctionName]()
  to:
    _exports[dynamicFunctionName]?.()

  This preserves the dynamic dispatch pattern without polluting window.

  ACTUALLY, check what dynamicFunctionName values can be. If they're all
  functions exported from THIS file, we can use a direct lookup map instead.

STEP 5: After ALL window assignments are removed, run `npm run build` 
  and test every page. Check the browser console for:
  - "X is not defined" errors
  - Any breakage in dark mode toggle
  - Any breakage in modal open/close
  - Any breakage in visibility/showContent/hideContent

IMPORTANT: Do NOT remove window assignments from vendor files or 
firebase-config.js. Only remove from project source files under assets/js/.
```

**Validation:** All pages work. Console is clean. Dark mode, modals, visibility toggles all functional. No `window.xxx` assignments remain in project source.

---

## Prompt P4 — Create `assets/js/components/` Directory

```
The target architecture specifies assets/js/components/ for reusable UI widgets.
Currently these files are scattered across support/components/ and support/html/.
Create the proper directory and move files there.

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public\assets\js

STEP 1: Create the directory:
  assets/js/components/

STEP 2: Move these files from support/components/ → components/:
  - bimap.js
  - custom-select.js
  - dynamic-select.js
  - sortable.js

STEP 3: Move these files from support/html/ → components/:
  - accordion.js
  - embed.js
  - fields.js

STEP 4: Update ALL import paths that reference these files.
  Search across ALL .js files for imports from:
    - "../support/components/bimap.js"
    - "../support/components/custom-select.js"
    - "../support/components/dynamic-select.js"
    - "../support/components/sortable.js"
    - "../support/html/accordion.js"
    - "../support/html/embed.js"
    - "../support/html/fields.js"
    - Any variations with different relative path depths

  Replace each with the corresponding path to components/:
    - "../support/components/bimap.js" → "../components/bimap.js" (adjust .. depth)
    - etc.

  TIP: Use grep to find ALL occurrences first, then update them systematically.

STEP 5: Update the barrel files:
  - If utils/index.js re-exports any of these, update the paths.
  - If services/index.js re-exports any of these, update the paths.

STEP 6: Delete the now-empty directories:
  - support/components/  (if empty after the move)
  - support/html/        (if empty after the move)

STEP 7: Run `npm run build` and verify zero import errors.
  Test every page to ensure all components work:
  - Custom selects render and function
  - Accordions expand/collapse
  - Sortable lists work
  - Embeds load (Instagram, TikTok, etc.)
  - Field validation works on edit pages
```

**Validation:** `npm run build` succeeds. All components functional. No files left in `support/components/` or `support/html/`.

---

## Prompt P5 — Rename Portuguese Function Names & Clean Comments

```
Rename remaining Portuguese identifiers and clean up Portuguese comments.

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public\assets\js

STEP 1: Rename getCores → getColors and loadCores → loadColors.
  
  In core/config.js:
    - Rename export function getCores() → export function getColors()
    - Rename export function loadCores() → export function loadColors()

  In support/styles/colors.js:
    - Update import: { getCores } → { getColors }
    - Update all calls: getCores() → getColors()

  Search ALL .js files for "getCores" and "loadCores" and update every occurrence.

STEP 2: Translate Portuguese comments to English.

  In support/styles/visibility.js (~line 221):
    - "// ======= Páginas de Editar =======" 
      → "// ======= Edit Pages ======="

  In pages/edit-trip/categories/accommodation.js (~line 101):
    - "// Carregamento Interno (Modal)"
      → "// Internal Loading (Modal)"

  Search for other Portuguese comments:
    Common Portuguese words in comments: "carregamento", "páginas", "editar",
    "navegação", "dispositivos", "mensagens", "atribuições", "visibilidade",
    "cores", "datas", "dados", "botão", "caixa", "tela", "tamanho"

  Translate each to English.

STEP 3: Run `npm run build` and test that getColors() works correctly.
  The theme colors, logo colors, and color picker on edit pages should all work.

IMPORTANT: 
- Do NOT rename Firestore field names (descricao, moeda, cores as DB fields).
  These would require a database migration.
- Do NOT rename HTML element IDs (hospedagens-*, destinos-*).
  These would require CSS updates and are lower priority.
- Only rename function names, variable names, and comments.
```

**Validation:** `npm run build` succeeds. Colors load correctly on all pages. No Portuguese comments remain.

---

## Prompt P6 — Clean Build Pipeline & Final Validation

```
Clean up the build pipeline and perform final validation.

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase

STEP 1: Remove unnecessary IIFE transpilation from scripts/build.js.
  
  The transpileESModules() function was a bridge during the ES module migration
  (P9-P11). Now that all HTML uses <script type="module">, it's dead weight.
  
  OPTION A (conservative): Keep the function but skip it by default.
    - Wrap the transpileESModules() call in an if-check for a --transpile flag.
  
  OPTION B (recommended): Remove the function entirely.
    - Delete the transpileESModules() function from build.js.
    - Remove the call to it in the build() function.
    - This will make builds significantly faster.

  Choose OPTION B. The build step should only:
    1. Clean dist/
    2. Copy public/ → dist/
    3. Inject HTML partials
    4. Copy firebase.json and firebase-config.js

STEP 2: Update the README.md if needed:
  - Ensure the project structure diagram matches reality.
  - Note that the support/ directory is now empty or gone.

STEP 3: Run the FULL validation checklist:

  ☐ npm run build completes without errors
  ☐ npm run clean removes dist/
  ☐ dist/ folder structure is clean (no empty folders, no .gitkeep)
  ☐ firebase.json points to "dist"
  ☐ .gitignore includes dist/ and node_modules/

  For EACH page (index, view, destination, expenses, itinerary,
  edit/trip, edit/destination, edit/listing):
  
  ☐ Page loads without console errors
  ☐ Firebase data loads correctly
  ☐ Authentication works (login/logout)
  ☐ Dark mode toggles correctly
  ☐ Translation works (EN/PT)
  ☐ Top-bar renders correctly (check logo, nav, icons)
  ☐ All modals open/close
  ☐ Custom selects work
  ☐ Accordions expand/collapse
  ☐ Sortables work (edit pages)
  ☐ Embeds work (Instagram, TikTok, YouTube)
  ☐ PIN/sensitive data protection works
  ☐ Share functionality works
  ☐ Export/backup works

STEP 4: Run `npm run build` one final time and check:
  - Zero console warnings
  - Zero console errors
  - Build time is reasonable (< 5 seconds)

STEP 5: Update the status in second-refactoring-plan.md to "✅ Complete".
```

**Validation:** Everything green. Project is fully clean and matches the target architecture.

---

## 📊 Progress Tracker

| # | Prompt | Status |
|---|--------|--------|
| P1 | Fix `scripts-vendor.html` syntax bug | ✅ Complete |
| P2 | Wire top-bar partial into all HTML files | ✅ Complete |
| P3 | Remove `window.*` backward-compat attachments | ✅ Complete |
| P4 | Create `assets/js/components/` directory | ✅ Complete |
| P5 | Rename Portuguese function names & clean comments | ✅ Complete |
| P6 | Clean build pipeline & final validation | ✅ Complete |

---

## ⚠️ Critical Notes

1. **Test after EVERY prompt.** Each prompt has a validation step. Don't skip it.
2. **Commit after each prompt.** Use git to checkpoint.
3. **The app must remain functional at all times.** This is cleanup, not a rewrite.
4. **Do NOT rename Firestore field names** (`descricao`, `moeda`, `cores` as DB fields). That requires a separate DB migration epic.
5. **Do NOT rename HTML element IDs** unless you also update all CSS references.
6. **jQuery, Bootstrap, Firebase compat SDK all stay.** This is cleanup only.
