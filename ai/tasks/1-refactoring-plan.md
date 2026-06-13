# 🔄 E034: Frontend Code Refactoring — Master Plan

> **Status:** ✅ Complete
> **Last updated:** 2026-06-05 (P18 complete)
> **Goal:** Transform a legacy jQuery/Bootstrap vanilla-JS app into a maintainable, modular frontend with clear separation of concerns — while keeping everything as static HTML+JS+CSS (no React/Angular/Vue).

---

## 📝 Lessons Learned

### What Went Well
- **Incremental approach**: Splitting the refactoring into 18 small, validated steps made a massive refactor manageable. Each phase had a clear scope and validation checkpoint.
- **ESBuild transpilation bridge**: Using esbuild to transpile ES modules back to IIFE during migration (P9-P12) allowed us to convert files one by one without breaking the app at any point.
- **CSS extraction order**: Extracting base styles first (P5), then components (P6), then cleaning up (P7) was the right sequence. Doing it in reverse would have caused more churn.
- **Barrel files**: Creating `index.js` barrel re-exports for services, utils, and components simplified imports across the codebase.
- **Build-time HTML partial injection**: Using a simple Node.js script to inject shared HTML partials at build time kept the app fully static while eliminating duplication.

### What Was Tricky
- **Reserved word collisions after P17**: Stripping the `_` prefix from function names like `_delete`, `_export`, `_function` caused them to collide with JavaScript reserved words (`delete`, `export`, `function`). These needed manual renaming to `deleteDocument`, `exportItinerary`, `fn`.
- **Import path resolution**: After folder restructuring (P1-P4), many import paths became incorrect and needed case-by-case fixing during P18 build validation.
- **CONFIG global removal (P15)**: This was the most invasive change. Many functions relied on `CONFIG.xxx` as a global. Converting to async config getters required touching nearly every file.
- **Underscore-prefixed imports**: During P17, function names were renamed (dropping `_` prefix) but several import statements weren't updated, causing build failures that needed systematic fixing in P18.

### What Would Be Done Differently
- **Run a full build after every phase**: Some import errors from P15/P17 were only caught during P18 validation. Running `npm run build` as a gate after each phase would have caught them earlier.
- **Use a codemod for P17 renaming**: Manual find-and-replace for stripping `_` prefixes missed edge cases. A jscodeshift codemod would have been more thorough.
- **Add a CI/build check earlier**: The `npm run build` command should have been part of the validation for every prompt, not just P18.
- **Track import dependencies more explicitly**: A dependency graph would have helped predict which files would break when renaming exports.

---

---

## 📋 Current State Summary

| Problem                                                                                       | Impact                                                     |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 50+`<script>` tags per HTML with implicit load order                                        | Fragile, hard to debug, cannot tree-shake                  |
| All functions/variables in global scope (`CONFIG`, `CALL_SYNC`, `FIRESTORE_DATA`, etc.) | Name collisions, no encapsulation                          |
| Portuguese folder/file names (`paginas/`, `viagem/`, `programacao/`)                    | Confusing for contributors, inconsistent with EN-US goal   |
| CSS duplicated per page (preloader, fonts, general styles in every file)                      | Redundancy, inconsistency, hard to maintain                |
| Firebase/database calls interleaved with DOM manipulation                                     | Impossible to test, tight coupling                         |
| Vendor scripts loaded per-page (duplicated across 7 HTML files)                               | Inconsistent versions, maintenance burden                  |
| No build step / no bundler                                                                    | No minification, no cache-busting hash, no static analysis |

---

## 🎯 Target Architecture

```
public/
├── index.html                     # single entrypoint per page
├── view.html
├── destination.html
├── expenses.html
├── itinerary.html
├── edit/
│   ├── trip.html
│   ├── destination.html
│   └── listing.html
│
├── assets/
│   ├── css/
│   │   ├── base/                  # shared: reset, variables, preloader, fonts, layout
│   │   │   ├── variables.css
│   │   │   ├── reset.css
│   │   │   ├── preloader.css
│   │   │   ├── fonts.css
│   │   │   ├── layout.css         # top-bar, back-to-top, common structure
│   │   │   └── dark-mode.css      # single dark-mode override file
│   │   ├── components/            # shared UI components
│   │   │   ├── accordion.css
│   │   │   ├── modal.css
│   │   │   ├── toast.css
│   │   │   ├── custom-select.css
│   │   │   ├── sensitive-box.css
│   │   │   └── swiper-overrides.css
│   │   ├── pages/                 # page-specific styles only
│   │   │   ├── index.css
│   │   │   ├── view.css
│   │   │   ├── destination.css
│   │   │   ├── expenses.css
│   │   │   ├── itinerary.css
│   │   │   └── edit.css           # unified edit styles (already condensing)
│   │   └── main.css               # imports base + components (used by all pages)
│   │
│   ├── js/
│   │   ├── core/                  # framework-like: boot, config, error handling
│   │   │   ├── app.js             # APP object, initialization, page router
│   │   │   ├── config.js          # statically imports JSON configs, replaces CONFIG global
│   │   │   └── errors.js          # global error handlers
│   │   ├── services/              # data layer: Firebase, APIs, storage
│   │   │   ├── firebase-core.js   # Firebase init + auth state
│   │   │   ├── database.js        # Firestore CRUD (get, set, create, delete)
│   │   │   ├── storage.js         # Firebase Storage (upload, get URLs)
│   │   │   └── translation.js     # i18n: load packs, translate DOM
│   │   ├── models/                # data transformation / business logic
│   │   │   ├── trip.js
│   │   │   ├── destination.js
│   │   │   ├── expense.js
│   │   │   ├── itinerary.js
│   │   │   └── traveler.js
│   │   ├── components/            # reusable UI widgets
│   │   │   ├── accordion.js
│   │   │   ├── bimap.js
│   │   │   ├── custom-select.js
│   │   │   ├── dynamic-select.js
│   │   │   ├── sortable.js
│   │   │   ├── toast.js
│   │   │   ├── modal.js
│   │   │   ├── pin.js
│   │   │   └── embed.js
│   │   ├── utils/                 # pure utility functions
│   │   │   ├── dom.js             # select, on, onscroll, getID
│   │   │   ├── text.js            # codify, uncodify, firstCharToUpper
│   │   │   ├── object.js          # isObject, cloneObject, deepEqual
│   │   │   ├── date.js            # date formatting, timezone, countdown
│   │   │   ├── url.js             # getPageURL, openLinkInNewTab
│   │   │   └── random.js          # getRandomID
│   │   ├── styles/                # runtime style management
│   │   │   ├── colors.js          # dynamic theme color application
│   │   │   ├── visibility.js      # show/hide elements, dark/light toggles
│   │   │   ├── animations.js      # AOS init + custom animations
│   │   │   └── stylesheets.js     # dynamic CSS loading / cache-busting
│   │   └── pages/                 # page-specific orchestration
│   │       ├── index/
│   │       ├── view/
│   │       ├── destination/
│   │       ├── expenses/
│   │       ├── itinerary/
│   │       └── edit/              # trip, destination, listing
│   │
│   ├── json/                      # (unchanged structure)
│   └── vendor/                    # (unchanged, but loaded once via shared bundle)
│
└── shared/                        # NEW: shared HTML partials loaded at build time
    ├── head.html                  # common <head> meta, favicons, fonts, vendor CSS
    ├── scripts-vendor.html        # vendor JS (loaded ONCE across all pages)
    ├── scripts-core.html          # core JS bundle
    └── top-bar.html               # shared top-bar component
```

