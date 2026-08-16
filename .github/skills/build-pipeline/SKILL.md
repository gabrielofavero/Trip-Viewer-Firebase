---
name: build-pipeline
description: 'Use when you need to build, watch, debug build errors, understand the custom build flow, or modify build configuration. The pipeline uses esbuild for TypeScript compilation, HTML partial injection, and tsc for type-checking. Always consult this skill before running builds or troubleshooting build issues.'
applyTo: 'scripts/build/**; firebase.json; tsconfig.json; package.json'
---

# Build Pipeline

The TripViewer build system is a **custom Node.js pipeline** (no Webpack, Vite, or bundler). It copies static assets, injects HTML partials, compiles TypeScript via esbuild, and type-checks with tsc.

---

## Quick Reference

```bash
npm run build              # One-shot build (prod mode; blocks on TS errors)
npm run watch              # Watch mode (dev mode; rebuilds on change, errors non-blocking)
npm run dev                # Full dev: watch (livereload) + emulators + auto-open browser
npm run dev:dev            # Real data (no emulators): firebase use dev + serve real project
npm run dev:prd            # Real data (no emulators): firebase use prd + serve real project
node scripts/build/build.js --mode dev|prod  # Explicit build mode
node scripts/build/build.js --watch --no-livereload  # Watch without live reload
node scripts/build/build.js --use-emulator true|false  # Emulator vs real Firebase (default true)
```

## Emulator vs Real Data (`--use-emulator true|false`)

Controls how the built frontend connects on localhost:

- **`true`** (default): the reserved `/__/firebase/init.js` is served with
  `?useEmulator=true` and `firebase-config.js`'s localhost block connects
  Auth/Firestore to the local emulators — used by `npm run dev`.
- **`false`**: `init.js?useEmulator=false` and the localhost emulator block is
  skipped, so the app reads/writes the **real** Firebase project for the active
  `firebase use` alias — used by `npm run dev:dev` / `npm run dev:prd`.

The flag is substituted at build time into `scripts-vendor.html`
(`{{USE_EMULATOR}}`) and into the copied `dist/firebase-config.js`.

## Build Mode (`--mode dev|prod`)

The build has an explicit `dev`/`prod` seam:

- **`prod`** (default for `npm run build`): runs `hash-assets.js` — content-hashes
  `.js`/`.css`/images/fonts/`.json`, rewrites every reference, and renames the
  files so the `immutable` cache headers are always correct.
- **`dev`** (default when `--watch` or `NODE_ENV=development`): **skips** hashing.
  The dev config (`firebase.dev.json`) serves everything with `Cache-Control:
  no-store`, so hashing is redundant and dev rebuilds are faster. Livereload is
  always on in dev.

Mode is inferred from `--watch` / `NODE_ENV=development`, or set explicitly with
`--mode dev|prod`.

---

## Build Flow (`scripts/build/build.js`)

```
1. CLEAN          rm -rf dist/
2. COPY           public/ → dist/ (recursive)
3. INJECT         HTML partials (<!-- #include shared/foo.html --> → content)
4. COMPILE TS     esbuild: dist/assets/ts/**/*.ts → .js (ESM, ES2020 target)
   REMOVE TS      Delete .ts source files from dist/
5. COPY CONFIG    firebase.json, firebase-config.js, index.js → dist/
5a. SELF-HOST     vendor-fonts.js + gen-iconify-bundle.js (before hashing —
                  the files keep stable unhashed names)
5b. HASH ASSETS   (prod only) content-hash .js/.css/img/fonts/.json + rewrite refs
5c. EXPORT MANIFEST gen-static-export-manifest.js → dist/static-export-manifest.json
6. LIVE RELOAD    Write dist/reload timestamp file
7. TYPE-CHECK     tsc --noEmit
```

### Step 5a: Self-hosted fonts & icons

- `vendor-fonts.js` — downloads the woff2 files for the four web-font families
  (Open Sans / Raleway / Inter / Poppins, the weights listed in `head.html`)
  into `public/assets/fonts/` and generates `public/assets/css/fonts.css` with
  matching `@font-face` rules. Files are committed; the script is a no-op when
  they're already up to date.
