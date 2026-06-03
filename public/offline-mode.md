# Offline Mode — Implementation Plan

> **Goal:** Convert a trip (view.html + itinerary.html + destination.html + expenses.html) into a fully offline, self-contained package that runs on an iPhone without internet.
>
> **Strategy:** A Python build script that exports Firestore data → downloads all images → generates a self-contained HTML/CSS/JS site with all Firebase dependencies stripped out and replaced by local JSON data.
>
> **Output:** A `.zip` file that can be extracted and opened directly on an iPhone (via Files app → open in browser), or served via any static HTTP server.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                 OFFLINE PACKAGE (.zip)                   │
├─────────────────────────────────────────────────────────┤
│  index.html          ← Entry point (trip picker if      │
│                         multiple trips exported)         │
│  view.html           ← Trip overview page               │
│  itinerary.html      ← Full itinerary page              │
│  destination.html    ← Destination details page          │
│  expenses.html       ← Expenses page                    │
│  assets/                                                │
│    css/              ← All CSS (unchanged, with inline   │
│                         dark-mode support)              │
│    js/                                                  │
│      main/                                              │
│        main-offline.js  ← Firebase-free main loader    │
│        translation.js   ← Unchanged                     │
│      paginas/          ← Page-specific logic            │
│        (adapted versions with Firestore calls replaced) │
│      suporte/                                           │
│        offline-data.js  ← JSON data loader (replaces    │
│                           database.js)                   │
│    img/                                                  │
│      offline/          ← All downloaded trip images      │
│    json/                                                 │
│      data/             ← Exported Firestore data as JSON │
│        user.json                                         │
│        trip_{id}.json                                    │
│        dest_{id}.json                                    │
│        expenses_{id}.json                                │
│        protected_{id}.json                               │
│      cores.json       ← (copied from original)           │
│      destinos.json    ← (copied from original)           │
│      moedas.json      ← (copied from original)           │
│      transportes.json ← (copied from original)           │
│      itinerary.json   ← (copied from original)           │
│      icons.json       ← (copied from original)           │
│      languages/       ← (copied from original)           │
│    vendor/            ← All vendor libs (copied)         │
│  site.webmanifest     ← PWA manifest (for iOS add-to-   │
│                          home-screen)                    │
│  sw.js               ← Service Worker (caches all assets)│
└─────────────────────────────────────────────────────────┘
```

---

## Prompt 1 — F152: Create the Python Export Script (Firestore → JSON + Images)

### Context

You will create a Python script at `scripts/export_for_offline.py` that authenticates with Firebase, reads all trip-related data, and exports it to a local folder.

### Requirements

1. **Authentication**: Use Firebase Admin SDK with a service account key. The script should accept:

   - `--trip-id <tripId>` (required) — the Firestore trip document ID
   - `--output-dir <path>` (default: `offline-export/`) — where to write files
   - `--service-account <path>` (default: `serviceAccountKey.json`)
2. **Data Export**: For the given trip ID, fetch and save as JSON:

   - The trip document from `viagens/{tripId}`
   - All destination documents referenced in `trip.destinos[].destinosID`
   - The expenses document if `trip.modulos.gastos` is enabled (from `gastos/{tripId}` or lookup by tripId)
   - The protected data document from `protegido/{tripId}` (PIN data)
   - The user's language preference

   Save each as a separate JSON file in `{output-dir}/json/data/`.
3. **Image Download**: Scan ALL JSON data for Firebase Storage URLs (pattern: `firebasestorage.googleapis.com`). Download every image to `{output-dir}/assets/img/offline/` and rewrite all URLs in the JSON files to relative paths (e.g., `assets/img/offline/viagens_tripId_photo.jpg`).

   - Name files deterministically based on the original `caminho` property or URL path
   - Handle both `link` and `caminho` properties
   - Keep a mapping of original-URL → local-path for debugging
4. **Static Assets Copy**: Copy these from `public/` to the output directory:

   - `assets/vendor/` (all vendor libraries)
   - `assets/css/` (all CSS files)
   - `assets/fonts/`
   - `json/cores.json`, `json/destinos.json`, `json/moedas.json`, `json/transportes.json`, `json/itinerary.json`, `json/icons.json`, `json/version.json`
   - `json/languages/en.json`, `json/languages/pt.json`
5. **Generate Offline JS Files**: Copy the original JS files from `public/assets/js/` but create adapted versions where needed:

   - `js/main/main-offline.js` — replaces `main.js`, strips Firebase initialization, loads JSON files directly
   - `js/suporte/offline-data.js` — replaces `database.js`, reads from local JSON instead of Firestore
   - `js/main/backup.js` — remove (not needed offline)
   - `js/main/restore.js` — remove (not needed offline)
   - `js/suporte/firebase/` — remove entirely (no Firebase in offline mode)
   - All other JS files: copy and adapt references
6. **Page HTML Generation**: Copy `view.html`, `itinerary.html`, `destination.html`, `expenses.html` and adapt them:

   - Replace all Firebase SDK `<script>` tags with the offline equivalents
   - Replace `main.js` with `main-offline.js`
   - Replace `database.js` with `offline-data.js`
   - Remove auth-related scripts
   - Add `<script>` for the inline trip data (so pages know which trip to load)
   - Fix all relative paths
7. **Service Worker**: Generate `sw.js` that caches all assets for true offline use on iOS. Use a cache-first strategy with a static cache name that includes a version/timestamp.
8. **Web Manifest**: Generate `site.webmanifest` for PWA "Add to Home Screen" support on iOS (Apple-specific meta tags for apple-touch-icon, etc.).

### Output Structure

```
offline-export/
  index.html                (if multiple trips, a simple picker)
  view.html
  itinerary.html
  destination.html
  expenses.html
  site.webmanifest
  sw.js
  assets/
    css/                    (copied)
    js/
      main/
        main-offline.js    (generated)
        translation.js     (copied)
      paginas/             (adapted)
      suporte/
        offline-data.js    (generated)
    img/
      offline/             (downloaded images)
    fonts/                 (copied)
  json/
    data/                  (exported Firestore data)
    cores.json             (copied)
    destinos.json          (copied)
    moedas.json            (copied)
    transportes.json       (copied)
    itinerary.json         (copied)
    icons.json             (copied)
    version.json           (copied)
    languages/             (copied)
  vendor/                  (copied)