---

## 🗺️ Phase Overview

| Phase             | Prompts  | What It Does                                                            | Risk                                        |
| ----------------- | -------- | ----------------------------------------------------------------------- | ------------------------------------------- |
| **Phase 0** | P0       | Establish build step (bundler) and shared entrypoint                    | Low — adds tooling, doesn't change runtime |
| **Phase 1** | P1–P4   | Rename folders/files to EN-US, restructure JS/CSS                       | Medium — file moves only, logic unchanged  |
| **Phase 2** | P5–P8   | Extract shared CSS, remove duplication, clean unused                    | Medium — visual regression possible        |
| **Phase 3** | P9–P12  | Convert to ES modules, single entrypoint per HTML, remove CONFIG global | High — changes how code loads              |
| **Phase 4** | P13–P16 | Separate concerns: services/models/components/utils                     | High — deep refactor                       |
| **Phase 5** | P17–P18 | Final polish, validation, documentation                                 | Low                                         |

---

## Phase 0: Build Tooling Foundation

### Prompt P0 — Set Up Bundler & Shared HTML Partials

```
I need to set up a lightweight build pipeline for a static HTML+JS+CSS project.
The project is at d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase.

Requirements:
1. Use ESBuild as the bundler (fast, no config bloat). Do NOT use webpack, vite, or rollup.
2. Create a package.json at the project root with these scripts:
   - "build" — bundles JS, copies static assets to a dist/ folder
   - "watch" — same but watches for changes
   - "clean" — removes dist/
3. Do NOT change any source files yet. This is tooling only.
4. The build step for now should:
   a. Create dist/ folder
   b. Copy ALL of public/ to dist/ (as-is, no JS bundling yet)
   c. Copy firebase.json, firebase-config.js to dist/
5. Add dist/ to .gitignore
6. The Firebase deploy target should now be dist/ instead of public/

Important:
- This is a Firebase Hosting project. The firebase.json currently points to "public".
- After this change, firebase.json should point to "dist".
- The existing public/ folder stays as source. dist/ is build output.
- All HTML files, CSS, JS, JSON, vendor, images must be copied to dist/.
- Make sure firebase.json's "public" field is updated to "dist".
- Do NOT use npm workspaces. Keep it simple.
```

**Validation:** `npm run build` → `dist/` mirrors `public/` → `firebase serve` works from `dist/`.

---

## Phase 1: File/Folder Restructuring & EN-US Naming

### Prompt P1 — Rename JS Folders & Files to EN-US

```
I'm refactoring a JS project. Rename ALL folders and files under:
  d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public\assets\js\

RULES:
1. Use these mappings for Portuguese → English:

FOLDERS:
  - "paginas" → "pages"
  - "suporte" → "support"
  - "componentes" → "components"
  - "estilos" → "styles"
  - "paginas" (inside pages) → keep as is (its children are page names)
  - "editar-viagem" → "edit-trip"
  - "editar-destino" → "edit-destination"
  - "editar-listagem" → "edit-listing"
  - "viagem" → "view"
  - "destinos" → "destination"
  - "gastos" → "expenses"
  - "programacao" → "itinerary-module"
  - "inner-programacao" → "inner-itinerary"
  - "dados-basicos" → "basic-data"
  - "customizacao" → "customization"
  - "galeria" → "gallery"
  - "hospedagem" → "accommodation"
  - "transporte" → "transportation"
  - "resumo" → "summary"
  - "transportes" → "transportation-module"
  - "hospedagens" → "accommodation-module"
  - "calendario" → "calendar"
  - "atribuicoes" → "attributions"
  - "carregamento" → "loading"
  - "dados" → "data"
  - "datas" → "dates"
  - "dispositivos" → "devices"
  - "mensagens" → "messages"
  - "navegacao" → "navigation"
  - "visibilidade" → "visibility"
  - "categorias" → "categories"
  - "descricao" → "description"
  - "valor" → "price"

FILES (rename the file, keep content unchanged):
  - "animacoes.js" → "animations.js"
  - "cores.js" → "colors.js"
  - "atribuicoes.js" → "attributions.js"
  - "carregamento.js" → "loading.js"
  - "dados.js" → "data.js"
  - "datas.js" → "dates.js"
  - "dispositivos.js" → "devices.js"
  - "mensagens.js" → "messages.js"
  - "navegacao.js" → "navigation.js"
  - "visibilidade.js" → "visibility.js"
  - "viagem.js" → "view.js"
  - "destinos.js" → "destination.js"
  - "gastos.js" → "expenses.js"
  - "gastos-convertidos.js" → "expenses-converted.js"
  - "editar-viagem.js" → "edit-trip.js"
  - "editar-destino.js" → "edit-destination.js"
  - "editar-listagem.js" → "edit-listing.js"
  - "viagem-existente.js" → "existing-trip.js"
  - "destino-existente.js" → "existing-destination.js"
  - "listagem-existente.js" → "existing-listing.js"
  - "nova-viagem.js" → "new-trip.js"
  - "novo-destino.js" → "new-destination.js"
  - "set-viagem.js" → "set-trip.js"
  - "set-destino.js" → "set-destination.js"
  - "import-destino.js" → "import-destination.js"
  - "customizacao.js" → "customization.js"
  - "galeria.js" → "gallery.js"
  - "hospedagem.js" → "accommodation.js"
  - "transporte.js" → "transportation.js"
  - "programacao.js" → "itinerary-module.js"
  - "inner-programacao.js" → "inner-itinerary.js"
  - "calendario.js" → "calendar.js"
  - "moeda.js" → "currency.js"
  - "event-listeners.js" → keep name (already EN)

2. Do NOT modify file contents — ONLY rename files and folders.
3. Make sure every file is accounted for. Check each subdirectory.
4. After renaming, list the new complete tree so I can verify.
```