- `gen-iconify-bundle.js` — scans `public/` for every `data-icon` name (HTML +
  TS literals + `icons.json` + `transportation.json`), resolves each via the
  Iconify API (cached in `tmp/iconify-cache.json`), and writes
  `dist/assets/json/iconify-icons.json` (grouped by prefix). **Fails the build
  on any unresolved icon name.**
- Both run **before** `hash-assets.js`; their outputs keep **stable (unhashed)
  names** so the static-export transform can reference them by fixed relative
  path (see `hash-assets.js` `EXCLUDED_FILES`).

### Step 5c: Static-export manifest

`gen-static-export-manifest.js` emits `dist/static-export-manifest.json` — per
entry (`view.html`, `destination.html`), the transitive closure of local files
needed to render standalone without Firebase (imports, `fetch()`, CSS
`@import`/`url()`, vendor, self-host set). Regenerated every build; the export
builder (`public/assets/ts/static-export/build-zip.ts`) fetches it at export
time. See `.github/skills/static-export` for the full contract.

### Step 3: HTML Partial Injection (`inject-partials.js`)

The injector processes 8 pages defined in `PAGES[]`:

| Source HTML | Entry Point |
|---|---|
| `index.html` | `assets/ts/pages/home/index-entry.js` |
| `view.html` | `assets/ts/pages/trip-detail/view-entry.js` |
| `destination.html` | `assets/ts/pages/destination/destination-entry.js` |
| `expenses.html` | `assets/ts/pages/expenses/expenses-entry.js` |
| `itinerary.html` | `assets/ts/pages/itinerary/itinerary-entry.js` |
| `edit/trip.html` | `assets/ts/pages/edit-trip/trip-entry.js` |
| `edit/destination.html` | `assets/ts/pages/edit-destination/destination-entry.js` |
| `edit/listing.html` | `assets/ts/pages/edit-listing/listing-entry.js` |

It replaces:
- `<!-- #include shared/head.html -->` — injects `<head>` with page-specific title and CSS
- `<!-- #include shared/scripts-core.html -->` — injects Firebase SDK + app config + entry script
- `<!-- #include shared/scripts-vendor.html -->` — injects vendor `<script>` tags (jQuery, Bootstrap, Chart.js, Swiper, etc.)
- `<!-- #include shared/top-bar.html -->` — injects top navigation bar (with page-specific icons)
- `<!-- #include shared/livereload.html -->` — injects live-reload polling script (unless `--no-livereload`)
- `{{PLACEHOLDER}}` → resolved values (e.g., `{{PAGE_TITLE}}`)

### Step 4: TypeScript Compilation

- **Compiler:** esbuild (fast, no type-checking)
- **Format:** ESM (`import`/`export`)
- **Target:** ES2020
- **Entry points:** All `.ts` files under `dist/assets/ts/` (after copy)
- **Output:** `.js` files in the same directory structure
- **Cleanup:** `.ts` source files deleted from `dist/` after compilation

### Step 7: Type Checking

- Runs `tsc --noEmit` (type-checks only, no JS output)
- **One-shot mode:** Aborts build with exit code 1 on errors
- **Watch mode:** Reports errors but does NOT block the build or live reload
- Error summary lists affected files only (no full error output in watch mode)

---

## Watch Mode

```
node scripts/build/build.js --watch
```

- Uses `fs.watch` with `recursive: true` on `public/` + a 2s polling heartbeat (fs.watch can silently go quiet on Windows)
- **300ms debounce** — waits for burst of changes to settle before rebuild
- **Content-hash gating** — a rebuild only fires when a file's bytes actually change (size diff, or SHA-1 diff when mtime moves). mtime-only touches (AV scan, git checkout, editor watcher, Windows directory events) are ignored, so no spurious livereload refreshes.
- `fs.watch` events only trigger a full content scan; the scan itself decides what changed
- Falls back to non-recursive watch on platforms that don't support it
- Type-check errors are non-blocking (page already reloaded by then)
- Live reload signal written to `dist/reload` after compilation, before type-check
- `build()` retries `rmSync(dist)` (maxRetries 10) — the hosting emulator can hold dist/ files open on Windows (ENOTEMPTY/EBUSY)

---

## Dev Mode (`npm run dev`)

```
concurrently:
  ├── npm run watch:functions    (tsc --watch in functions/)
  ├── npm run watch              (frontend build watch, livereload)
  ├── firebase emulators:start   (auth:9099, firestore:8085, hosting:5000, functions:5001)
  └── node scripts/utils/open-on-ready.js  (opens browser when ready)
```

