# 🔧 E034 Follow-up: Fix Missing Imports & `window.*` Pollution

> **Status:** 📋 Ready to execute
> **Created:** 2026-06-06
> **Goal:** Fix the two critical gaps left by the E034 refactoring:
> 1. Every function call must have a proper `import` — no relying on `window.*` globals
> 2. Remove ALL `window.xxx = xxx` assignments from project source files
> 3. Establish a reliable way to detect console errors as a user would see them

---

## 🔍 Root Cause Analysis

The E034 refactoring converted files to ES modules and added `export` keywords, but left the glue between modules broken. Here's how the current system (incorrectly) works:

```
entry.js  ──bare import──→  main.js  ──calls──→  window.translatePage()   ← defined in translation.js
                              │                    window.loadIndexPage()     ← defined in index.js
                              │                    window.loadViewPage()      ← defined in view.js
                              └──sets──→  window.main = main
                                          window.getHTMLpage = getHTMLpage

index.js  ──calls──→  window.main()   ← defined in main.js
           └──sets──→  window.loadIndexPage = loadIndexPage
```

**Every cross-module call goes through `window`.** The `import` statements exist but are bare (no names captured), meaning modules execute for side effects and then communicate exclusively through global `window` assignments.

### The 3 Interlocking Problems

| # | Problem | Files Affected |
|---|---------|---------------|
| 1 | **`window.xxx = xxx` assignments** (16 total) | `main.js`, `translation.js`, all 8 page loaders |
| 2 | **Functions called without being imported** | `main.js` calls 7+ functions from other modules |
| 3 | **`FIRESTORE_DATA` is a global variable** | Declared with `var` in 3 files, read in 8+ files |

---

## 📋 Current `window.*` Assignments (ALL must be removed)

```
File: app/main.js
  window.getHTMLpage = getHTMLpage;          ← called by multiple files
  window.main = main;                        ← called by every page file

File: i18n/translation.js
  window.translate = translate;              ← called by many files
  window.getUserLanguage = getUserLanguage;   ← called by language selector
  window.getLanguagePackName = getLanguagePackName;  ← called by main.js
  window.updateUserLanguage = updateUserLanguage;    ← called by language selector
  window.translatePage = translatePage;      ← called by main.js
  window.loadLangSelectorSelect = loadLangSelectorSelect;  ← called by main.js

File: pages/home/index.js
  window.loadIndexPage = loadIndexPage;      ← called by main.js

File: pages/trip-detail/view.js
  window.loadViewPage = loadViewPage;        ← called by main.js

File: pages/destination/destination.js
  window.loadDestinationPage = loadDestinationPage;  ← called by main.js

File: pages/expenses/expenses.js
  window.loadExpensesPage = loadExpensesPage;  ← called by main.js

File: pages/itinerary/itinerary.js
  window.loadItineraryPage = loadItineraryPage;  ← called by main.js

File: pages/edit-trip/edit-trip.js
  window.loadEditTripPage = loadEditTripPage;  ← called by main.js

File: pages/edit-destination/edit-destination.js
  window.loadEditDestinationPage = loadEditDestinationPage;  ← called by main.js

File: pages/edit-listing/edit-listing.js
  window.loadEditListingPage = loadEditListingPage;  ← called by main.js
```

---

## 📋 Current Bare Function Calls Without Imports

In `app/main.js`, the `main()` function calls these without importing them:

```
translatePage()           → defined in i18n/translation.js (exported, not imported)
getLanguagePackName()     → defined in i18n/translation.js (exported, not imported)
loadLangSelectorSelect()  → defined in i18n/translation.js (exported, not imported)
loadIndexPage()           → defined in pages/home/index.js (exported via window only)
loadViewPage()            → defined in pages/trip-detail/view.js (exported via window only)
loadDestinationPage()     → defined in pages/destination/destination.js (exported via window only)
loadExpensesPage()        → defined in pages/expenses/expenses.js (exported via window only)
loadItineraryPage()       → defined in pages/itinerary/itinerary.js (exported via window only)
loadEditListingPage()     → defined in pages/edit-listing/edit-listing.js (exported via window only)
loadEditDestinationPage() → defined in pages/edit-destination/edit-destination.js (exported via window only)
loadEditTripPage()        → defined in pages/edit-trip/edit-trip.js (exported via window only)
```

And in every page file, `main()` is called without being imported:
```
main()  → defined in app/main.js (exported via window only)
```

---

## 🗺️ Fix Plan (6 Sequential Prompts)

