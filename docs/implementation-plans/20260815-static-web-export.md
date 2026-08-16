# Implementation Plan: Export as Static Web Page (Offline Mode)

**Status:** Proposed
**Date:** 2026-08-15
**Owner:** TBD
**Related backlog:** ⚔️ E043 — Export as static web page (Offline Mode) *(currently Medium Priority)*
**Related docs:**
- `.github/skills/build-pipeline` (build flow, esbuild, HTML injection, hash-assets)
- `.github/skills/typescript-conventions` (module organization, service layer, entry points)
- `.github/skills/backup-restore` (dialog-step UI, PIN flow, security warning, document bundle format)
- `.github/skills/data-model` (trip/destination/listing schema, PIN two-tier storage)
- `docs/implementation-plans/20260815-cache-busting-strategy.md` (parallel-prompt format this doc follows)

---

## 1. Goal

From the index **Settings** panel, let the user export a single document (trip, listing, or destination) as a **self-contained, downloadable ZIP** that renders the current `view.html` / `destination.html` experience **without Firebase**, reading the document and its associated data from **local JSON files** instead.

Two fidelity modes:

- **Light mode** — documents/JSON are static; images remain external URLs (smaller, still needs network for media).
- **Complete mode** — every image mapped on any exported document is pre-downloaded and saved inside the ZIP (heavier, fully offline for mapped media).

User-customizable: **app title** and **icon** (so it can later be installed as a customized PWA).

Non-goals:

- Never export `index.html`, edit pages, standalone `expenses.html`/`itinerary.html`, Firebase config, or any file not reachable from the exported entry point.
- Do **not** change the Firestore data model, the normal deploy flow, the esbuild format, or the per-page entry structure.
- Do **not** make the exported page communicate with Firebase in any way (no SDK, no Auth, no Firestore).

---

## 2. Current state (context map)

| Concern | Today | Key files |
|---|---|---|
| Build pipeline | `public/ → dist/`, injects HTML partials, esbuild-compiles `.ts → .js` (per-file ESM, no bundling), content-hashes in prod | `scripts/build/build.js`, `inject-partials.js`, `hash-assets.js` |
| Firebase bootstrap | Firebase compat SDK from reserved `/__/firebase/*`, `/__/firebase/init.js`, root `index.js` imports `firebase-config.js` and calls `startFirebase()` | `public/shared/scripts-vendor.html`, `index.js`, `firebase-config.js` |
| Firebase read choke points | `get(path)`, `getAccommodations`, `getTransportation`, `getItinerary`, `getUser*Summaries`, `getSingleData`, `getTripComplete` | `public/assets/ts/data/firebase/database.ts` |
| Auth choke point | `getUID()` via `firebase.auth().onAuthStateChanged` | `public/assets/ts/data/firebase/auth.ts` |
| App boot | `main()` → `loadAllConfigs()` → `translatePage()` → `initializeApp()` (reads `firebase.app().options.projectId`) → page loader | `public/assets/ts/app/main.ts` |
| Exportable entry points | `view.html` (trip/listing via `?t=` / `?l=`), `destination.html` (destination via `?d=`) | `public/view.html`, `public/destination.html` |
| Document export precedent | Per-document JSON export with type selector → doc list → PIN table → download, plus security warning | `public/assets/ts/backup/export-documents.ts` |
| Dialog/PIN UI | `displayFullMessage`, `MESSAGE_PROPERTIES`, PIN table pattern, styles in `components/modal.css` | `utils/messages.ts`, `backup/export-documents.ts` |
| Asset fingerprinting | Deep content-hash + reference rewrite (HTML/JS/CSS/JSON) — already walks import graph + `url()`/`fetch()` | `scripts/build/hash-assets.js` |
| Dev nav helper | Injected but renders only with `?ai=1` (AI/dev only) | `public/shared/nav-helper.html` |
| Zipping | Not present today | — |

**Key facts:**