```

---

## Prompt 2 — F154: Create the Offline Data Loader (`offline-data.js`)

**Related ticket:** F154 — Export user data to JSON (trip + destination)

### Context

This file replaces `assets/js/suporte/firebase/database.js` entirely. It must expose the same global functions that pages expect, but read from local JSON files instead of Firestore.

### Requirements

1. Expose these functions with identical signatures to the originals:

   - `_get(path)` — reads from a local JSON object (pre-loaded at startup). The `path` should be mapped: `viagens/{id}` → `DATA.trips[id]`, `destinos/{id}` → `DATA.destinations[id]`, etc.
   - `_getSingleData(type)` — returns the single trip/destination data (offline only has ONE trip)
   - `_getTripDataWithDestinos(data)` — same as original: hydrates nested destination references from `DATA.destinations`
   - `_getSystemData()` — returns a static config (registrationOpen: false, etc.)
   - `_hasReadPermission(path)` — always returns `true` in offline mode
   - `_create`, `_update`, `_override`, `_delete`, `_deepCreate` — all return a resolved promise that does nothing (read-only offline mode). Show a toast "Offline mode — read only".
   - `_createBatchOps()` — returns an object whose `.commit()` resolves immediately
2. On load, fetch all JSON data files from `json/data/*.json` and store in a global `DATA` object:

   ```javascript
   window.DATA = {
     trip: {},           // the single trip
     destinations: {},   // keyed by destId
     expenses: {},
     protected: {},
     user: {}
   };
   ```
3. Keep the same error handling patterns — return `false` or `null` for missing data (don't throw).
4. The script must load synchronously (use `<script>` tags in order) — the JSON files should be embedded as `<script>` tags with `type="application/json"` or loaded via fetch in a bootstrap step before the page initializes.

---

## Prompt 3 — F155: Adapt `main.js` → `main-offline.js`

### Context

The original `main.js` initializes Firebase, sets up auth listeners, then calls `_loadPage()`. The offline version must skip all Firebase initialization and go straight to loading local data.

### Requirements

1. Remove ALL Firebase-related code:

   - `firebase.initializeApp()`
   - `onAuthStateChanged` listener
   - Firebase emulator checks
   - Registration checks
2. Keep:

   - JSON config loading (cores.json, destinos.json, moedas.json, etc.) — these are still needed
   - `_loadPage()` routing
   - Translation system
   - Dark mode system
   - Toast system
   - Environment tag (show "OFFLINE" instead of "LOCAL")
3. Set `window.UID = "offline-user"` early (before any page loads) so all existing `UID` checks pass.
4. Set `window.IS_OFFLINE = true` — this flag will be used by other scripts to disable write operations and hide edit buttons.
5. Pre-load the trip data before calling `_loadPage()`. Since we're offline, we know exactly which trip to load — embed the trip ID in a `<meta>` tag or a global variable at the top of each HTML page.
6. Ensure `_main()` is still the entry point and is still called on `DOMContentLoaded`.

---

## Prompt 4 — F155: Adapt Page-Specific JS Files for Offline Mode

### Context

Several page scripts call `_get()`, `_update()`, `_getUID()`, etc. Most will work with the new `offline-data.js` and `main-offline.js` shims, but some have specific Firebase behaviors that need handling.

### Files to adapt (create offline copies):

1. **`js/paginas/viagem/` (view.html scripts)**:

   - All `_get()` calls will now hit `offline-data.js` and return local data — should work transparently.
   - The PIN flow: `protegido/{id}` now reads from local JSON. The PIN challenge should still work but the "save to Firestore" part should be a no-op.
   - Remove any calls to `_update()`, `_create()`, `_delete()`.
   - The share button should use a simpler mechanism (copy link, or generate a shareable text).
2. **`js/paginas/itinerary/` (itinerary.html scripts)**:

   - Same treatment — replace Firestore writes with no-ops.
   - Print/PDF export should work as-is (it's client-side).
3. **`js/paginas/destinos/` (destination.html scripts)**:

   - The lightbox/embed logic for TikTok/Instagram may not work offline (they require internet for embeds). Add a fallback: show a placeholder image or the downloaded thumbnail instead of the embed.
   - URL-based embeds: if an image was downloaded, show the local image instead.
4. **`js/paginas/gastos/` (expenses.html scripts)**:

   - Currency conversion API calls won't work offline. Use a static exchange rate table from the export time, or simply display values in their original currencies.
   - Remove all `_update()` calls.

### General rules for ALL adapted JS files:

- Wrap any `_update()`, `_create()`, `_delete()`, `_override()`, `_deepCreate()` calls with:
  ```javascript
  if (!window.IS_OFFLINE) {
    // original Firebase call
  }
  ```
- Hide edit buttons, delete buttons, and any "Save" UI elements when `window.IS_OFFLINE` is true. Add a CSS class `.offline-hide { display: none !important; }` and apply it to edit controls.
- Show a subtle "📴 Offline" badge in the corner of every page.

---

## Prompt 5 — F157: Handle Images and Embeds for Offline

### Context

Images are stored in Firebase Storage with public URLs. Embeds (TikTok, Instagram) won't work offline at all. This step handles both.

### Requirements

1. **Image Replacement**: The Python export script (Prompt 1) already downloads images and rewrites URLs. Verify this works for ALL image paths:

   - `imagem.background.link`
   - `imagem.claro.link`
   - `imagem.escuro.link`
   - `hospedagens.imagens[].link`
   - `transportes[].imagem.link` (if any)
   - `galeria.imagens[].link`
   - Destination `imagem.*.link`
   - Any image URLs inside accommodation photos
2. **Embed Fallback**: For each destination item with a `midia` property (TikTok/Instagram URL):

   - In `offline-data.js`, parse the `midia` field and add a `midiaOffline` property:
     - If the embed URL was matched to a downloaded thumbnail during export, set `midiaOffline = { type: "image", src: "assets/img/offline/..." }`
     - Otherwise, set `midiaOffline = { type: "placeholder", message: "Offline — embed not available" }`
   - In the destination page JS, check for `midiaOffline` first before attempting to render the embed.
3. **Transport/Airline Logos**: These are typically loaded from `assets/img/transportes/`. They should already be copied. Verify all transport type icons reference local paths.
4. **Background Images**: Trip hero backgrounds are loaded from Firebase Storage URLs. After the Python script rewrites them to local paths, the CSS inline styles should point to `assets/img/offline/...`. Verify the dark-mode background switching still works.

---

## Prompt 6 — F156: Create the Service Worker for True Offline

### Context

iOS Safari supports Service Workers for "Add to Home Screen" PWAs. A service worker with cache-first strategy ensures the app works even without an internet connection after the first load.

### Requirements

1. Create `sw.js` in the offline output root. It should:

   - Cache ALL files in the offline package (HTML, CSS, JS, JSON, images, fonts, vendor libs) on install
   - Use a cache name like `tripviewer-offline-v{timestamp}`
   - Intercept fetch requests and serve from cache (cache-first strategy)
   - Never attempt network requests (pure offline — fail fast if not in cache)
2. Register the service worker in each HTML page with:

   ```javascript
   if ('serviceWorker' in navigator) {
     navigator.serviceWorker.register('/sw.js');
   }
   ```
3. The `site.webmanifest` should define:

   - `name`: "TripViewer — {trip title}"
   - `short_name`: "TripViewer"
   - `start_url`: "/view.html"
   - `display`: "standalone"
   - `background_color`: "#1a1a2e"
   - `theme_color`: "#1a1a2e"
   - `scope`: "/"
4. Add iOS-specific meta tags to each HTML `<head>`:

   ```html
   <meta name="apple-mobile-web-app-capable" content="yes">
   <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
   <meta name="apple-mobile-web-app-title" content="TripViewer">
   <link rel="apple-touch-icon" href="assets/img/offline/app-icon.png">
   ```

---

## Prompt 7 — F158: Package Everything into a .zip + Deploy Script

### Context

The final step is to zip everything and make it easy to deploy to a phone.

### Requirements

1. **Zip Script**: Create `scripts/package_offline.py` (or extend the export script) that:

   - Takes the `offline-export/` directory
   - Creates a `.zip` file named `{trip-title}-offline-{date}.zip`
   - Places it in a `dist/` directory
2. **QA Checklist Script**: Add a `--validate` flag to the export script that checks:

   - All JSON files are valid
   - All image references in JSON point to existing local files
   - All HTML files have the correct script order
   - No references to `firebase` remain in JS files
   - All vendor files are present
3. **iOS Instructions**: Generate a `README.txt` inside the zip:

   ```
   HOW TO OPEN THIS ON YOUR iPHONE:

   1. Unzip this file using the Files app
   2. Open the folder in Files
   3. Tap "view.html" → it will open in Safari
   4. Tap the Share button → "Add to Home Screen"
   5. Name it and tap "Add"
   6. Now you have a fully offline trip guide on your home screen!

   NOTE: Some embeds (TikTok, Instagram) won't work offline.
   Videos and external links require internet.
   ```
4. **Simple HTTP Server Option**: Add a `--serve` flag that starts a local Python HTTP server for testing:

   ```bash
   python scripts/export_for_offline.py --trip-id ABC123 --serve
   # → Exports, then starts http://localhost:8080
   ```

---

## Prompt 8 — F159: Wire Everything into the Existing Build/Deploy System

### Context

The project already has:

- A pre-commit script (`F132`)
- A setup script (`F133`)
- A git sync script (`F144`)
- Deploy via Firebase Hosting

### Requirements

1. Add `scripts/export_for_offline.py` to the project root (or `scripts/` folder).
2. Add a `requirements.txt` for the Python dependencies:

   ```
   firebase-admin>=6.0.0
   requests>=2.28.0
   ```
3. Update the README.md — mark F152, F153, F154, F155 as in-progress with links to `offline-mode.md`.
4. The export script should be runnable by a developer with:

   ```bash
   # One-time setup
   pip install -r scripts/requirements.txt

   # Export a trip for offline use
   python scripts/export_for_offline.py --trip-id <TRIP_ID> --service-account serviceAccountKey.json
   ```
5. (Optional/Future F153) Integrate into deploy: add a GitHub Action or pre-deploy hook that auto-generates offline packages for recently-updated trips.

---

## Implementation Order (Recommended)

| Order | Prompt   | Ticket | Description                      | Dependencies                    |
| ----- | -------- | ------ | -------------------------------- | ------------------------------- |
| 1     | Prompt 1 | F152   | Python export script (core)      | None                            |
| 2     | Prompt 2 | F154   | `offline-data.js` loader       | Prompt 1 (needs JSON structure) |
| 3     | Prompt 3 | F155   | `main-offline.js`              | Prompt 2                        |
| 4     | Prompt 5 | F157   | Image & embed handling           | Prompt 1                        |
| 5     | Prompt 4 | F155   | Adapt page JS files              | Prompts 2, 3                    |
| 6     | Prompt 6 | F156   | Service Worker + PWA             | Prompt 4 (needs final HTML)     |
| 7     | Prompt 7 | F158   | Zip packaging + iOS instructions | All above                       |
| 8     | Prompt 8 | F159   | Wire into build system           | Prompt 7                        |

---

## Key Risks & Mitigations

| Risk                                          | Mitigation                                                                                              |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Embeds (TikTok/Instagram) won't work offline  | Show downloaded thumbnail + "Online required" placeholder                                               |
| Currency API unavailable                      | Use snapshot of exchange rates at export time                                                           |
| iOS Safari limitations with large local files | Keep images optimized (WebP format, max 800px width)                                                    |
| Service Worker caching too aggressive         | Use timestamped cache names; provide "refresh" button                                                   |
| Script load order breaks in offline version   | Generate HTML with scripts in exact required order                                                      |
| PIN-protected data exposed in plain JSON      | The export is a developer tool — PIN protection is for the online version. Add a warning in README.txt |
| Firebase Storage URLs expire                  | They're public, long-lived URLs — but the Python script downloads images anyway                        |

---

## Future Enhancements (Beyond MVP)

- **F156 — Selective Export**: Choose which destinations/categories to include
- **F157 — Auto-refresh**: Schedule periodic re-exports via GitHub Actions
- **F158 — In-app offline toggle**: Button in the online app that triggers the export (requires a Cloud Function)
- **F159 — Differential updates**: Only download changed images/data since last export