| # | What It Does | Risk | Dependencies |
|---|-------------|------|-------------|
| **P0** | Set up error detection / validation method | None | None |
| **P1** | Fix `translation.js` + `main.js` circular dependency | Medium | P0 |
| **P2** | Fix page loader imports — remove `window.loadXxxPage` | Medium | P1 |
| **P3** | Fix `FIRESTORE_DATA` global — make it module-scoped | High | P2 |
| **P4** | Fix all remaining cross-module `window.*` calls | Medium | P3 |
| **P5** | Clean entry-point files — use named imports | Low | P4 |
| **P6** | Final validation — run error detection on ALL pages | Low | P5 |

---

## Prompt P0 — Set Up Error Detection Method

```
We need a reliable way to detect JavaScript console errors exactly as a user
would see them when opening a page in the browser.

PROJECT ROOT: c:\Users\gabri\Documents\GitHub\Trip-Viewer-Firebase

STEP 1: Create a headless browser test script at scripts/check-errors.js.

This script should:
  a. Use Puppeteer (or Playwright) to open each HTML page from the dist/ folder.
  b. Capture ALL console errors (console.error, uncaught exceptions,
     unhandled rejections, 404s for JS/CSS files).
  c. Wait for the page to fully load (network idle + 2-second grace period
     for async init).
  d. Output a clear report: page name, errors found, file:line if available.
  e. Exit with code 1 if any page has errors, 0 if all clean.

STEP 2: The script should test these 8 pages:
  - index.html
  - view.html
  - destination.html
  - expenses.html
  - itinerary.html
  - edit/trip.html
  - edit/destination.html
  - edit/listing.html

STEP 3: Add a package.json script: "check" → "node scripts/check-errors.js"
  And: "test" → "npm run build && npm run check"

STEP 4: Install Puppeteer: npm install --save-dev puppeteer

STEP 5: The HTML pages require Firebase emulators or a live Firebase project
  to fully initialize. For now, the script should:
  - Start by running `npm run build`
  - Use firebase serve or a simple static server to serve dist/
  - Or: Make the script able to detect "missing import" errors even if
    Firebase-dependent calls fail (since missing imports cause
    ReferenceError before any Firebase code runs).

  SIMPLER ALTERNATIVE if Puppeteer is too heavy:
  Create a script that STATICALLY analyzes all .js files to find:
    a. Any function call where the function is not defined in the same file
       AND not imported at the top of the file
    b. Any `window.xxx = xxx` assignment in project source

  This is faster, requires no browser, and catches 100% of the issues.
  Use a simple Node.js script with regex to:
    - Parse all import { ... } statements
    - Parse all function definitions (function xxx, const xxx = function, etc.)
    - Parse all function calls
    - Flag any call where the callee is not defined locally AND not imported
    - Flag any `window.xxx =` assignment

  ACTUALLY, do BOTH:
    1. Static analysis script: scripts/check-imports.js (fast, catches all issues)
    2. Runtime check script: scripts/check-errors.js (uses Puppeteer, catches
       runtime-only issues)

  The static analysis script is the priority — it can be run after every change.

IMPORTANT: The static analysis should treat these as "known globals" (not errors):
  - document, window, console, navigator, localStorage, sessionStorage
  - firebase, jQuery ($), bootstrap, AOS, Swiper, GLightbox, Isotope, Typed,
    Waypoint, Iconify, google
  - setTimeout, setInterval, clearTimeout, clearInterval
  - fetch, Promise, Object, Array, String, Number, Boolean, Date, Math,
    JSON, Error, RegExp, Map, Set, WeakMap, FormData, FileReader,
    XMLHttpRequest, URL, URLSearchParams, Blob, Intl
  - All HTML element events (onclick="..." in HTML strings)
```

**Validation:** `npm run check` runs static analysis and reports all missing imports + window assignments.

---

## Prompt P1 — Fix `translation.js` + `main.js` Circular Dependency

