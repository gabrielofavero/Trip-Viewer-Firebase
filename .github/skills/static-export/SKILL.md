---
name: static-export
description: 'Use when you need to understand, modify, debug, or extend the "Export as Static Web Page" (Offline Mode) feature — the runtime static-mode seam, the build-time export manifest, the Settings dialog flow, light vs complete fidelity, self-hosted icons/fonts, or how to add/remove exportable assets.'
applyTo: 'public/assets/ts/static-mode/**; public/assets/ts/static-export/**; public/assets/ts/backup/document-bundle.ts; scripts/build/asset-graph.js; scripts/build/gen-static-export-manifest.js; scripts/build/gen-iconify-bundle.js; scripts/build/vendor-fonts.js; public/assets/vendor/iconify/**; public/assets/vendor/jszip/**; public/assets/fonts/**; public/assets/css/fonts.css; docs/implementation-plans/20260815-static-web-export.md; workers/image-proxy/**'
---

# Static Web Export (Offline Mode)

Lets the user export a single document (trip, listing, or destination) as a
**self-contained, downloadable ZIP** that renders the `view.html` /
`destination.html` experience **without Firebase**, reading documents from a
local `data.json` bundle. The build emits a manifest of exactly the files each
entry needs, and the exported page self-hosts all app chrome (icons, fonts,
Chart.js) so the only remaining network is the user's own media (light mode)
and the optional Plyr video lightbox.

The authoritative spec is
`docs/implementation-plans/20260815-static-web-export.md` (§5 contract, P1–P4
prompts). This skill is the operational summary + maintenance guide.

---

## Architecture Overview

```
Settings → exportStaticOnClickAction()        (export-static.ts)
   │  security warning → type → doc list → PIN → mode → title/icon → build
   ▼
data-gather.ts ──buildStaticData()──► data.json bundle (paths map)
   │  (uses shared backup/document-bundle.ts builders)
   ▼
build-zip.ts ──buildStaticExport()──► fetch manifest + assets, transform
   │                                   entry HTML, download images, ZIP → download
   ▼
Exported page: view.html / destination.html  (no Firebase, rebased URLs)
   │  static-mode.ts reads data.json via StaticStore (plain paths[key])
```

Export building is fully client-side in the browser (vendored **JSZip** — the
script only ships on `index.html`, so it never leaks into exports). The only
server-side piece is the optional **image-proxy** worker
(`workers/image-proxy/`) used to batch-download CORS-blocked images in
complete mode — see "Complete mode images" below.

---

## Runtime contract (static-mode seam)

`public/assets/ts/static-mode/static-mode.ts` centralizes:

| Function | Purpose |
|---|---|
| `isStaticMode()` | `window.TRIPVIEWER_STATIC === true` |
| `staticConfig()` | `window.TRIPVIEWER_STATIC_CONFIG` (safe defaults) |
| `installFirebaseStub()` | Sets defensive `window.firebase` that throws on any unguarded auth/firestore/storage call |
| `loadStaticData()` | `fetch(dataUrl)` once → in-memory store |
| `getStaticDoc(path)` | `paths[path]` (single doc; `undefined` when missing) |
| `getStaticCollection(path)` | `paths[path]` (already reader-shaped) |

### Bootstrap (injected by the export transform)

```html
<script>
  window.TRIPVIEWER_STATIC = true;
  window.TRIPVIEWER_STATIC_CONFIG = {
    title: "My Trip", ownerUid: "<uid>", dataUrl: "data.json",
    mode: "light" | "complete"
  };
  window.firebase = { /* defensive stub — throws on unguarded calls */ };
</script>
```

### Read choke points (`data/firebase/database.ts`, `data/firebase/auth.ts`)

Read-only functions short-circuit to the static store when `isStaticMode()`:
`get()`, `getAccommodations()`, `getTransportation()`, `getItinerary()`,
`getUser*Summaries()` (return `[]`), and `getUID()` returns
`staticConfig().ownerUid`. **Write paths are never reached in static mode** — if
one fires, the stub screams. `app/main.ts` `initializeApp()` sets
`APP.projectId = 'static-export'` and awaits `loadStaticData()` before configs.

> **Rule:** keep every new read-only data access short-circuited through the
> static store, or the stub will turn it into a loud error during verification.

---

## `data.json` schema (local bundle)