- The built `dist/` page HTML already contains the **final** (prod: hashed) asset URLs, injected partials, and the Firebase `<script>` tags.
- `hash-assets.js` already parses the JS import graph, CSS `@import`/`url()`, and JS `fetch()` literals — this is exactly the machinery needed to compute "which files does this page actually use".
- `view.ts` loads a trip via `getTripComplete(tripId, false)` (single trip doc read + subcollection readers); `destination.ts` loads via `mountDestination` → `get` on `destinations/{id}`.
- Protected data is read at runtime via `get(`${type}/protected/${PIN}/${id}`)` and `expenses/protected/${PIN}/${id}` — so the local bundle must expose those exact paths.
- The `firebase` global is hard-referenced by many compiled modules; a static page therefore needs either a defensive stub or guards at every Firebase touch point (we do **both**: guards at the choke points + a loud stub for anything missed).

---

## 3. Target architecture

```
Settings → exportStaticOnClickAction()
   │
   ├─ 1. Security warning dialog (plain-text data, same as backup/export)
   ├─ 2. Type selector: trip | listing | destination
   ├─ 3. Document list (from user summaries, like export-documents)
   ├─ 4. PIN (if trip uses pin:sensitive-only) — REQUIRED, cannot skip
   ├─ 5. Mode: light | complete
   ├─ 6. App title + icon (optional)
   └─ 7. Build & download ZIP
```

```mermaid
flowchart LR
  subgraph Browser["Browser (index settings)"]
    UI[Dialog steps 1-6]
    GATHER[data-gather.ts<br/>build data.json]
    BUILDER[build-zip.ts<br/>fetch manifest+assets<br/>transform HTML<br/>download images]
    ZIP[JSZip → download]
  end

  subgraph Build["Build pipeline (Node)"]
    BUILD[build.js]
    GRAPH[asset-graph.js<br/>parse imports/url/fetch]
    MANIFEST[gen-static-export-manifest.js<br/>dist/static-export-manifest.json]
  end

  subgraph StaticPage["Exported static page"]
    HTML[view.html / destination.html<br/>no Firebase, rebased URLs]
    CFG[static-config.js bootstrap]
    DATA[data.json local bundle]
    MODE[static-mode.ts<br/>StaticStore reads data.json]
  end

  UI --> GATHER --> BUILDER --> ZIP
  BUILD --> GRAPH --> MANIFEST
  MANIFEST -- "fetch(manifest)" --> BUILDER
  CFG --> MODE --> HTML
  DATA --> MODE
```

**Where the export runs (decision): fully client-side in the browser.**

- Firebase free tier ⇒ no Functions/Storage; the Cloudflare worker is only a local Places-API proxy, not a general backend.
- All needed data is already readable client-side via the Firestore SDK the app already uses.
- The static assets to package are already served by Firebase Hosting (`dist/`) and fetchable same-origin.
- The Settings UI is already a client-side dialog-step flow (backup/restore) — this mirrors it exactly.
- ZIP is produced in-browser with a vendored **JSZip** (consistent with the existing vendor-script pattern).

No server, no new deployment target, no Firebase Function, no worker change.

---

## 4. Spec → solution map