**Validation:** All files exist at new paths, zero content changes, directory structure matches target.

---

### Prompt P2 — Rename CSS Folders to EN-US

```
I'm refactoring a project. Rename the CSS folders under:
  d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public\assets\css\

RULES:
1. Use these mappings:
  - "destinos" → "destination"
  - "editar" → "edit"
  - "gastos" → "expenses"
  - "viagem" → "view"
  - "itinerary" → keep (already EN)
  - "index" → keep (already EN)

2. Do NOT rename the CSS files inside (editar.css, editar-dark.css etc.) — those will be done in a later prompt.
3. Only rename the folders.
```

**Validation:** CSS folders renamed, files inside unchanged.

---

### Prompt P3 — Update ALL Script & CSS Paths in HTML Files

```
I just renamed JS folders and CSS folders in this project from Portuguese to English.
Now I need to update ALL 7 HTML files to point to the new paths.

HTML files to update:
1. public/index.html
2. public/view.html
3. public/destination.html
4. public/expenses.html
5. public/itinerary.html
6. public/edit/trip.html
7. public/edit/destination.html
8. public/edit/listing.html

JS folder mapping (from old → new):
  - "assets/js/paginas/" → "assets/js/pages/"
  - "assets/js/suporte/" → "assets/js/support/"
  - "assets/js/suporte/componentes" → "assets/js/support/components"
  - "assets/js/suporte/estilos" → "assets/js/support/styles"
  - "assets/js/suporte/firebase" → "assets/js/support/firebase"
  - "assets/js/suporte/html" → "assets/js/support/html"
  - "assets/js/suporte/paginas" → "assets/js/support/pages"

OLD → NEW JS path references (update ALL script src attributes):

  Pages:
  - "paginas/index/" → "pages/index/"
  - "paginas/viagem/" → "pages/view/"
  - "paginas/destinos/" → "pages/destination/"
  - "paginas/gastos/" → "pages/expenses/"
  - "paginas/itinerary/" → "pages/itinerary/"
  - "paginas/editar-viagem/" → "pages/edit-trip/"
  - "paginas/editar-destino/" → "pages/edit-destination/"
  - "paginas/editar-listagem/" → "pages/edit-listing/"

  Individual JS file renames (update in ALL script tags):
  - "animacoes.js" → "animations.js"
  - "cores.js" → "colors.js"
  - "atribuicoes.js" → "attributions.js"
  - "carregamento.js" → "loading.js"
  - "dados.js" → "data.js"
  - "datas.js" → "dates.js"
  - "dispositivos.js" → "devices.js"
  - "mensagens.js" → "messages.js"
  - "navegacao.js" → "navigation.js"
  - "visibilidade.js" → "visibility.js"
  - "viagem.js" → "view.js"
  - "destinos.js" → "destination.js"
  - "gastos.js" → "expenses.js"
  - "gastos-convertidos.js" → "expenses-converted.js"
  - "editar-viagem.js" → "edit-trip.js"
  - "editar-destino.js" → "edit-destination.js"
  - "editar-listagem.js" → "edit-listing.js"
  - "viagem-existente.js" → "existing-trip.js"
  - "destino-existente.js" → "existing-destination.js"
  - "listagem-existente.js" → "existing-listing.js"
  - "nova-viagem.js" → "new-trip.js"
  - "novo-destino.js" → "new-destination.js"
  - "set-viagem.js" → "set-trip.js"
  - "set-destino.js" → "set-destination.js"
  - "import-destino.js" → "import-destination.js"
  - "customizacao.js" → "customization.js"
  - "galeria.js" → "gallery.js"
  - "hospedagem.js" → "accommodation.js"
  - "transporte.js" → "transportation.js"
  - "programacao.js" → "itinerary-module.js"
  - "inner-programacao.js" → "inner-itinerary.js"
  - "calendario.js" → "calendar.js"
  - "moeda.js" → "currency.js"

CSS folder path updates (in <link> tags):
  - "assets/css/destinos/" → "assets/css/destination/"
  - "assets/css/editar/" → "assets/css/edit/"
  - "assets/css/gastos/" → "assets/css/expenses/"
  - "assets/css/viagem/" → "assets/css/view/"

IMPORTANT:
- Search EVERY HTML file thoroughly. Some files have 30-50+ script tags.
- Update ALL occurrences. Do NOT miss any.
- Paths in edit/*.html use "../" prefix — keep that prefix.
- Do NOT change any other content in the HTML files.
```

**Validation:** All HTML files reference only the new paths. No old path remains.

---

### Prompt P4 — Rename CSS Files Themselves

```
Now rename the CSS files inside these folders to EN-US:

1. d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public\assets\css\destination\
   - "destinos.css" → "destination.css"
   - "destinos-dark.css" → "destination-dark.css"

2. d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public\assets\css\edit\
   - "editar.css" → "edit.css"
   - "editar-dark.css" → "edit-dark.css"

3. d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public\assets\css\expenses\
   - "gastos.css" → "expenses.css"
   - "gastos-dark.css" → "expenses-dark.css"

4. d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public\assets\css\view\
   - "viagem.css" → "view.css"
   - "viagem-dark.css" → "view-dark.css"

Then update ALL <link> tags in ALL 8 HTML files to reference the new CSS filenames.
Search every HTML file thoroughly.
```