```json
{
  "meta": {
    "version": 1, "type": "trip | listing | destination",
    "sourceId": "<docId>", "title": "<doc title>",
    "exportedAt": "ISO-8601", "ownerUid": "<uid>",
    "mode": "light | complete",
    "images": { "<originalUrl>": "images/<sha1-12>.<ext>" }
  },
  "paths": {
    "trips/<id>": { "...trip doc..." },
    "trips/<id>/accommodations": { "<accId>": { "id": "<accId>", "..." } },
    "trips/<id>/transportation": { "_settings": {...}, "<legId>": {...} },
    "trips/<id>/itinerary": { "<dayId>": { "id": "<dayId>", "..." } },
    "trips/protected/<pin>/<id>": { "...protected trip doc..." },
    "expenses/<id>": { "...expenses doc..." },
    "expenses/protected/<pin>/<id>": { "...protected expenses doc..." },
    "destinations/<id>": { "...destination doc..." },
    "listings/<id>": { "...listing doc..." },
    "protected/<id>": { "pin": "<pin>", "sharing": {...} }
  }
}
```

`paths` keys are the **exact** Firestore paths the app requests at runtime, so
`StaticStore` is a trivial lookup — no path translation. Collection values are
stored in the **same shape the real readers return** (`{id, ...}` maps; `_settings`
for transportation).

---

## Build-time manifest (`static-export-manifest.json`)

`scripts/build/gen-static-export-manifest.js` emits `dist/static-export-manifest.json`
on every build (after esbuild + hash-assets, so it sees final hashed names):

```json
{
  "generatedAt": "ISO-8601", "mode": "prod | dev",
  "entries": {
    "view":        { "html": "view.html",        "files": ["...transitive closure..."] },
    "destination": { "html": "destination.html", "files": ["...transitive closure..."] }
  }
}
```

- `scripts/build/asset-graph.js` has the reference parsers: HTML `<script>`
  `<link>` `<img>` `<link rel=preload/manifest>` `<meta msapplication-config>`,
  JS `import`/dynamic `import()`/string-`fetch()`/JSON asset paths, CSS
  `@import`/`url()`. It **duplicates** (does not share) `hash-assets.js` logic —
  the hashing pass's rename/rewrite loop is load-bearing; do not refactor it to
  share.
- The manifest **excludes** by construction: `index.html`, `edit/**`,
  `expenses.html`, `itinerary.html`, `index.js`, `firebase-config.js` (+ hashed
  prod forms), `firebase*.json`, `reload`, and itself.