The emulators are launched by `scripts/dev/start-emulator.js`, which first
regenerates `firebase.dev.json` (a copy of `firebase.json` with a single
`Cache-Control: no-store` header on `**/*`) and passes
`--config=./firebase.dev.json`. Dev edits show instantly: `no-store` means
nothing is cached, and livereload refreshes the page on every rebuild.

---

## Key Configuration Files

| File | Role |
|---|---|
| `tsconfig.json` | TypeScript config: `strict: false`, `noEmit: true`, `moduleResolution: "bundler"`, `isolatedModules: true`, includes `public/assets/ts/**/*.ts` |
| `biome.json` | Formatter/linter: tab width 2, single quotes, semicolons, trailing commas, 100 char width |
| `firebase.json` | Hosting from `dist/`, SPA rewrite `** → /index.html`, cache headers, 301 redirects |
| `firebase.dev.json` | Generated copy of `firebase.json` with a single `no-store` header (dev only; regenerated on emulator start) |
| `firebase-config.js` | Firebase config, auto-detects DEV/PRD/TCC by hostname |
| `functions/tsconfig.json` | Separate TS config for Cloud Functions |

---

## HTML Partials (Source)

Located in `public/shared/`:

| File | Purpose |
|---|---|
| `head.html` | `<head>` with meta, CSS links, title placeholder |
| `top-bar.html` | Navigation bar with back button, night mode toggle, extra icons |
| `livereload.html` | Script that polls `dist/reload` and refreshes the page |
| `scripts-core.html` | Firebase SDK scripts, firebase-config, app entry script |
| `scripts-vendor.html` | Third-party scripts (jQuery, Bootstrap, Chart.js, Swiper, Sortable, AOS, GLightbox, Isotope, Typed, Waypoint, Mapbox) |

---

## Common Build Issues

### "Build aborted — TypeScript errors found"
- This only happens in one-shot mode (`npm run build`)
- Run `npx tsc --noEmit` to see full error details
- In watch mode, errors are non-blocking

### Missing modules / vendor globals
- Vendor scripts (jQuery, Bootstrap, etc.) are loaded via `<script>` tags, NOT bundled
- Their types are declared in `public/assets/ts/vendor.d.ts`
- Don't try to `import` them — they're globals

### HTML partials not injecting
- The injector reads from `public/` (source), writes to `dist/`
- Editing HTML in `dist/` directly will be overwritten on next build
- Always edit in `public/`

### Live reload not working
- Check that `dist/reload` file is being written (timestamp changes on each build)
- The livereload script polls every 800ms
- Use `--no-livereload` to disable if causing issues

### Live reload fires without any edits (spurious refresh)
- Fixed by content-hash gating in watch mode — only real byte changes rebuild.
- If it still happens, a second `npm run dev` / `npm run watch` may be running: two watchers each write `dist/reload`, causing duplicate refreshes. Kill the duplicate watcher.

---

## Build Scripts Location

```
scripts/
├── build/
│   ├── build.js              ← Main build orchestrator (--mode dev|prod)
│   ├── inject-partials.js    ← HTML include processor
│   ├── hash-assets.js        ← Content-hashing (prod only)
│   ├── gen-firebase-dev.js   ← Generates firebase.dev.json (no-store headers)
│   ├── asset-graph.js        ← Reference parsers for the static-export manifest
│   │                           (duplicates hash-assets.js parsing — don't refactor to share)
│   ├── gen-static-export-manifest.js ← Emits dist/static-export-manifest.json
│   ├── gen-iconify-bundle.js ← Self-hosted Iconify bundle (dist/assets/json/iconify-icons.json)
│   ├── vendor-fonts.js       ← Self-hosted web fonts + assets/css/fonts.css
│   ├── deploy.py             ← Python deploy script
│   └── setup.ps1             ← PowerShell setup
├── dev/
│   └── query-firestore.js    ← Firestore emulator query tool
├── export-maps-data/         ← Google Places API data fetcher
└── utils/
    ├── readme.py             ← README.md maintenance
    ├── sync.py               ← Git branch sync
    └── open-on-ready.js      ← Browser auto-open
```