**Validation:** CSS files renamed, all `<link>` tags updated.

---

## Phase 2: CSS Modularization & Cleanup

### Prompt P5 — Extract Shared CSS into base/ Folder

```
I need to modularize the CSS in this project. Currently each page duplicates the same base styles.

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public

STEP 1: Create the folder structure:
  - assets/css/base/
  - assets/css/components/

STEP 2: Create assets/css/base/variables.css containing the SHARED CSS variables.
Extract only the :root block from assets/css/index/index.css (the index one is the most complete).
Copy it into base/variables.css.
Then check view/view.css — if it has additional variables not in index.css, add those too.
Make ONE unified :root block.

STEP 3: Create assets/css/base/reset.css containing the shared reset/base styles.
From index/index.css, extract these sections (they appear in ALL page CSS files):
  - The *, *::before, *::after box-sizing rule
  - body, html defaults (margin, padding, font-family, overflow, tap-highlight, safe-area-inset, background, font-smoothing)
  - strong, a, a:hover defaults
  - h1-h6 defaults
Put them in reset.css.

STEP 4: Create assets/css/base/fonts.css:
  - Extract the @font-face "Chelos" declaration (appears in all CSS files)

STEP 5: Create assets/css/base/preloader.css:
  - Extract #preloader and #preloader:before and @keyframes animate-preloader (appears in all CSS files)
  - Also the @media rule for [data-aos-delay]

STEP 6: Create assets/css/base/layout.css:
  - Extract .top-bar, .logo-box, #logo-light, #logo-dark, #trip-viewer-text, .icons-box, .icon-buttons
  - Extract .back-to-top and .back-to-top.active
  - These are shared across view, index, destination, expenses

STEP 7: Create assets/css/base/dark-mode.css:
  - From each *-dark.css file, extract the shared dark-mode overrides that are COMMON across pages.
  - Focus on: body dark background, text color, preloader dark, top-bar dark, a color dark.
  - Keep page-specific dark overrides in their page CSS files.

STEP 8: Create assets/css/main.css that imports all base files:
  @import 'base/variables.css';
  @import 'base/reset.css';
  @import 'base/fonts.css';
  @import 'base/preloader.css';
  @import 'base/layout.css';
  @import 'base/dark-mode.css';

STEP 9: From EACH page CSS file (index.css, view.css, destination.css, expenses.css, itinerary.css, edit.css):
  - REMOVE the sections that were extracted into base/
  - Keep ONLY page-specific styles

STEP 10: In EACH HTML file, add the main.css link BEFORE the page-specific CSS link.
  Example for index.html:
    <link href="assets/css/main.css" rel="stylesheet">
    <link data-main href="assets/css/index/index.css" rel="stylesheet">

IMPORTANT: Be extremely careful with the extraction. Compare across all 6 CSS files to ensure you capture the union of shared styles. After extraction, each page should still look identical.
```

**Validation:** All pages render identically. No visual regressions.

---

### Prompt P6 — Extract Shared Component CSS

```
I need to extract CSS for shared UI components that appear in multiple pages.

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public

STEP 1: Search across ALL page CSS files and dark-mode files for styles related to these components:
  - Accordion (".accordion", ".accordion-item", ".accordion-button", etc.)
  - Modal / message modals (".modal", ".message-modal", ".popup", etc.)
  - Custom select (".custom-select", ".select-items", etc.)
  - Toast (".toast", ".toast-container", etc.)
  - Sensitive box (".sensitive-box", ".sensitive-content", etc.)
  - Swiper overrides (".swiper", ".swiper-pagination", etc.)

STEP 2: For each component, create a CSS file in assets/css/components/:
  - accordion.css
  - modal.css
  - custom-select.css
  - toast.css
  - sensitive-box.css
  - swiper-overrides.css

STEP 3: Move the relevant styles from page CSS files into these component files.
If a page has its own slight variation, keep the variation in the page CSS and add a comment.

STEP 4: Update assets/css/main.css to import these component files:
  @import 'components/accordion.css';
  @import 'components/modal.css';
  @import 'components/custom-select.css';
  @import 'components/toast.css';
  @import 'components/sensitive-box.css';
  @import 'components/swiper-overrides.css';

STEP 5: Remove the now-duplicated component styles from each page CSS file.

CRITICAL: Do NOT break any page. Each component may have slight differences across pages.
If a style is truly page-specific, leave it in the page CSS.
```

**Validation:** All components render consistently across pages.

---

### Prompt P7 — Clean Unused CSS Properties

```
I need to clean unused/redundant CSS from the project.

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public\assets\css

STEP 1: For EACH page CSS file (index.css, view.css, destination.css, expenses.css, itinerary.css, edit.css) and their *-dark.css counterparts:

  a. Remove duplicate selectors within the same file (e.g., if strong { } appears twice)
  b. Remove empty rulesets (e.g., ".something { }")
  c. Remove properties that are overridden immediately below without being used
  d. Consolidate repeated values — if the same color #5859a7 appears 25 times, use var(--theme-color) instead
  e. Remove vendor prefixes that are no longer needed (-webkit- for properties that are standard since 2020+)
  f. Check for properties that have no effect (e.g., "display: block" on a <div>, "position: static" explicitly set)

STEP 2: For the *-dark.css files specifically:
  - If a dark rule is identical to the light rule (same value), remove it — it's redundant.
  - If a dark rule only changes background/text color, that should move to base/dark-mode.css.

STEP 3: Run a quick check:
  - Look for any CSS class that appears in CSS but NOT in any HTML file.
  - Flag these in a comment at the top of each CSS file as "/* UNUSED: .class-name */" but do NOT delete yet.
  - I will decide which to delete manually.

Be conservative — when in doubt, leave the rule. This is cleanup, not rewrite.
```

**Validation:** No visual changes. CSS files are smaller. No broken styles.

---

### Prompt P8 — Single Dark Mode System