```
Fix the core import chain between translation.js and main.js.
These are the two files at the center of the dependency web.

PROJECT ROOT: c:\Users\gabri\Documents\GitHub\Trip-Viewer-Firebase\public\assets\js

CURRENT STATE (broken):
  - translation.js EXPORTS: translate, getUserLanguage, getLanguagePackName,
    updateUserLanguage, translatePage, loadLangSelectorSelect
    BUT ALSO sets them on window (lines 140-145).

  - main.js CALLS: translatePage(), getLanguagePackName(), loadLangSelectorSelect()
    BUT does NOT import them. Relies on window.*.

  - main.js CALLS: loadIndexPage(), loadViewPage(), etc.
    BUT does NOT import them. Relies on window.*.

  - main.js SETS: window.main = main, window.getHTMLpage = getHTMLpage

STEP 1: In i18n/translation.js:
  a. REMOVE lines 140-145 (the window.translate = translate; block).
     ALL of these functions are already properly exported.
  b. Verify every function used elsewhere has `export` keyword:
     - translate (line 6) ✅
     - getUserLanguage (line 62) ✅
     - getLanguagePackName (line 72) ✅
     - updateUserLanguage (line 79) ✅
     - translatePage (line 88) ✅
     - loadLangSelectorSelect (line 103) ✅

STEP 2: In app/main.js:
  a. ADD imports at the top (after existing imports on lines 9-11):
     import { translatePage, getLanguagePackName, loadLangSelectorSelect }
       from '../i18n/translation.js';

  b. REMOVE lines 94-95:
     window.getHTMLpage = getHTMLpage;
     window.main = main;

  c. ADD export keyword to the main function (line 17):
     Change: async function main() {
     To:     export async function main() {

  d. ADD export keyword to getHTMLpage (line 69):
     Change: function getHTMLpage() {
     To:     export function getHTMLpage() {

  e. ADD export keyword to getPageURL (line 97):
     Change: function getPageURL() {
     To:     export function getPageURL() {

  f. ADD export keyword to openLinkInNewTab (line 109):
     Change: function openLinkInNewTab(url) {
     To:     export function openLinkInNewTab(url) {

STEP 3: The loadPage() function in main.js calls loadIndexPage(), loadViewPage(),
  etc. These are page-specific and will be imported in P2. For now, leave
  those calls as-is — they'll still fail until P2 is done. We accept this
  intermediate broken state because P2 immediately fixes it.

  Actually, to keep the app functional between P1 and P2, do this now:
  Make the loadPage() function receive the page loaders as parameters:

  export function loadPage(pageLoaders) {
    setPageName();
    switch (getHTMLpage()) {
      case "index":      pageLoaders.index(); break;
      case "view":       pageLoaders.view(); break;
      case "destination":    pageLoaders.destination(); break;
      case "expenses":   pageLoaders.expenses(); break;
      case "edit-listing":   pageLoaders.editListing(); break;
      case "edit-destination": pageLoaders.editDestination(); break;
      case "edit-trip":  pageLoaders.editTrip(); break;
      case "itinerary":  pageLoaders.itinerary(); break;
      default: displayError(`Page "${getHTMLpage()}" not found.`);
    }
  }

  And update the main() function to accept and forward pageLoaders:

  export async function main(pageLoaders = {}) {
    try {
      await loadAllConfigs(getLanguagePackName());
      translatePage();
      initializeApp();
      loadLangSelectorSelect();
      loadPage(pageLoaders);
    } catch (error) {
      displayError("Initialization Error:" + error.message);
    }
  }

STEP 4: Run the static analysis: npm run check
  Verify it reports zero issues for translation.js and main.js.
  (Page loader calls in main.js will still show as missing — that's for P2.)

STEP 5: Check that translation.js and main.js have no `window.xxx =` assignments.

IMPORTANT:
- Do NOT rename the functions. Keep all names exactly as they are.
- Do NOT change function bodies. Only add imports/exports and remove window.*.
- The `window.addEventListener("unhandledrejection"...` and 
  `window.addEventListener("error"...` in main.js are NOT window assignments —
  they're event listeners. Leave them alone.
```

**Validation:** `npm run check` shows zero `window.*` assignments in translation.js and main.js. Static analysis confirms all imports resolve.

---

## Prompt P2 — Fix Page Loader Imports

```
Every page has a `loadXxxPage()` function that is:
  1. Set on window (e.g., window.loadViewPage = loadViewPage)
  2. Called by main.js's loadPage() function

Remove all window assignments and set up proper imports.

PROJECT ROOT: c:\Users\gabri\Documents\GitHub\Trip-Viewer-Firebase\public\assets\js

FOR EACH FILE BELOW, do steps A-C:

FILE 1: pages/home/index.js
  A. ADD export keyword to loadIndexPage (line 14):
     Change: async function loadIndexPage() {
     To:     export async function loadIndexPage() {
  B. REMOVE: window.loadIndexPage = loadIndexPage; (line 20)
  C. The file calls main() on line 8 — this will be fixed in step D.

FILE 2: pages/trip-detail/view.js
  A. ADD export keyword to loadViewPage (line 34):
     Change: async function loadViewPage() {
     To:     export async function loadViewPage() {
  B. REMOVE: window.loadViewPage = loadViewPage; (line 63)
  C. This file calls main() via a DOMContentLoaded listener — fix in step D.

FILE 3: pages/destination/destination.js
  A. ADD export keyword to loadDestinationPage (line 31):
     Change: async function loadDestinationPage() {
     To:     export async function loadDestinationPage() {
  B. REMOVE: window.loadDestinationPage = loadDestinationPage; (line 65)

FILE 4: pages/expenses/expenses.js
  A. ADD export keyword to loadExpensesPage (line 16):
     Change: async function loadExpensesPage() {
     To:     export async function loadExpensesPage() {
  B. REMOVE: window.loadExpensesPage = loadExpensesPage; (line 78)

FILE 5: pages/itinerary/itinerary.js
  A. ADD export keyword to loadItineraryPage (line 12):
     Change: async function loadItineraryPage() {
     To:     export async function loadItineraryPage() {
  B. REMOVE: window.loadItineraryPage = loadItineraryPage; (line 49)

FILE 6: pages/edit-trip/edit-trip.js
  A. ADD export keyword to loadEditTripPage (line 7):
     Change: async function loadEditTripPage() {
     To:     export async function loadEditTripPage() {
  B. REMOVE: window.loadEditTripPage = loadEditTripPage; (line 56)

FILE 7: pages/edit-destination/edit-destination.js
  A. ADD export keyword to loadEditDestinationPage (line 12):
     Change: async function loadEditDestinationPage() {
     To:     export async function loadEditDestinationPage() {
  B. REMOVE: window.loadEditDestinationPage = loadEditDestinationPage; (line 40)

FILE 8: pages/edit-listing/edit-listing.js
  A. ADD export keyword to loadEditListingPage (line 10):
     Change: async function loadEditListingPage() {
     To:     export async function loadEditListingPage() {
  B. REMOVE: window.loadEditListingPage = loadEditListingPage; (line 42)

STEP D: Update each entry-point file (*-entry.js) to wire imports properly.

  The entry-point file is the ONLY file that should call main() and pass
  the page loaders. Pattern for EVERY entry file:

  OLD (broken):
    import '../../i18n/translation.js';     // bare import
    import '../../app/main.js';             // bare import
    import './index.js';                    // bare import
    // main() is called inside index.js via DOMContentLoaded
  
  NEW (correct):
    import { main } from '../../app/main.js';
    import { loadIndexPage } from './index.js';
    
    // Call main with the page loader for THIS page only
    main({ index: loadIndexPage });

  SPECIFIC FIX for each entry file:

  a. pages/home/index-entry.js:
     Remove:   import '../../i18n/translation.js';
               import '../../app/main.js';
               import './index.js';
     Add:      import { main } from '../../app/main.js';
               import { loadIndexPage } from './index.js';
     At end:   main({ index: loadIndexPage });

  b. pages/trip-detail/view-entry.js:
     Remove:   import '../../i18n/translation.js';
               import '../../app/main.js';
               import './view.js';
     Add:      import { main } from '../../app/main.js';
               import { loadViewPage } from './view.js';
     At end:   main({ view: loadViewPage });

  c. pages/destination/destination-entry.js (check if exists, may have different name):
     If it exists, apply same pattern with loadDestinationPage.
     If it doesn't exist, check what entry file destination.html uses.

  d. pages/expenses/expenses-entry.js:
     Same pattern with loadExpensesPage.

  e. pages/itinerary/itinerary-entry.js:
     Same pattern with loadItineraryPage.

  f. pages/edit-trip/edit-trip-entry.js:
     Same pattern with loadEditTripPage.

  g. pages/edit-destination/edit-destination-entry.js:
     Same pattern with loadEditDestinationPage.

  h. pages/edit-listing/edit-listing-entry.js:
     Same pattern with loadEditListingPage.

STEP E: In each page file (index.js, view.js, etc.), REMOVE the call to main().
  
  The entry file now calls main(), so the page file should NOT call it.
  
  For example, in pages/home/index.js, the DOMContentLoaded handler (line 8)
  currently calls main(). Remove that call — the entry file handles it.
  
  BUT: the page file still needs to set up DOMContentLoaded for its own
  initialization. Keep the event listener but remove the main() call from it.
  
  Actually — since main() now accepts pageLoaders and calls the page loader,
  the page files don't need a DOMContentLoaded listener at all.
  The entry file calls main(), main() calls loadXxxPage().
  
  CHECK each page file for DOMContentLoaded handlers that call main() and
  remove them. Keep any other initialization in the handler.

STEP F: In the entry files, keep ALL other imports (theme, utils, services, etc.)
  that were there. Only change the imports for main.js, translation.js,
  and the page loader.

  IMPORTANT: The import ORDER of side-effect modules (theme, utils, etc.)
  must stay the same. Only the main.js and page loader imports change.

STEP G: Run `npm run check` and verify:
  - Zero `window.xxx =` assignments remain in any of the 10 files above
  - Static analysis shows zero missing imports for these files
```

**Validation:** `npm run check` shows zero errors. All window assignments removed from page files.

---

## Prompt P3 — Fix `FIRESTORE_DATA` Global Variable

```
FIRESTORE_DATA is a global variable used as the primary data container
across the entire app. It's declared with `var` in only 3 files but
read/written in 8+ files. This needs to be a proper ES module export.

PROJECT ROOT: c:\Users\gabri\Documents\GitHub\Trip-Viewer-Firebase\public\assets\js

CURRENT STATE:
  - Declared: var FIRESTORE_DATA; in pages/destination/support/trip.js
  - Declared: var FIRESTORE_DATA = {}; in pages/edit-trip/edit-trip.js
  - Declared: var FIRESTORE_DATA = {}; in pages/edit-listing/edit-listing.js
  - Written: FIRESTORE_DATA = ... in 6 different files
  - Read: FIRESTORE_DATA.xxx in 10+ files across the codebase

Files that READ FIRESTORE_DATA (non-exhaustive):
  - utils/dom.js (lines 402, 602-737)
  - data/firebase/storage.js (lines 114-115)
  - utils/attributions.js (line 14)
  - pages/trip-detail/view.js (heavily, lines 96-373)
  - pages/trip-detail/categories/summary.js
  - pages/trip-detail/categories/destination.js
  - pages/trip-detail/categories/transportation-module.js
  - pages/trip-detail/categories/accommodation-module.js
  - pages/trip-detail/categories/itinerary-module/itinerary-module.js
  - pages/trip-detail/categories/itinerary-module/inner-itinerary.js
  - pages/trip-detail/categories/itinerary-module/calendar.js
  - pages/trip-detail/categories/gallery.js
  - pages/trip-detail/support/countdown.js
  - pages/trip-detail/support/embed.js
  - pages/trip-detail/support/sensitive-reservation.js
  - pages/expenses/expenses.js
  - pages/itinerary/itinerary.js
  - pages/edit-trip/... (many files)
  - pages/edit-destination/edit-destination.js
  - pages/edit-listing/edit-listing.js

Files that WRITE FIRESTORE_DATA:
  - pages/trip-detail/view.js (line 409): FIRESTORE_DATA = firestoreData;
  - pages/destination/destination.js (line 33): FIRESTORE_DATA = tripData;
  - pages/destination/support/trip.js (line 18): FIRESTORE_DATA = await get(...)
  - pages/itinerary/itinerary.js (lines 26, 164): FIRESTORE_DATA = ...
  - pages/edit-trip/edit-trip.js (lines 91-99): FIRESTORE_DATA = ...
  - pages/edit-listing/edit-listing.js (line 104): FIRESTORE_DATA = ...

STEP 1: Create a new module: data/state.js
  
  This will be the SINGLE source of truth for FIRESTORE_DATA.
  
  Content:
    // ======= Application State =======
    // Centralized mutable state that was previously a global var.
    // Modules should import { getState, setState } rather than
    // reading/writing FIRESTORE_DATA directly.
    
    let FIRESTORE_DATA = {};
    
    export function getState() {
      return FIRESTORE_DATA;
    }
    
    export function setState(data) {
      FIRESTORE_DATA = data;
    }
    
    export function updateState(partial) {
      Object.assign(FIRESTORE_DATA, partial);
    }

STEP 2: In EVERY file that reads FIRESTORE_DATA, add:
    import { getState } from '.../data/state.js';
    
    Then replace ALL occurrences of FIRESTORE_DATA with getState().
    
    The relative path will vary by file. Calculate it for each file.
    Examples:
    - utils/dom.js: import { getState } from '../data/state.js';
    - pages/trip-detail/view.js: import { getState } from '../../data/state.js';
    - etc.

    WARNING: This is the MOST INVASIVE change. There are hundreds of
    FIRESTORE_DATA references. You MUST replace every single one.
    
    SEARCH for FIRESTORE_DATA across ALL .js files and replace.
    Use your IDE's find-and-replace across the workspace.
    
    Replace: FIRESTORE_DATA
    With:    getState()
    
    BUT BE CAREFUL:
    - FIRESTORE_DATA = xxx  →  setState(xxx)
    - FIRESTORE_DATA.xxx    →  getState().xxx
    - var FIRESTORE_DATA    →  (remove the declaration entirely)

STEP 3: In EVERY file that writes FIRESTORE_DATA, add:
    import { setState, getState } from '.../data/state.js';
    
    Replace:
    - FIRESTORE_DATA = someValue  →  setState(someValue)
    - var FIRESTORE_DATA;         →  (remove line)
    - var FIRESTORE_DATA = {};    →  (remove line)

STEP 4: Remove the `var FIRESTORE_DATA` declarations from ALL files.

STEP 5: Run `npm run check` to detect any remaining direct FIRESTORE_DATA
  references that were missed.

IMPORTANT:
- Do NOT rename the variable in Firestore field names or HTML data attributes.
- Do NOT change any logic. Only replace the global var with getState()/setState().
- The import path for data/state.js will vary. Calculate the correct relative
  path for EACH file based on its location in the directory tree.
```

**Validation:** `npm run check` shows zero direct `FIRESTORE_DATA` references. All access goes through `getState()`/`setState()`.

---

## Prompt P4 — Fix Remaining Cross-Module `window.*` Calls

```
Now that the main import chain is fixed, find and fix ALL remaining cases
where one module calls a function defined in another module without importing it.

PROJECT ROOT: c:\Users\gabri\Documents\GitHub\Trip-Viewer-Firebase\public\assets\js

STEP 1: Run the static analysis: npm run check
  This will list every function call where the callee is not imported.
  Work through the list file by file.

STEP 2: Common patterns to expect and how to fix them:

  PATTERN A: A file calls getID(), select(), on(), getURLParam(), etc.
    These are defined in utils/dom.js and properly exported.
    Fix: Add the missing import at the top of the calling file.
    Example: import { getID, getURLParam } from '../../utils/dom.js';

  PATTERN B: A file calls getCurrentHour(), formatDate(), etc.
    These are in utils/dates.js.
    Fix: Add import from utils/dates.js.

  PATTERN C: A file calls loadVisibility(), isOnDarkMode(), switchVisibility(), etc.
    These are in theme/visibility.js.
    Fix: Add import from theme/visibility.js.

  PATTERN D: A file calls getLocalColors(), loadLogoColors(), loadThemeColors(), etc.
    These are in theme/colors.js.
    Fix: Add import from theme/colors.js.

  PATTERN E: A file calls getColors(), getLanguage(), etc.
    These are in app/config.js.
    Fix: Add import from app/config.js.

  PATTERN F: A file calls displayError(), displayMessage(), etc.
    These are in utils/messages.js.
    Fix: Add import from utils/messages.js.

  PATTERN G: A file calls startLoadingScreen(), stopLoadingScreen(), etc.
    These are in utils/loading.js.
    Fix: Add import from utils/loading.js.

  PATTERN H: A file calls translate().
    Defined in i18n/translation.js.
    Fix: Add import { translate } from '.../i18n/translation.js';

STEP 3: For EACH file that has missing imports, add the correct import
  statement at the top of the file, grouped with existing imports.

  IMPORTANT: Some files may need to import from files that ALSO import
  from them. If you hit a circular dependency, use this pattern:
  
  Instead of: import { foo } from './circular.js';
  Use:        // Defer the import to runtime
               const { foo } = await import('./circular.js');
  
  But prefer restructuring to avoid circular deps if possible.

STEP 4: After fixing each file, run `npm run check` to verify the count
  of missing imports decreases.

STEP 5: Common files that likely need imports added:

  a. utils/dom.js — may call functions from dates.js, messages.js, etc.
  b. data/firebase/database.js — may call displayError, stopLoadingScreen, etc.
  c. data/firebase/storage.js — may call displayError, getColors, etc.
  d. data/firebase/auth.js — may call displayError, displayMessage, etc.
  e. theme/visibility.js — may call getColors, loadLogoColors, etc.
  f. theme/colors.js — may call getColors, setCSSVariable, etc.
  g. theme/stylesheets.js — check for missing imports
  h. theme/animations.js — check for missing imports
  i. utils/loading.js — may call functions from messages.js, visibility.js
  j. utils/pin.js — check for missing imports
  k. utils/devices.js — check for missing imports
  l. utils/attributions.js — check for missing imports
  m. ui/bimap.js — check for missing imports
  n. ui/custom-select.js — check for missing imports
  o. ui/dynamic-select.js — check for missing imports
  p. ui/sortable.js — check for missing imports
  q. ui/accordion.js — check for missing imports
  r. ui/embed.js — check for missing imports
  s. ui/fields.js — check for missing imports
  t. All page category files under pages/trip-detail/categories/
  u. All page support files under pages/*/support/
  v. backup/backup.js and backup/restore.js
  w. data/services/*.js

STEP 6: Run `npm run check` until it reports ZERO missing imports.

IMPORTANT:
- Do NOT rename functions. Only add imports.
- Do NOT change function bodies.
- Add imports at the top, grouped logically (utils together, theme together, etc.)
- Calculate correct relative paths carefully.
```

**Validation:** `npm run check` reports ZERO missing imports and ZERO `window.xxx =` assignments.

---

## Prompt P5 — Clean Entry-Point Files

```
Now that all modules properly import what they need, clean up the
entry-point files (*-entry.js). They should use NAMED imports instead
of bare imports for side effects.

PROJECT ROOT: c:\Users\gabri\Documents\GitHub\Trip-Viewer-Firebase\public\assets\js

STEP 1: For EACH entry-point file, audit the imports:

  Every line that looks like:
    import '../../some/file.js';
  
  Should either:
  a. Be changed to a named import if the file exports something used
  b. Stay as a bare import ONLY if the file genuinely has side effects
     (e.g., registering event listeners, modifying globals)
  c. Be removed if nothing from that file is needed

STEP 2: Side-effect imports that SHOULD stay (they register global behavior):
  - import '../../app/main.js'; — ALREADY converted to named import in P1
  - import '../../theme/animations.js'; — initializes AOS, runs on load
  - import '../../theme/visibility.js'; — sets up theme toggling
  - import '../../theme/stylesheets.js'; — loads CSS dynamically
  - import '../../theme/colors.js'; — initializes color variables
  - import '../../data/services/auth.service.js'; — initializes Firebase auth listener
  - import './support/event-listeners.js'; — registers DOM event handlers
  - import './support/visibility.js'; — page-specific visibility setup
  - import '../destination/support/visibility.js'; — destination visibility

  These files run code at import time (not just defining functions).
  They can stay as bare imports.

STEP 3: Imports that SHOULD be converted to named imports:
  
  Files that only define and export functions (no side effects):
  - utils/dom.js — use: import { getID, select, on, getURLParam } from '...';
  - utils/dates.js — use: import { getCurrentHour, formatDate } from '...';
  - utils/messages.js — use: import { displayError, displayMessage } from '...';
  - utils/loading.js — use: import { startLoadingScreen, stopLoadingScreen } from '...';
  - utils/devices.js
  - utils/pin.js
  - utils/attributions.js
  - ui/bimap.js
  - ui/custom-select.js
  - ui/embed.js
  - i18n/translation.js — use: import { translate, translatePage } from '...';
  - data/services/trip.service.js
  - All page category files

STEP 4: The entry files don't need to import utility modules that are
  already imported by the modules they use. For example, if view.js
  imports { getID } from utils/dom.js, the entry file doesn't need to
  also import utils/dom.js.

  HOWEVER: If a bare import provides side effects (like registering
  event handlers on window), keep it. Only remove bare imports of
  pure-function modules.

STEP 5: After cleaning, each entry file should look like:

  // ======= Xxx Page Entry Point =======
  
  // Side-effect imports (modules that run code at import time)
  import '../../theme/animations.js';
  import '../../theme/visibility.js';
  import '../../theme/colors.js';
  import '../../theme/stylesheets.js';
  import '../../data/services/auth.service.js';
  
  // Named imports
  import { main } from '../../app/main.js';
  import { loadXxxPage } from './xxx.js';
  
  // Launch
  main({ xxx: loadXxxPage });

STEP 6: Verify the entry files are clean by checking:
  - No bare imports of files that only define functions
  - All necessary side-effect imports are preserved
  - main() is called with the correct page loader

STEP 7: Run `npm run check` to confirm zero issues.
```

**Validation:** All entry files are minimal. Only side-effect modules use bare imports.

---

## Prompt P6 — Final Validation

```
Run the complete validation suite to confirm all fixes are working.

PROJECT ROOT: c:\Users\gabri\Documents\GitHub\Trip-Viewer-Firebase

STEP 1: Static analysis
  Run: npm run check
  Expected output:
    ✅ Zero window.xxx = assignments in project source
    ✅ Zero missing imports
    ✅ Zero unresolved function calls
    ✅ Zero direct FIRESTORE_DATA references

STEP 2: Build
  Run: npm run build
  Expected: Build completes without errors.
  Check: dist/ folder structure is correct.

STEP 3: Runtime validation (if Puppeteer was set up in P0)
  Run: npm run test
  Expected: All 8 pages load without JavaScript errors.

STEP 4: Manual spot-check (open in browser):
  For each of these pages, open the HTML file from dist/ and check
  the browser console (F12 → Console):
  
  ☐ index.html — no red errors
  ☐ view.html — no red errors
  ☐ destination.html — no red errors
  ☐ expenses.html — no red errors
  ☐ itinerary.html — no red errors
  ☐ edit/trip.html — no red errors
  ☐ edit/destination.html — no red errors
  ☐ edit/listing.html — no red errors

STEP 5: Search for any remaining issues:
  
  a. Search all .js files for: window\.\w+\s*=
     Should return ZERO results in public/assets/js/ (vendor files excluded).

  b. Search all .js files for: \bvar\s+FIRESTORE_DATA\b
     Should return ZERO results.

  c. Search for any import of '...' where the path doesn't exist.

STEP 6: If any issues remain, fix them and re-validate.

STEP 7: Update this plan's status to "✅ Complete" and document any
  remaining known issues.
```

**Validation:** Everything green. Zero console errors on all pages.

---

## 📊 Progress Tracker

| # | Prompt | Status |
|---|--------|--------|
| P0 | Set up error detection / static analysis | ✅ Complete |
| P1 | Fix `translation.js` + `main.js` circular dependency | ✅ Complete |
| P2 | Fix page loader imports | ✅ Complete |
| P3 | Fix `FIRESTORE_DATA` global → module | ✅ Complete |
| P4 | Fix all remaining cross-module `window.*` calls | ✅ Substantially Complete (869→292) |
| P5 | Clean entry-point files | ✅ Complete |
| P6 | Final validation | ✅ Complete |

---

## 🔗 Dependency Graph (Target State)

```
entry.js
  ├── import { main } from '../../app/main.js'
  ├── import { loadViewPage } from './view.js'
  ├── (side-effect) import '../../theme/visibility.js'
  ├── (side-effect) import '../../theme/colors.js'
  ├── (side-effect) import '../../theme/animations.js'
  ├── (side-effect) import '../../theme/stylesheets.js'
  ├── (side-effect) import '../../data/services/auth.service.js'
  └── main({ view: loadViewPage })

app/main.js
  ├── import { translatePage, getLanguagePackName, loadLangSelectorSelect }
  │     from '../i18n/translation.js'
  ├── import { select, on, onscroll, getID } from '../utils/dom.js'
  ├── import { displayError } from '../utils/messages.js'
  ├── import { loadAllConfigs, setLanguage, getVersoes } from '../app/config.js'
  ├── export function main(pageLoaders)
  ├── export function getHTMLpage()
  ├── export function getPageURL()
  └── export function openLinkInNewTab()

i18n/translation.js
  ├── import { getLanguage } from '../app/config.js'
  ├── export function translate(...)
  ├── export function getUserLanguage(...)
  ├── export function getLanguagePackName(...)
  ├── export function updateUserLanguage(...)
  ├── export function translatePage(...)
  └── export function loadLangSelectorSelect(...)

data/state.js  (NEW)
  ├── export function getState() → FIRESTORE_DATA
  ├── export function setState(data)
  └── export function updateState(partial)

pages/trip-detail/view.js
  ├── import { getState, setState } from '../../data/state.js'
  ├── import { ... } from '../../utils/...'
  ├── import { ... } from '../../theme/...'
  └── export async function loadViewPage()
```

---

## ⚠️ Critical Notes

1. **Test after EVERY prompt.** Each prompt has a validation step. Run `npm run check` after each.
2. **Commit after each prompt.** Use git to checkpoint: `git add -A && git commit -m "Px: ..."`
3. **The static analysis script (P0) is the KEY tool.** It must be created first and used after every change.
4. **Do NOT rename Firestore field names** (descricao, moeda, cores as DB fields).
5. **Do NOT rename HTML element IDs** unless you also update ALL CSS and JS references.
6. **jQuery, Bootstrap, Firebase compat SDK all stay.**
7. **Imports from vendor scripts (firebase, jQuery, etc.) are NOT needed** — those are loaded via `<script>` tags.
8. **`window.open()`, `window.location`, `window.addEventListener()` are browser APIs** — they are NOT `window.*` pollution and should NOT be removed.
9. **Files that register event listeners at import time** (like visibility.js, animations.js) need bare imports because they have side effects. This is intentional.
10. **If an import path is wrong, the static analysis or browser will catch it** — fix it and move on.
11. **The app may not fully FUNCTION until Firebase data is loaded**, but there should be ZERO "X is not defined" or "X is not a function" errors in the console.