- A **verification pass** rescans every local reference and asserts it is in
  the set — the build fails on any gap (catches new reference types the
  parsers don't know).
- The P1-D self-host set (`assets/vendor/iconify/iconify.min.js`,
  `assets/json/iconify-icons.json`, `assets/css/fonts.css`, `assets/fonts/**`)
  is added explicitly (never discovered — the live HTML doesn't reference them).

---

## Dialog flow (Settings → Export as Static Web Page)

`public/assets/ts/static-export/export-static.ts` — `exportStaticOnClickAction()`:

1. **Security warning** — plain-text data warning (same style as JSON export).
2. **Type selector** — trip | destination | listing (single-select buttons).
3. **Document list** — from `getUser*Summaries`, a single-select card grid with
   a live search bar on top (same `.wallpaper-import-*` card styling as the
   edit-trip accommodation importer, in shared
   `components/document-picker.css`). Trips are ordered newest-first by start
   date (matching the accommodation importer); destinations/listings are
   alphabetical. Selecting a card sets `state.docId`.
4. **Mode** — light | complete radio. (No PIN step: a protected trip's PIN is
   auto-resolved from the owner-readable `protected/{tripId}` lookup doc in
   `buildStaticData()` → `buildExportDocument()`.)
5. **Title + icon** — optional text input + optional image file input.
6. **Build** — calls `buildStaticExport()` (build-zip.ts).

Uses `displayFullMessage` / `MESSAGE_PROPERTIES`, `start/stopLoadingScreen`,
`openToast`. i18n keys live under `account.export_static.*` in `en.json` /
`pt.json`. Dialog styles: `.export-static-dialog`, `.export-type-buttons`, the
`.export-static-picker` wrapper, etc. in `public/assets/css/components/modal.css`
(next to the `export-documents-*` block). The picker's card grid reuses the
shared `.wallpaper-import-*` styles in `components/document-picker.css`.

> **Mobile dead space:** inner list containers (`.export-documents-list`,
> `.wallpaper-import-scroll`) impose their own desktop `max-height` for the
> centered dialog. Inside a fullscreen dialog on mobile the
> `.message-description` is already the scroll container, so `modal.css`
> neutralizes that `max-height` (`max-height: none`) to make the lists fill the
> available area. The `.export-static-picker` is a flex column so its search bar
> stays pinned while the card list fills the rest and scrolls on its own.

On **Build Export** the dialog is closed and a step-by-step progress overlay
appears (`startProgressLoading` / `updateProgressLoading`, the same UI as
restore/import). Steps are reported through an `onProgress` callback threaded
from `export-static.ts` → `data-gather.ts` (`buildStaticData`: gathering 0→40)
→ `build-zip.ts` (`buildStaticExport`: assets 40→70, images 70→90 in complete
mode, finishing 90→100). Messages live under `account.export_static.loading.*`.

> **Gotcha:** step transitions must not rely on a bare `closeMessage()` →
> `displayFullMessage()` in the same tick — the pending close timers wipe the
> newly-shown dialog ~300ms later (PIN step used to flash and vanish). Fixed
> centrally in `utils/messages.ts` `displayFullMessage()` (clears
> `_closeMsgTimeout` + `cancelAnimateOut` on the outgoing dialog).
> `startProgressLoading` / `startLoadingScreen` also cancel the pending close,
> so `closeMessage()` → progress overlay is safe too.

---

## Light vs Complete mode

| Mode | Data | Images | Size |
|---|---|---|---|
| **Light** | Local `data.json` | Stay external URLs (needs network for media) | Smaller |
| **Complete** | Local `data.json` | Every mapped image pre-downloaded → `images/<sha1-12>.<ext>`, URLs rewritten in `data.json` | Heavier, fully offline for mapped media |

`data-gather.ts` `collectImageUrls()` inventories the **known image-bearing
fields only**: trip `image.background`, `gallery.images[].link`, accommodation
`images[].link`, destination `image.background`, destination entry
`images[].link`, listing `image.background`, plus any `logo` fields.

**Complete-mode images:** `build-zip.ts` POSTs ALL mapped image URLs to the
image-proxy worker (`workers/image-proxy/`) in **one request**; the worker
fetches them server-side (no CORS) and returns a binary envelope the client
slices into Blobs. URLs the worker can't fetch (404, too large, …) stay
external and are counted as `partial_success`.

> **Gotcha (the 0-byte bug):** never fall back to `fetch(url, { mode: 'no-cors' })`
> to download an image — an opaque response's `.blob()` is always **0 bytes**,
> which silently zipped corrupt empty images (trvl-media, brussels.be, …). Only
> accept blobs with `size > 0`; CORS-blocked hosts are the worker's job.

---

## Shared bundle extraction (`backup/document-bundle.ts`)

`document-bundle.ts` holds the pure gather logic extracted from
`export-documents.ts`: `getCollectionDocs`, `getDocument`,
`fetchReferencedDestinations`, `resolveTripPin`, `fetchProtectedData`, and
`buildExportDocument(type, id, pin)` returning the
`{ _meta, trip/destination/listing, accommodations?, transportation?,
itinerary?, expenses?, destinations?, protected? }` shape. Both the JSON export
and static export call it — **JSON export output must stay byte-for-byte
compatible** (same `_meta`, same fields, same order). Keep it that way when
modifying.

> **PIN:** `buildExportDocument` auto-resolves a protected trip's PIN from the
> owner-readable `protected/{tripId}` lookup doc (`resolveTripPin`) when the
> caller passes no pin — the owner never types it.

---

## Self-hosted chrome (P1-D)

- `scripts/build/gen-iconify-bundle.js` scans `public/` for every `data-icon`
  name (HTML + TS literals + `icons.json` + `transportation.json`), resolves via
  the Iconify API, caches in `tmp/iconify-cache.json` (deterministic, offline),
  and writes `dist/assets/json/iconify-icons.json` (grouped by prefix). **Fails
  the build on any unresolved name.**
- `scripts/build/vendor-fonts.js` downloads the woff2 files (Open Sans /
  Raleway / Inter / Poppins, the exact weights in `head.html`) into
  `public/assets/fonts/` and generates `public/assets/css/fonts.css` with
  matching `@font-face` (`font-display: swap`). Committed.
- `public/assets/vendor/iconify/iconify.min.js` is the vendored Iconify runtime.
- The build runs both **before** `hash-assets.js`; these files keep **stable
  (unhashed) names** (excluded in `hash-assets.js`) so the export transform can
  reference them by fixed relative path.
- The export transform inlines `iconify-icons.json` as
  `window.__TRIPVIEWER_ICONS__` and calls `Iconify.addCollection()` per prefix
  **before** Iconify scans `[data-icon]` (pause/resume the observer around
  registration if needed) — registered collections never hit the on-demand
  loader, so zero requests to `code.iconify.design`.

---

## ZIP builder (`build-zip.ts`)

`buildStaticExport(data, config)`:

1. `fetch('static-export-manifest.json')` → pick `entries.view` / `entries.destination`.
2. Fetch each manifest file (same-origin) into the zip (zip path = manifest path).
3. **Transform the entry HTML:**
   - Strip `/__/firebase/*` scripts + the `index.js` module bootstrap (both
     dev and hashed prod forms) + `apis.google.com/js/api.js` (dead `gapi`).
   - Replace Iconify CDN `<script>` with the vendored runtime + inline
     collection registration.
   - Replace Google Fonts `<link>` with self-hosted `assets/css/fonts.css`.
   - Rebase root-absolute asset URLs (`/assets/…`, `/favicon*`,
     `/site.webmanifest`, etc.) to relative so it works on **any static host or
     subfolder path**.
   - Strip `nav-helper` (dev-only) + reload/livereload remnants.
   - **P3 standalone chrome:** logo `<a>` → `<div class="logo-link">`; remove
     `#back`/`#closeButton`; hide the share button; no home/back affordances.
   - Inject the §bootstrap `<script>` (title/icon/ownerUid/dataUrl/mode)
     **before** the entry module.
   - Set `<title>` + PWA meta from the chosen app title.
4. **Complete mode only:** fetch each `meta.images` URL → `images/<sha1-12>.<ext>`
   → rewrite occurrences inside `data.json`; non-fetchable URLs stay external
   and are counted for a warning.
5. Write `data.json`, a generated `site.webmanifest` (custom name/icon), and the
   custom icon file(s).
6. Zip with `JSZip` → `Blob` → download `<slug>.zip` — the slug is the
   user-chosen app title (falling back to the document title, then its id),
   lowercased with only `[a-z0-9-]` chars (no timestamp or type prefix).

**Key fact:** the exported page must be **served over HTTP** (`npx serve`, any
static host). ESM modules and `fetch()` do **not** run from `file://`. True
`file://` support would require bundling all JS to a classic script + inlining
everything — out of scope.

---

## Remaining external dependencies in the export

- **User media** in light mode (by design).
- **Plyr** (`cdn.plyr.io`) — loaded lazily by GLightbox's video player the first
  time a video lightbox opens. Not in the HTML as a static `<script>`, so it
  only loads on demand. This is the **only** remaining network resource
  dependency; icons, web fonts, Chart.js and all app chrome are self-hosted.
- The footer "Developed by" `<a href="https://www.linkedin.com/…">` is a plain
  hyperlink (not a resource load) and is left as-is.

---

## Adding / removing exportable assets

**Automatic for reachable files:** add an import/`fetch("/assets/…")`/CSS
`url()`/`<img src>` to a view or destination module → the next build regenerates
the manifest and the ZIP includes it. Remove it → the manifest shrinks. Two
identical builds produce byte-identical manifests.

**Manual for self-host / fixed assets:** the P1-D set is added explicitly in
`gen-static-export-manifest.js` (`SELF_HOST_FILES`) and kept unhashed via
`hash-assets.js` `EXCLUDED_FILES`. If you add a new fixed file the exported page
must always ship, add it to both places.

**Never export:** index/edit/expenses/itinerary pages, Firebase configs, or the
Firebase bootstrap — enforced by `EXCLUDED_FILES` + `EXCLUDED_PREFIXES` in the
manifest generator. The exported page must never contain Firebase.

---

## Verification steps

1. `npx tsc --noEmit` and `npm run build` pass; the build logs
   `[static-export-manifest] Wrote dist/static-export-manifest.json`.
2. Manifest sanity: no `index.html`, `edit/*`, `index.js`, `firebase-config.js`,
   `expenses.html`, `itinerary.html`, `reload`; **does** include
   `assets/vendor/**`, CSS, JSON configs, fonts, `assets/json/iconify-icons.json`,
   `assets/css/fonts.css`.
3. Export a protected trip from Settings (no PIN prompt — resolved automatically)
   → unzip → serve over a local static server (`npx serve`) → DevTools shows **zero**
   requests to `fonts.googleapis.com`, `code.iconify.design`, `apis.google.com`;
   icons/fonts render from the local bundle; no `firebase is not defined`.
4. Sensitive reservation reveal works (reads `trips/protected/{pin}/{id}`).
5. Complete mode: mapped images render from `images/`; partial failures show
   `partial_success` with counts.
6. Exported page has no clickable TripViewer logo, no back/home buttons; the
   logo renders as plain branding.
7. In normal (non-static) mode, everything is unchanged (`npm run dev` smoke:
   index settings, JSON export, view/destination).