```
The project currently has separate *-dark.css files for each page. Consolidate them.

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public

STEP 1: Read ALL *-dark.css files:
  - assets/css/index/index-dark.css
  - assets/css/view/view-dark.css
  - assets/css/destination/destination-dark.css
  - assets/css/expenses/expenses-dark.css
  - assets/css/itinerary/itinerary-dark.css
  - assets/css/edit/edit-dark.css

STEP 2: Create ONE file: assets/css/base/dark-theme.css

  This file should contain a SINGLE .dark-mode or [data-theme="dark"] scope that applies all dark overrides.

  Structure it like:
    [data-theme="dark"] {
      /* === General === */
      ... (body, text, links)
      /* === Top Bar === */
      ...
      /* === Preloader === */
      ...
      /* === Index Page === */
      ...
      /* === View Page === */
      ...
      /* === Destination Page === */
      ...
      /* === Expenses Page === */
      ...
      /* === Itinerary Page === */
      ...
      /* === Edit Pages === */
      ...
    }

STEP 3: Merge common overrides.
  If the same selector appears in 3 dark files, put it once in a "Common" section.
  Keep page-specific overrides under clearly commented page sections.

STEP 4: Add @import 'base/dark-theme.css' to main.css.

STEP 5: Delete the individual *-dark.css files.

STEP 6: Update the JavaScript that loads dark-mode CSS.
  Currently it likely swaps stylesheets. Find the code in:
    - assets/js/support/styles/stylesheets.js
    - or assets/js/support/styles/visibility.js
  and simplify it to just toggle a data-theme="dark" attribute on <html> instead of swapping CSS files.

  If there's logic loading *-dark.css files, remove it.

CRITICAL: Test every page in dark mode after this change.
```

**Validation:** All pages work in both light and dark mode. Single dark CSS file. JS simplified.

---

## Phase 3: ES Modules & Single Entry Points

### Prompt P9 — Convert Utility Files to ES Modules

```
I need to convert the project's JavaScript from global scripts to ES modules.
Start with the utility files — these have no dependencies on other project files.

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public

IMPORTANT CONTEXT:
- This project currently uses <script> tags with implicit global dependencies.
- All functions are currently global (prefixed with _).
- We'll convert bottom-up: utils first, then components, services, pages last.

STEP 1: Convert assets/js/support/pages/data.js (utility functions):

  a. Remove the global variable declarations at the top:
     var CALL_SYNC = [];
     var FIRESTORE_DATA;
     var SHEET_DATA;
     var P_DATA;
     var HYPERLINK;
     var CONFIG;
     var DOCUMENT_ID;  (if present)
     var ERROR_FROM_GET_REQUEST;  (if present)

  b. Wrap each function in a named export:
     - export function _firstCharToUpperCase(str) { ... }
     - export function _codifyText(inputString) { ... }
     - export function _uncodifyText(inputString) { ... }
     - export function _getRandomID({ idLength = 5, pool = [] } = {}) { ... }
     - export function _getEmptyChar() { ... }
     - export function _getLastUpdatedOnText(date) { ... }
     - export function _isObject(obj) { ... }
     - export function _objectExistsAndHasKeys(obj) { ... }
     - ... and ALL other utility functions in this file.

  c. Keep the function bodies EXACTLY the same. Do NOT refactor logic.

STEP 2: Do the same for these files:
  - assets/js/support/pages/dates.js → export all date functions
  - assets/js/support/pages/devices.js → export all device detection functions
  - assets/js/support/pages/messages.js → export message/error display functions

STEP 3: Create a NEW barrel file: assets/js/utils/index.js
  This re-exports everything from the utility modules:
    export { _firstCharToUpperCase, _codifyText, ... } from '../support/pages/data.js';
    export { ... } from '../support/pages/dates.js';
    export { ... } from '../support/pages/devices.js';
    export { ... } from '../support/pages/messages.js';
  (Use the actual function names from each file.)

STEP 4: Do NOT update any HTML files yet. This is just converting the JS files themselves.
The global functions still need to work because other files still reference them via global scope.
To maintain backward compatibility during transition, add this at the END of each converted file:

  // BACKWARD COMPAT: attach to window during migration
  Object.keys(exportedFunctions).forEach(fn => { window[fn] = exportedFunctions[fn]; });

Where exportedFunctions is an object of all exports from that file.

This allows the old <script> tags to still work while we convert the rest.
```

**Validation:** All existing functionality works. No errors in console. ES module syntax is valid.

---

### Prompt P10 — Convert Component Files to ES Modules

```
Continue converting JS files to ES modules. Now convert the component files.

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public

STEP 1: Convert these files in order (each depends on utils):

  a. assets/js/support/components/bimap.js
     - export the bimap class/functions
     - Add backward-compat window attachment

  b. assets/js/support/components/custom-select.js
     - export the custom select functions
     - Add backward-compat window attachment

  c. assets/js/support/components/dynamic-select.js
     - export dynamic select functions
     - Add backward-compat window attachment

  d. assets/js/support/components/sortable.js
     - export sortable functions
     - Add backward-compat window attachment

  e. assets/js/support/html/accordion.js
     - export accordion functions
     - Add backward-compat window attachment

  f. assets/js/support/html/embed.js
     - export embed functions
     - Add backward-compat window attachment

  g. assets/js/support/html/fields.js
     - export field validation functions
     - Add backward-compat window attachment

STEP 2: For each file:
  - Identify which utility functions it uses (look for _functionName calls)
  - Add import statements at the top:
    import { _functionName, _otherFunction } from '../support/pages/data.js';
  - Convert all function declarations to export function / export const
  - Add backward-compat window attachment at the bottom

STEP 3: Update the barrel file at assets/js/utils/index.js to also re-export components.

IMPORTANT: Do NOT change any function logic. Only add import/export syntax.
```

**Validation:** Components still work. No console errors.

---

### Prompt P11 — Convert Firebase Services to ES Modules