| Requirement | Solution | Reuse (don't duplicate) |
|---|---|---|
| Export option in index Settings | New button + `registerActions` entry, wired like `export-documents` | `home/support/event-listeners.ts`, `index.html` |
| Dialog steps like backup/restore | `displayFullMessage`/`MESSAGE_PROPERTIES` + PIN table + `start/stopLoadingScreen` | `utils/messages.ts`, `backup/export-documents.ts` patterns |
| Same exposed-data warning | Reuse the security-warning text pattern | `account.export_documents.security_warning` (new key) |
| Select a document (trip/destination/listing) | Same type→list flow using user summary subcollections | `getUser*Summaries` |
| PIN required, can't skip | Trip-only; validate 4 digits before proceeding (unlike JSON export which allows skipping) | PIN table UI |
| Gather associated docs → local JSON | Shared bundle builder + `data.json` with `paths` map | extract from `backup/export-documents.ts` |
| Light vs complete mode | Light keeps external URLs; complete downloads & rewrites mapped images | image-URL inventory in `data-gather.ts` |
| App title + icon | Inputs in dialog; applied to `<title>`, generated `site.webmanifest`, icons | PWA meta already in `head.html` |
| Use current public code, not a fork | Build-time **manifest** of exactly the files each entry needs | extend `hash-assets.js` import-graph walk |
| Entry point = view (trip/listing) or destination | Manifest exposes per-entry file sets; builder picks one | `PAGES[]` in `inject-partials.js` |
| Never export index/edit/etc. | Manifest whitelist is entry-derived; index/edit/expenses/itinerary excluded by construction | — |
| No TripViewer logo link, no home/back buttons | Export-time HTML transform (logo `<a>` → `<div>`, remove `#back`/`#closeButton`, strip `nav-helper`) | served HTML post-processing |
| No Firebase in exported page | Strip `/__/firebase/*` + `index.js` module script; inject static bootstrap | served HTML post-processing |
| Static mode runtime flag | `window.TRIPVIEWER_STATIC` + `static-mode.ts` + guards in DB/auth choke points | single flag consumed everywhere |
| Smart: no tinkering on future changes | Manifest regenerated every build from the actual import/asset graph | `asset-graph.js` (shared with hash-assets) |
| Files out of context excluded | Manifest lists only reachable files + fixed favicon/manifest set | per-entry transitive closure |

---

## 5. Shared contract (flags / files / schemas)

This contract lets the three P1 workstreams be built in parallel with zero shared files.

### 5.1 Runtime globals (set by the injected bootstrap, before the entry module)

```html
<script>
  window.TRIPVIEWER_STATIC = true;
  window.TRIPVIEWER_STATIC_CONFIG = {
    title: "My Trip",                // user-chosen app/page title
    icon: "images/icon-192.png",     // optional custom icon path ("" = default)
    ownerUid: "eySH...",             // owner uid copied from export meta
    dataUrl: "data.json",            // relative path to local data bundle
    mode: "light" | "complete"
  };
  // Defensive stub — turns any UNGUARDED Firebase call into a loud error during dev/verification
  window.firebase = {
    app: function () { return { options: { projectId: 'static-export' } }; },
    auth: function () { throw new Error('[static-export] firebase.auth() called unexpectedly'); },
    firestore: function () { throw new Error('[static-export] firebase.firestore() called unexpectedly'); },
    storage: function () { throw new Error('[static-export] firebase.storage() called unexpectedly'); }
  };
</script>
```

### 5.2 `data.json` schema (local bundle)

```json
{
  "meta": {
    "version": 1,
    "type": "trip | listing | destination",
    "sourceId": "<docId>",
    "title": "<doc title>",
    "exportedAt": "ISO-8601",
    "ownerUid": "<uid>",
    "mode": "light | complete",
    "images": { "<originalUrl>": "images/<sha1-12>.<ext>" }
  },
  "paths": {
    "trips/<id>": { "...trip doc..." },
    "trips/<id>/accommodations": { "<accId>": { "id": "<accId>", "...fields..." } },
    "trips/<id>/transportation": { "_settings": { "viewMode": "simple" }, "<legId>": { "id": "<legId>", "...fields..." } },
    "trips/<id>/itinerary": { "<dayId>": { "id": "<dayId>", "...fields..." } },
    "trips/protected/<pin>/<id>": { "...protected trip doc..." },
    "expenses/<id>": { "...expenses doc..." },
    "expenses/protected/<pin>/<id>": { "...protected expenses doc..." },
    "destinations/<id>": { "...destination doc..." },
    "listings/<id>": { "...listing doc..." },
    "protected/<id>": { "pin": "<pin>", "sharing": { "...": "..." } }
  }
}
```

> `paths` keys are the **exact** Firestore paths the app requests at runtime, so `StaticStore` is a trivial `paths[key]` lookup — no path translation. Collection values are stored in the **same shape the real readers return** (`{id, ...}` maps for acc/itinerary; `{_settings, ...}` for transportation).

### 5.3 `static-export-manifest.json` schema (emitted by the build)

```json
{
  "generatedAt": "ISO-8601",
  "mode": "prod | dev",
  "entries": {
    "view": {
      "html": "view.html",
      "files": ["view.html", "assets/ts/.../view-entry.<hash>.js", "...", "assets/css/**", "assets/json/**", "assets/vendor/**", "assets/fonts/**", "assets/img/**", "apple-touch-icon.png", "favicon-*.png", "favicon.ico", "site.webmanifest", "browserconfig.xml", "safari-pinned-tab.svg", "mstile-150x150.png", "android-chrome-*.png"]
    },
    "destination": { "html": "destination.html", "files": ["..."] }
  }
}
```

`files` is the **transitive closure** from the entry HTML + entry JS (imports, dynamic imports, `fetch("/assets/...")`, CSS `@import`/`url()`, JSON asset-path strings) **plus** a fixed favicon/manifest set from `head.html`. Excluded by construction: `index.html`, `edit/**`, `expenses.html`, `itinerary.html`, `index.js`, `firebase-config.js`, `firebase.json`, `firebase.dev.json`, `reload`, and the manifest itself.

### 5.4 Static-mode module API (`static-mode/static-mode.ts`)

```ts
export function isStaticMode(): boolean;                       // window.TRIPVIEWER_STATIC === true
export function staticConfig(): StaticConfig;                   // window.TRIPVIEWER_STATIC_CONFIG
export async function loadStaticData(): Promise<void>;          // fetch(dataUrl) → in-memory store
export function getStaticDoc(path: string): any | undefined;    // paths[path]
export function getStaticCollection(path: string): any;         // paths[path] (already reader-shaped)
```

### 5.5 Module ownership (avoid merge conflicts across prompts)

| File | Owner |
|---|---|
| `public/assets/ts/static-mode/static-mode.ts` (new) | P1-A only |
| `public/assets/ts/data/firebase/database.ts` | P1-A only |
| `public/assets/ts/data/firebase/auth.ts` | P1-A only |
| `public/assets/ts/app/main.ts` | P1-A only |
| `scripts/build/asset-graph.js` (new) | P1-B only |
| `scripts/build/gen-static-export-manifest.js` (new) | P1-B only |
| `scripts/build/hash-assets.js` | P1-B only (refactor to asset-graph; no behavior change) |
| `scripts/build/build.js` | P1-B only (add manifest step) |
| `public/assets/ts/backup/document-bundle.ts` (new) | P1-C only |
| `public/assets/ts/backup/export-documents.ts` | P1-C only (refactor to use document-bundle; JSON output unchanged) |
| `public/assets/ts/static-export/data-gather.ts` (new) | P1-C only |
| `public/assets/ts/static-export/export-static.ts` (new) | P1-C only |
| `public/index.html` | P1-C only |
| `public/assets/ts/pages/home/support/event-listeners.ts` | P1-C only |
| `public/assets/json/languages/en.json`, `pt.json` | P1-C only |
| `public/assets/css/components/modal.css` | P1-C only |
| `public/assets/vendor/jszip/jszip.min.js` (new) + `vendor.d.ts` | P1-C only |
| `public/assets/ts/static-export/build-zip.ts` (new) | P2 + P3 |
| `.github/skills/*`, `README.md`, `docs/README.md`, CHANGELOG, repo memory | P4 only |

---

## 6. Workstreams — 6 prompts, 3 parallel at the start

```
P1-A (runtime static-mode seam)   ─┐
P1-B (build asset-graph + manifest)├─► P2 (export builder + ZIP) ─► P3 (polish + edge cases) ─► P4 (verify + docs)
P1-C (export UI + data gathering) ─┘
```

---

### Prompt 1-A — Runtime static-mode seam

**Goal:** the exported page can boot and render with **no Firebase SDK**, reading documents from a local `data.json`.

**Do:**

1. New `public/assets/ts/static-mode/static-mode.ts`:
   - `isStaticMode()`, `staticConfig()`, `loadStaticData()` (fetch `dataUrl` once, cache in module), `getStaticDoc(path)`, `getStaticCollection(path)`.
   - `installFirebaseStub()` — sets the §5.1 defensive `window.firebase` (no-op if already present). Called from `loadStaticData()` or main guard.
2. `public/assets/ts/data/firebase/database.ts` — at the top of **read-only** functions, short-circuit to the static store when `isStaticMode()`:
   - `get(path)` → `getStaticDoc(path)` (return `undefined` when missing; do not set `ERROR_FROM_GET_REQUEST`).
   - `getAccommodations(tripId)` → `getStaticCollection(\`trips/${tripId}/accommodations\`)` (array of `{id,...}`).
   - `getTransportation(tripId)` → `getStaticCollection(...)` returning `{ legs, settings }`.
   - `getItinerary(tripId)` → array of `{id,...}`.
   - `getUser*Summaries(uid)` → not used by view/destination pages, but guard anyway to return `[]` (prevents stray Firestore calls).
   - Leave write paths (`create/update/override/delete*`) untouched — they are never reached in static mode, and the stub will scream if they are.
3. `public/assets/ts/data/firebase/auth.ts` — `getUID()` returns `staticConfig().ownerUid` in static mode; `getUser()` returns `undefined`. (No `firebase.auth()` call.)
4. `public/assets/ts/app/main.ts` — `initializeApp()`: in static mode set `APP.projectId = 'static-export'` (skip `firebase.app().options.projectId`); skip `startFirebase`-related logic (not present in this file anyway).
5. In `main()` (or `loadStaticData()`), if static mode, `await loadStaticData()` **before** `loadAllConfigs()` so the store is ready before page loaders run.

**Acceptance:**

- Hand-crafted fixture (`view.html` with the §5.1 bootstrap + a `data.json` for a trip) renders the trip in a browser with **no** `/__/firebase/*` scripts present and **no** `firebase is not defined`.
- Sensitive reservation reveal works (reads `trips/protected/{pin}/{id}` from the store).
- In normal (non-static) mode, all existing behavior is unchanged (`npm run build` + a smoke test of `view.html`).

---

### Prompt 1-B — Build asset-graph + export manifest

**Goal:** the build emits `dist/static-export-manifest.json` listing, per exportable entry, exactly the files it needs — automatically, so future code changes never require manual manifest edits.

**Do:**

1. New `scripts/build/asset-graph.js`:
   - Extract from `hash-assets.js` the specifier/reference parsing (JS `import`/`export … from`/dynamic `import()`/string-literal `fetch()`/`new URL(…, import.meta.url)`, CSS `@import`/`url()`, JSON asset-path values) and the local-spec resolver into reusable, exported functions (`collectLocalFiles`, `walkImports(root, entryFiles)`).
   - Refactor `hash-assets.js` to use `asset-graph.js` (byte-identical output for the existing hashing pass).
2. New `scripts/build/gen-static-export-manifest.js`:
   - Define the fixed head-assets set (favicons, `site.webmanifest`, `browserconfig.xml`, `safari-pinned-tab.svg`, `mstile-150x150.png`, `android-chrome-*`).
   - For each entry (`view.html`, `destination.html`): parse HTML for `<script src>`/`<link href>`/`<img src>`/`<link rel="manifest">`, then walk the entry JS/CSS/JSON closure with `asset-graph.js`, then union with the fixed head set.
   - **Exclude** `index.html`, `edit/**`, `expenses.html`, `itinerary.html`, `index.js`, `firebase-config.js`, `firebase.json`, `firebase.dev.json`, `reload`, and `static-export-manifest.json` itself. Do **not** include `/__/firebase/*`, `https://`, `//`, `data:` references (external by design).
   - Write `dist/static-export-manifest.json` (§5.3), with **final (hashed in prod)** filenames.
3. `scripts/build/build.js`:
   - Call `gen-static-export-manifest.js` **after** `hash-assets.js` in prod, and after TS compile in dev (so it always sees final `dist/`).
4. `scripts/build/hash-assets.js` — add `static-export-manifest.json` to `EXCLUDED_FILES` so it is never renamed/rewritten.

**Acceptance:**

- `npm run build` (prod) and `npm run watch` (dev) both produce a valid `dist/static-export-manifest.json`.
- The manifest's `view`/`destination` file sets contain **no** `index.html`, edit pages, `index.js`, or `firebase-config.js`.
- Adding a new import to a view module changes the manifest automatically on the next build; removing it shrinks it. Two identical builds produce byte-identical manifests.

---

### Prompt 1-C — Export UI + data gathering + shared bundle extraction

**Goal:** the Settings dialog flow exists end-to-end up to producing a correct `data.json` (zip comes in P2).

**Do:**

1. New `public/assets/ts/backup/document-bundle.ts`:
   - Extract the pure gather logic currently private in `export-documents.ts`: `getCollectionDocs`, `getDocument`, `fetchReferencedDestinations`, `fetchProtectedData`, and `buildTripExport`/`buildDestinationExport`/`buildListingExport` bodies (returning the same `{ _meta, trip/destination/listing, accommodations?, transportation?, itinerary?, expenses?, destinations?, protected? }` shape).
   - Refactor `export-documents.ts` to call it — **JSON export output must stay byte-for-byte compatible** (same `_meta`, same fields).
2. New `public/assets/ts/static-export/data-gather.ts`:
   - `buildStaticData(type, id, pin, mode)` → uses `document-bundle.ts`, then flattens into the §5.2 `paths` map (trip → `trips/{id}`, subcollections → reader-shaped maps, protected → `trips/protected/{pin}/{id}` + `expenses/protected/{pin}/{id}` when the expenses module is on, referenced/full destinations → `destinations/{id}`, listing → `listings/{id}`, `protected/{id}` lookup).
   - `collectImageUrls(doc)` → inventory of image URLs from the **known image-bearing fields** only: trip `image.background`, `gallery.images[].link`, accommodations `images[].link`, transportation (none), destination `image.background`, destination entry `images[].link`, listing `image.background` (if present), plus any `logo` fields. Store into `meta.images` (empty in light mode).
   - Validate the 4-digit PIN when the trip is `pin: sensitive-only` (reject before building).
3. New `public/assets/ts/static-export/export-static.ts`:
   - `exportStaticOnClickAction()` → dialog steps: **security warning** → **type selector** (trip/listing/destination) → **document list** (from `getUser*Summaries`, single-select) → **PIN** (required for protected trips; reuse the PIN table pattern but single row + validation) → **mode** (light/complete radio) → **title + icon** (text input + optional image file input) → call the P2 builder.
   - Use `displayFullMessage`/`MESSAGE_PROPERTIES`, `start/stopLoadingScreen`, `openToast`.
4. `public/index.html` — add a Settings button: `data-action="export-static"` (icon + `data-translate="account.export_static.title"`).
5. `public/assets/ts/pages/home/support/event-listeners.ts` — `registerActions({ 'export-static': () => exportStaticOnClickAction(), ... })`.
6. i18n — add `account.export_static.*` keys in `en.json` + `pt.json` (title, warning, select_type, select_document, pin_instruction, pin_required, mode_light, mode_complete, mode_light_hint, mode_complete_hint, app_title, app_icon, build, building, success, partial_success, failed, none_selected, no_documents).
7. CSS — add static-export dialog styles next to the existing `.export-documents-*` block in `public/assets/css/components/modal.css`.
8. Vendor — add `public/assets/vendor/jszip/jszip.min.js`, a `<script>` tag **only on `index.html`** (not `scripts-vendor.html`, so it never leaks into exports), and a `JSZip` declaration in `public/assets/ts/vendor.d.ts`.

**Acceptance:**

- Clicking the new Settings action walks all dialog steps with correct i18n and dark-mode styling.
- Selecting a protected trip **requires** a valid 4-digit PIN; invalid input blocks progression.
- In dev, the flow produces a `data.json` (temporarily downloadable for inspection) whose `paths` keys exactly match the runtime requests and whose `meta.images` inventory is complete for complete mode.
- Existing `export-documents` JSON export still produces identical files (regression check).

---

### Prompt 2 — Export builder + ZIP (integration)

**Goal:** the full flow produces a working, downloadable ZIP that renders standalone.

**Do:**

1. New `public/assets/ts/static-export/build-zip.ts`:
   - `buildStaticExport(entry, data, config)`:
     a. `fetch('static-export-manifest.json')` → pick `entries[entry]` (`view` for trip/listing, `destination` for destination).
     b. `fetch` each file in `files` (same-origin). Keep the zip path = manifest path.
     c. **Transform the entry HTML**:
        - Remove `/__/firebase/*` `<script>`s and `<script type="module" src="index.js">` (the Firebase bootstrap).
        - Inject the §5.1 static bootstrap `<script>` (with title/icon/ownerUid/dataUrl/mode) **before** the entry module `<script>`.
        - Rebase root-absolute asset URLs (`/assets/…`, `/apple-touch-icon.png`, `/favicon*`, `/site.webmanifest`, `/browserconfig.xml`, `/safari-pinned-tab.svg`, `/mstile-150x150.png`, `/android-chrome*`) to relative (`assets/…`, etc.) so it works from `file://` and subfolders. Do the same rebase for `assets/`-rooted paths inside CSS `url()` and any remaining JS literals if needed.
        - Strip the injected `nav-helper` block (dev-only) and any `reload`/livereload remnants.
        - Set `<title>` + PWA meta (`apple-mobile-web-app-title`, `theme-color`) from config.
     d. **Complete mode only**: for each URL in `meta.images`, `fetch` the image → save as `images/<sha1-12>.<ext>` → record mapping in `meta.images` → rewrite every occurrence of that URL inside `data.json` (and any inline HTML references) to the local path. Non-fetchable URLs (CORS/404) stay external and are counted for a warning.
     e. Write `data.json`, a generated `site.webmanifest` (custom name/icon), and the custom icon file(s) into the zip.
     f. Zip with `JSZip` → `Blob` → download (`YYYYMMDDHHMMSS-tripviewer-static-<type>-<slug>.zip`).
2. Wire the "Build" step of the P1-C dialog to call `buildStaticExport`.

**Acceptance:**

- Unzipping and opening `view.html`/`destination.html` via `file://` renders the document from `data.json` with zero network/Firebase requests (light mode: images still external).
- Complete mode: mapped images are inside `images/` and the page renders them locally (verify in DevTools network = none for those).
- The ZIP contains no `index.html`, edit pages, Firebase scripts, or `nav-helper` markup.

---

### Prompt 3 — Polish + edge cases

**Goal:** match the stated UI constraints precisely and harden the transform.

**Do:**

1. Top-bar: in the transform, replace the logo `<a href="…" class="logo-link">` with a non-link `<div class="logo-link">`; remove `#back`/`#closeButton` icons and any inline `window.location = '…index.html'` handlers.
2. Verify **no home/back** affordances remain on the exported page (desktop top-bar, mobile nav, back-to-top is fine — it's not a home button). Confirm the share button either works or is safely hidden in static mode (decide: hide it, since it shares a `file://` URL).
3. `destination.html` linked from a trip (`?t=…`): the static export of a **single destination** must hide the back button (already handled by transform); the static export of a **trip** must not break destination dialogs that lazily fetch full destination docs — confirm those docs are in `paths` (P1-C must include full referenced destinations for trips to keep itinerary/destination popups working).
4. Confirm no `expenses.html`/`itinerary.html`/edit pages leak; confirm the manifest pruning holds after a fresh build.
5. PWA: generated `site.webmanifest` uses the chosen title/icon; verify installability in a local static server context is acceptable (note `file://` installability limits).
6. Report partial image-download failures clearly in the completion toast.

**Acceptance:**

- Exported pages have no clickable TripViewer logo and no back/home buttons; logo renders as plain branding.
- Complete-mode partial failures are reported (`partial_success` with counts).
- A trip export renders itinerary destination popups without network access.

---

### Prompt 4 — Verify + document

**Goal:** regression-proof the feature and update skills/docs/backlog/memory.

**Do:**

1. **Regression:** `npx tsc --noEmit`, `npx biome check`, `npm run build`, `npm run dev` smoke test (index settings, JSON export unchanged, view/destination normal mode unchanged).
2. **New skill** `.github/skills/static-export/SKILL.md` — contract (§5), dialog flow, manifest format, light vs complete, static-mode seam, how to add/remove exportable assets, verification steps.
3. **Update existing skills:**
   - `build-pipeline/SKILL.md` — new manifest step + `asset-graph.js`.
   - `typescript-conventions/SKILL.md` — `static-mode/` + `static-export/` modules.
   - `backup-restore/SKILL.md` — shared `document-bundle.ts`.
4. **Docs:** `docs/README.md` index entry for this plan (if the index lists plans); confirm this file is listed.
5. **README/backlog:** mark ⚔️ E043 work as Done (August 2026, newest first) with sub-items for the implemented pieces (static-mode seam, manifest, export UI, ZIP builder, PWA customization). Run `npm run readme` per the backlog-management skill if it maintains counts/version.
6. **Version:** add a CHANGELOG entry (build syncs `package.json` from CHANGELOG automatically).
7. **Repo memory:** new `/memories/repo/static-export.md` (decisions, contract, gotchas: CORS on image download, manifest regen, stub strategy).

**Acceptance:**

- A reviewer can implement/verify static export from the skill + this plan alone.
- All normal build/dev flows pass; JSON export and normal page behavior are unchanged.