```
Convert the Firebase service layer to ES modules.

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public

STEP 1: Convert assets/js/support/firebase/database.js:
  - Export all functions: _get, _create, _set, _delete, _hasReadPermission, _buildDatabaseObject, etc.
  - Import any utility functions it uses from the utils barrel.
  - Keep the global ERROR_FROM_GET_REQUEST but export it:
    export const ERROR_FROM_GET_REQUEST = {};
  - Add backward-compat window attachment.

STEP 2: Convert assets/js/support/firebase/storage.js:
  - Export all storage functions.
  - Import from database.js if needed.

STEP 3: Convert assets/js/support/firebase/user.js:
  - Export user/auth functions.
  - Import from database.js if needed.

STEP 4: Convert assets/js/main/translation.js:
  - Export translation functions (_translatePage, translate, _getLanguagePackName, _loadTranslationLite, _loadLangSelectorSelect).
  - Import from utils as needed.

STEP 5: Convert assets/js/support/styles/colors.js, visibility.js, animations.js, stylesheets.js:
  - Export all functions.
  - Import from utils.

STEP 6: Create barrel files:
  - assets/js/services/index.js → re-exports from firebase/, translation
  - assets/js/styles/index.js → re-exports from styles/

STEP 7: Still keep backward-compat window attachments everywhere.
```

**Validation:** All Firebase operations work. Auth works. Translation works.

---

### Prompt P12 — Create Single JS Entry Point Per HTML Page

```
Now that all JS files are ES modules, create a single entry point per HTML page.
This replaces the 50+ <script> tags in each HTML file with ONE module script.

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public

STEP 1: For EACH HTML page, create ONE entry point file:

  a. assets/js/pages/index/index-entry.js
     - Import ALL the scripts that index.html currently loads in <script> tags
     - Import them in the CORRECT order (same as the <script> tag order)
     - Example structure:
       import '../main/translation.js';
       import '../main/main.js';
       import '../support/styles/animations.js';
       import '../support/pages/dates.js';
       ... (all in order)
     - The last import should be index.js which triggers page initialization.

  b. assets/js/pages/view/view-entry.js (for view.html)
  c. assets/js/pages/destination/destination-entry.js (for destination.html)
  d. assets/js/pages/expenses/expenses-entry.js (for expenses.html)
  e. assets/js/pages/itinerary/itinerary-entry.js (for itinerary.html)
  f. assets/js/pages/edit/trip-entry.js (for edit/trip.html)
  g. assets/js/pages/edit/destination-entry.js (for edit/destination.html)
  h. assets/js/pages/edit/listing-entry.js (for edit/listing.html)

STEP 2: In EACH HTML file:
  - REMOVE all <script data-main src="..."> tags (the project's own scripts)
  - KEEP the vendor <script> tags (jQuery, Bootstrap, AOS, etc.)
  - KEEP the Firebase SDK <script> tags
  - ADD a SINGLE module script at the end:
    <script type="module" src="assets/js/pages/index/index-entry.js"></script>

STEP 3: In main.js, check the _loadPage() / _getHTMLpage() function:
  - It uses window.location.pathname to determine which page is loaded.
  - This should still work since the HTML file names haven't changed.
  - Ensure the case mappings still match: "/view" → "viagem", etc.
  - Update the mappings to use the new EN-US internal names if main.js was already updated.

STEP 4: At this point, REMOVE the backward-compat window attachments from ALL files.
  - Remove the "BACKWARD COMPAT" blocks added in P9-P11.
  - Functions are now accessed purely via imports.

CRITICAL: Test each page one by one. The load order MUST be preserved exactly.
If a page breaks, check the console for undefined function errors and fix the import order.
```

**Validation:** Each HTML file has exactly 1 module script. Console clean. All pages work.

---

## Phase 4: Separation of Concerns & Architecture

### Prompt P13 — Extract Business Logic into Models

```
Now separate business logic (data transformation) from UI code.

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public

The "models" layer transforms raw Firestore data into display-ready formats.
It should be PURE functions — no DOM access, no Firebase calls.

STEP 1: Create assets/js/models/ with these files:

  a. trip.js — Trip data transformation:
     - Extract from pages/view/categories/summary.js: any function that formats trip data
       (e.g., formatting trip name, computing trip status, duration, timezone offset)
     - Extract from pages/edit-trip/: trip validation logic, data normalization before save
     - Functions should be pure: input = raw Firestore data, output = formatted data

  b. destination.js — Destination data transformation:
     - Extract from pages/view/categories/destination.js: formatting destination for display
     - Extract from pages/destination/: data formatting before render
     - Currency conversion logic, rating formatting, multi-language description resolution

  c. itinerary.js — Itinerary data transformation:
     - Extract from pages/view/categories/itinerary-module/: formatting, grouping, sorting
     - Extract from pages/itinerary/: data formatting
     - Date-to-calendar mapping, day grouping, time formatting

  d. expense.js — Expense data transformation:
     - Extract from pages/expenses/: currency conversion, category grouping, totals

  e. traveler.js — Traveler data transformation:
     - Extract traveler-related formatting from view and edit-trip pages.

STEP 2: For each extracted function:
  - Move it to the appropriate model file.
  - Export it.
  - Import it in the original file where it was used.
  - Ensure the function signature doesn't change.

STEP 3: Run the app and verify everything still works.
  - All pages should load and display data identically.

IMPORTANT: This is MOVING functions, not rewriting them. The logic stays identical.
Only the file location and import/export change.
```

**Validation:** All pages work. Models contain only pure data transformation functions.

---

### Prompt P14 — Create Clean Service Layer

```
Clean up the service layer so that pages never call Firebase directly.

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public

STEP 1: Create assets/js/services/trip-service.js:
  - Move ALL Firestore trip-related calls from page files into this service.
  - Functions like:
    - getTrip(tripId)
    - getTripsForUser(userId)
    - createTrip(tripData)
    - updateTrip(tripId, tripData)
    - deleteTrip(tripId)
  - These wrap the raw database.js functions with trip-specific logic.
  - Import from database.js, export clean async functions.

STEP 2: Create assets/js/services/destination-service.js:
  - getDestination(destId)
  - getDestinationsForTrip(tripId)
  - createDestination(destData)
  - updateDestination(destId, destData)
  - deleteDestination(destId)

STEP 3: Create assets/js/services/expense-service.js:
  - getExpenses(tripId)
  - updateExpenses(tripId, expensesData)

STEP 4: Create assets/js/services/auth-service.js:
  - Wrap user.js functions: login, logout, getCurrentUser, authStateChanged
  - This is the ONLY service that pages should import for auth.

STEP 5: Update assets/js/services/index.js to re-export everything.

STEP 6: Update ALL page files to import from services/ instead of directly from firebase/.
  - Search for any import from '../support/firebase/database.js' in page files.
  - Replace with the appropriate service import.

STEP 7: After this, NO page file should directly import from support/firebase/.
  Only services/ may import from support/firebase/.

CRITICAL: Test every CRUD operation across all pages.
```

**Validation:** All CRUD works. Zero direct Firebase imports in page files.

---

### Prompt P15 — Remove CONFIG Global, Use Config Module

```
Eliminate the global CONFIG variable. Replace it with a proper ES module.

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public

CURRENT STATE:
  - main.js loads 8 JSON files via jQuery $.getJSON and assigns them to global CONFIG.
  - All files access CONFIG.cores, CONFIG.language, CONFIG.transportes, etc.
  - CONFIG is declared as `var CONFIG;` in data.js.

STEP 1: Create assets/js/core/config.js:

  This module will:
  a. Lazily load and cache JSON configs.
  b. Export async functions to get each config:
     - export async function getCores() { ... }    // cores.json
     - export async function getDestinos() { ... }  // destinos.json
     - export async function getItinerary() { ... } // itinerary.json
     - export async function getMoedas() { ... }    // moedas.json
     - export async function getTransportes() { ... } // transportes.json
     - export async function getIcons() { ... }     // icons.json
     - export async function getVersoes() { ... }   // version.json
     - export async function getLanguage() { ... }  // languages/{pack}.json
     - export async function getConfig() { ... }    // loads ALL configs, returns object

  c. Cache: once loaded, return cached value (singleton pattern).
  d. Use fetch() instead of jQuery $.getJSON.

STEP 2: Update main.js:
  - Remove the Promise.all($.getJSON(...)) block that builds CONFIG.
  - Instead: import { getConfig } from '../core/config.js';
  - Call getConfig() and pass the result to functions that need it.
  - Store the config object in a local variable or module-level const, NOT on window.

STEP 3: Update ALL files that reference CONFIG.xxx:
  - Replace CONFIG.cores with imported getCores() or accept config as parameter.
  - Pattern: instead of accessing CONFIG globally, functions receive config as argument
    OR import the specific getter from config.js.

  For functions called many times with CONFIG, use the pattern:
    import { getCores } from '../../core/config.js';
    const cores = await getCores();

  For functions that don't need to be async, accept config as parameter:
    function formatDestination(dest, config) { ... }

STEP 4: Remove `var CONFIG;` from data.js.

IMPORTANT: This is the most invasive change. Work file by file.
Test after each file change. Do NOT try to change everything at once.
Start with leaf files (utilities) and work up to pages.
```

**Validation:** CONFIG is no longer a global variable. All pages work. Config is loaded once and cached.

---

### Prompt P16 — Create Shared HTML Partials & Build-Time Injection

```
Reduce HTML duplication by extracting shared sections.

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase

STEP 1: Create public/shared/ folder with these partials:

  a. shared/head.html — The common <head> content:
     - Meta charset, viewport
     - Title (keep as <title>{{PAGE_TITLE}}</title> placeholder)
     - OG meta tags
     - Apple meta tags
     - Favicon links
     - Google Fonts link
     - Vendor CSS links (aos, bootstrap, bootstrap-icons, boxicons, glightbox, swiper)

  b. shared/scripts-vendor.html — Vendor JS (loaded by all pages):
     - Firebase SDK scripts
     - jQuery, Bootstrap, AOS, GLightbox, Isotope, Swiper, Typed.js, Waypoints
     - Iconify, Google API
     - Sortable (only for edit pages — note this)

  c. shared/scripts-core.html — Core JS module script:
     - The single <script type="module" src="..."> tag for each page's entry point.
     - Use placeholder: <script type="module" src="{{ENTRY_POINT}}"></script>

  d. shared/top-bar.html — The top bar that appears in all pages:
     - Extract from index.html's top-bar div.
     - Check if all pages use the same top-bar structure.
     - If they differ, note the differences and we'll handle later.

STEP 2: Create a simple build script at scripts/inject-partials.js (Node.js):
  - Reads each HTML file in public/ and public/edit/
  - Replaces <!-- #include shared/head.html --> with the actual content
  - Replaces {{PAGE_TITLE}} with the page-specific title
  - Replaces {{ENTRY_POINT}} with the page-specific entry point
  - Outputs to dist/ (already our build target from P0)

STEP 3: Update each HTML file:
  - Replace the duplicated <head> content with <!-- #include shared/head.html -->
  - Replace vendor scripts with <!-- #include shared/scripts-vendor.html -->
  - Replace the module script with <!-- #include shared/scripts-core.html -->
  - Keep page-specific <link> tags (page CSS) and page-specific content.

STEP 4: Update the build script from P0 to run inject-partials.js after copying.

STEP 5: Test: npm run build → dist/ has complete HTML files with all partials injected.

IMPORTANT: The partial injection happens at BUILD TIME, not runtime.
This keeps the app static (no server-side includes needed).
```

**Validation:** `npm run build` produces complete HTML. All pages render correctly from dist/.

---

### Prompt P17 — Rename All Functions & Variables to EN-US

```
Rename all remaining Portuguese function names and variable names to English.

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase\public

RULES:
- Do NOT change function logic — ONLY rename.
- Use your IDE's rename refactoring (F2) to rename symbols across all files.
- Rename one file at a time, verify, then move on.

MAPPING (function prefixes like _ are preserved, only the Portuguese root changes):

  Core/App:
  - (check main.js for any Portuguese-named functions)

  Utils (data.js):
  - (most are already generic: _getRandomID, _isObject, etc. — review and flag any Portuguese)

  Components:
  - "atribuicoes" → "attributions"
  - "carregamento" → "loading"
  - (check for any function names containing Portuguese words)

  Pages/view (viagem):
  - "hospedagens" → "accommodations"
  - "transportes" → "transportation"
  - "resumo" → "summary"
  - "calendario" → "calendar"
  - "programacao" → "itinerary"

  Pages/edit:
  - "editarViagem" → "editTrip"
  - "novaViagem" → "newTrip"
  - "setViagem" → "setTrip"
  - "viagemExistente" → "existingTrip"
  - (same pattern for destino→destination, listagem→listing)

  Pages/expenses (gastos):
  - "gastos" → "expenses"
  - "moeda" → "currency"

  Styles:
  - "cores" → "colors"
  - "animacoes" → "animations"
  - "visibilidade" → "visibility"

SYSTEMATIC APPROACH:
1. Search for Portuguese words across all .js files:
   - "viagem", "destino", "listagem", "gastos", "moeda", "cores", "animacoes",
     "visibilidade", "hospedagem", "transporte", "resumo", "calendario",
     "programacao", "atribuicoes", "carregamento", "navegacao", "dispositivos",
     "mensagens", "dados" (when used as noun, not "data" in English sense),
     "editar", "nova", "novo", "existente", "categorias", "descricao", "valor"

2. For each match, determine if it's:
   - A function name → rename with IDE refactoring
   - A variable name → rename with IDE refactoring
   - A string value (like page name) → check if it affects routing
   - An HTML id/class → check if CSS references it

3. Update _getHTMLpage() in main.js:
   - The case mappings like "/view" → "viagem" should now be "/view" → "view"
   - All internal page identifiers should be English.

4. Update ALL string comparisons throughout the codebase that check page names.

5. Update ALL functions to not have _ before name anymore.

AFTER ALL RENAMES: Run the app and test every page, every feature.
```

**Validation:** Zero Portuguese identifiers remain. All functionality preserved.

---

## Phase 5: Final Polish

### Prompt P18 — Final Validation, Documentation & Cleanup

```
Perform final validation and cleanup of the refactored project.

PROJECT ROOT: d:\Gabriel\Documentos\Coding\Trip-Viewer-Firebase

STEP 1: Build validation:
  - Run: npm run build
  - Verify dist/ folder structure matches target architecture (see top of plan).
  - Verify dist/ has NO .gitkeep or empty folders.
  - Verify firebase.json points to "dist".

STEP 2: Runtime validation checklist:
  For EACH page (index.html, view.html, destination.html, expenses.html,
  itinerary.html, edit/trip.html, edit/destination.html, edit/listing.html):

  ☐ Page loads without console errors
  ☐ Firebase data loads correctly
  ☐ Authentication works (login/logout)
  ☐ CRUD operations work (create, read, update, delete)
  ☐ Dark mode toggles correctly
  ☐ Translation works (EN/PT)
  ☐ Mobile responsive
  ☐ All modals/popups work
  ☐ All custom components work (selects, accordions, sortables)
  ☐ Embeds work (Instagram, TikTok, YouTube)
  ☐ PIN/sensitive data protection works
  ☐ Share functionality works
  ☐ Export/backup works

STEP 3: Clean up:
  - Remove any backup files (*.bak, *.old) created during refactoring.
  - Remove the old *-dark.css files if they still exist.
  - Remove any empty folders left from renames.
  - Ensure .gitignore includes dist/ and node_modules/.

STEP 4: Update README.md:
  - Add a "Project Structure" section documenting the new architecture.
  - Add build instructions (npm run build, npm run watch).
  - Update the E034 epic to mark individual items as done.

STEP 5: Create a "lessons-learned" comment block at the top of refactoring-plan.md:
  - What went well
  - What was tricky
  - What would you do differently
```

**Validation:** Complete project builds, deploys, and all features work.

---

## 📊 Progress Tracker

| #   | Prompt                                      | Status     |
| --- | ------------------------------------------- | ---------- |
| P0  | Set Up Bundler & Build Pipeline             | ✅ Done    |
| P1  | Rename JS Folders/Files to EN-US            | ✅ Done    |
| P2  | Rename CSS Folders to EN-US                 | ✅ Done    |
| P3  | Update Script/CSS Paths in HTML             | ✅ Done    |
| P4  | Rename CSS Files Themselves                 | ✅ Done    |
| P5  | Extract Shared CSS into base/               | ✅ Done    |
| P6  | Extract Shared Component CSS                | ✅ Done    |
| P7  | Clean Unused CSS Properties                 | ✅ Done    |
| P8  | Single Dark Mode System                     | ✅ Done    |
| P9  | Convert Utility Files to ES Modules         | ✅ Done    |
| P10 | Convert Component Files to ES Modules       | ✅ Done    |
| P11 | Convert Firebase Services to ES Modules     | ✅ Done    |
| P12 | Single JS Entry Point Per HTML              | ✅ Done    |
| P13 | Extract Business Logic into Models          | ✅ Done    |
| P14 | Create Clean Service Layer                  | ✅ Done    |
| P15 | Remove CONFIG Global, Use Config Module     | ✅ Done    |
| P16 | Shared HTML Partials & Build-Time Injection | ✅ Done    |
| P17 | Rename All Functions/Variables to EN-US     | ✅ Done    |
| P18 | Final Validation & Cleanup                  | ✅ Done    |

---

## 🔗 Related Epics

| Epic | Description                     | Dependency                         |
| ---- | ------------------------------- | ---------------------------------- |
| E016 | New Front-End: destination.html | Blocks until Phase 2 complete      |
| E027 | New Front-End: view.html        | Blocks until Phase 2 complete      |
| E044 | New Front-End: edit pages       | Blocks until Phase 2 complete      |
| E045 | New Front-End: itinerary.html   | Blocks until Phase 2 complete      |
| E046 | New Front-End: expenses.html    | Blocks until Phase 2 complete      |
| E043 | Offline Mode                    | Independent, but easier after E034 |

---

## ⚠️ Critical Notes

1. **Test after EVERY prompt.** Each prompt ends with a validation step. Do not skip validation.
2. **Commit after each phase.** Use git to checkpoint. If something breaks, you can diff/revert.
3. **The app must remain functional at all times.** This is a living production app. No "broken window" periods.
4. **Firebase SDK stays as compat (namespaced).** Do NOT migrate to modular Firebase SDK in this refactoring — that's a separate epic.
5. **jQuery stays.** Removing jQuery is a separate epic. This refactoring keeps it.
6. **Bootstrap stays.** Same reasoning.
7. **Do NOT change Firebase structure or Firestore rules.** This is frontend-only.
