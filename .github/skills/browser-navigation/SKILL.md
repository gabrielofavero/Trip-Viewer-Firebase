---
name: browser-navigation
description: 'Use when you need to navigate the TripViewer web app in the integrated browser — open pages, build correct URLs, sign in, wait for Firestore data to load, verify UI, or take screenshots. Covers page routes, URL params (t/d/l/e/visibility), auth, loading states, Firestore data loading, and the dev nav helper.'
---

# TripViewer Browser Navigation

This skill tells you how to move around the TripViewer web app in the integrated browser so you can freely explore, verify, debug, and screenshot Firestore-backed pages.

## When to Use

- Opening or verifying any TripViewer page in the browser
- Building correct URLs for trips, destinations, listings, itinerary, or expenses
- Signing in (emulator or production) before inspecting authenticated pages
- Waiting for Firestore-driven content to finish loading before acting/screenshots
- Debugging UI or capturing screenshots

## Environment

- **Dev (recommended):** `npm run dev` serves the app at `http://localhost:5000` and runs the emulators (Firestore `8085`, Auth `9099`, Functions `5001`, Emulator UI `4000`). Data persists in `.emulator-data/`.
- **Production:** `https://trip-viewer.com` (project `trip-viewer-prd`).
- **Dev console helper (localhost only):** a global `dev` object is available — `dev.firestore.get("path")`, `dev.firestore.set("path", {})`, `dev.help()` to list commands. Read current DB state in-app without leaving the page.

## Page & Route Reference

| Page | URL | Params | Firestore source | Entry module |
|---|---|---|---|---|
| Dashboard | `index.html` | — | `users/{uid}` summaries | `pages/home` |
| Trip detail | `view.html` | `t=<tripId>` | `trips/{id}` + subcollections | `pages/trip-detail` |
| Destination detail | `destination` | `d=<destId>` (+ optional `t=<tripId>`, `type=`) | `destinations/{id}` | `pages/destination` |
| Listing detail | `view` | `l=<listId>` | `listings/{id}` | `pages/trip-detail` (TYPE=listings) |
| Itinerary | `itinerary` | `t=<tripId>` | `trips/{id}/itinerary` | `pages/itinerary` |
| Expenses | `expenses.html` | `e=<tripId>` (`embed=1` for embed mode) | `expenses` where `tripId` | `pages/expenses` |
| Edit trip | `edit/trip` | `t=<tripId>` (omitted = new trip) | `trips/{id}` | `pages/edit-trip` |
| Edit destination | `edit/destination` | `d=<destId>` (omitted = new) | `destinations/{id}` | `pages/edit-destination` |
| Edit listing | `edit/listing` | `l=<listId>` (omitted = new) | `listings/{id}` | `pages/edit-listing` |

Notes:
- `.html` is optional on most routes (`getHTMLpage()` strips it). `edit/*` are real folder paths, not `.html` files.
- `view` auto-detects type: `l` → listings, `d` → destinations, else trips.
- **Expenses uses `e` = trip ID**, not `t`.

## URL Parameters

- `t` — trip ID
- `d` — destination ID
- `l` — listing ID
- `e` — trip ID on the expenses page
- `visibility=light|dark` — force theme (the app appends it via `getVisibility()`; the "Copy URL" action strips it). Use `&visibility=light` for stable screenshots.
- `embed=1` — embed mode (expenses).
- `ai=1` — AI-only: enables the dev nav helper (see below). Omit it for normal browsing; final users never see the helper.
- **Preserve existing params when navigating between pages of the same document.**

## Auth & Sign-In

The app uses Firebase Auth (compat SDK) and most data requires a signed-in user. Firestore rules deny reads for unauthenticated sessions — you'll see `Loading Error 🙁 ... false for 'list' @ LNN` when not signed in.

### Getting test credentials (self-service — no env file)

The Auth emulator stores its test accounts on disk with the **plaintext password embedded** in the exported `passwordHash`. Get the credentials in one of two ways:

- **Real-time data (no backup needed):** read `.emulator-data/auth_export/accounts.json`. `npm run dev` keeps this fresh (`--import` / `--export-on-exit`).
- **Fresh export:** run `npm run backup` → `.emulator-data-backups/backup-<timestamp>/auth_export/accounts.json` (or `firebase emulators:export ./.emulator-data` to refresh in place).

Each account entry looks like:

```json
{ "email": "gabriel.o.favero@live.com",
  "passwordHash": "fakeHash:salt=fakeSaltZElFT09srWv7g8Ih7dEm:password=123456" }
```

- `email` is the username.
- Password is the text after `password=` in `passwordHash` (above: `123456`).
- Use emulator users only — never production credentials.

### Signing in (in the browser)

- **From any page (console):** `await firebase.auth().signInWithEmailAndPassword(email, pass)` — the session persists (LOCAL), so all other pages/tabs stay signed in.
- **On `index.html`:** fill `#login-email` and `#login-password`, then click `#login-button`.
- Verify: `firebase.auth().currentUser?.email`, or reload the page and confirm no `Loading Error`.
- If you signed in after a page already errored, **reload** so its Firestore reads run authenticated.

> Troubleshooting `Loading Error 🙁 ...`: **not all loading errors are auth problems.** Check the error text:
> - `false for 'list' @ LNN` / `false for 'get' @ LNN` → a Firestore security-rule denial = the session isn't authenticated. Fetch credentials per above, sign in, and reload. If you created a new emulator user (Emulator UI at `http://localhost:4000` → Auth, or the app's registration flow), its password will appear in the next export. Seed the minimum DB structure with the `initLocalDb` Cloud Function (see the `firebase-emulators` skill).
> - Any other text (e.g. `getState.itinerary is not iterable`, `Cannot read properties of ...`) → an app/data bug on that page, unrelated to auth. Inspect the emulator data (`query-firestore` / `dev.firestore.get(...)`) before treating it as an auth problem.

## Loading & Readiness (IMPORTANT)

- Content sections use the `loadable` class and start with `display: none`; a loading screen + `#preloader` covers the page until data is ready.
- **After navigating, re-read the page and wait** until the loading screen/preloader is gone and the relevant `.loadable` content is visible before clicking or asserting.
- Firestore reads are async — cards, grids, charts, and itinerary populate asynchronously. Wait for the specific element to appear; never assume an instant render.

## Firestore Context

- Collections: `users`, `trips`, `destinations`, `listings`, `expenses`, `protected`, `config`, `admin`.
- Subcollections under a doc (e.g., `trips/{id}/…`): `tripSummaries`, `accommodations`, `transportation`, `itinerary`, `protected` (and similar under destinations/listings).
- Reads go through services (`trip.service.ts`, etc.) → `data/firebase/database.ts` real-time listeners. Inspect live state via the UI or `dev.firestore.get(...)` in the console.
- To query the emulator directly from the CLI: `node scripts/dev/query-firestore.js ...` (see the `query-firestore` skill).

## Navigation Procedures

1. **Get document IDs** — from the emulator (`query-firestore`), from visible URLs, or from the nav helper panel.
2. **Build the target URL** from the route table, preserving the doc param and appending `&visibility=light` for stable screenshots (add `&ai=1` when you want the dev nav helper enabled).
3. **Navigate** (open a page / navigate to URL), then **wait for loadable content** to render.
4. **Verify** with a page read / screenshot before asserting or clicking.
5. Prefer opening **edit pages in a new tab**; keep view pages for read-only inspection. Note: `edit/*` pages show a `beforeunload` confirmation dialog when navigating away (protects unsaved changes) — accept it to leave, or open edits in a new tab to avoid it.

## Dev Nav Helper (AI-only floating widget)

A small floating 🧭 button (bottom-left) for AI browsing. It never changes page functionality — it only appends its own panel and links.

- **AI-only:** it renders ONLY when the URL contains `&ai=1` (and on `localhost`). Append `&ai=1` to enable it; final users never see it because normal URLs omit the flag.
- **Toggle:** click the button or press `Alt+Shift+N`.
- Shows the current page name, doc type + ID, and quick links (Home, View, Edit, Itinerary, Expenses) built from the current URL params — quick links preserve `ai=1` so the helper stays enabled across jumps.
- **Copy URL** copies the canonical URL (strips `visibility` and `ai`).
- Programmatic access: `window.__TRIPVIEWER_NAV__.toggle()` / `.open()`; the `html` element gets `data-tvn-helper="active"`.
- Never in production (localhost-only) and never for regular users (requires `ai=1`).

## Pitfalls

- Don't hardcode collection names — the app uses `COLLECTION.*` / `SUBCOLLECTION.*` constants.
- Don't open `view.html` without a doc param to inspect a document — it renders empty/error states.
- Don't screenshot before content loads (wait for `.loadable` / preloader to clear).
- Expenses uses `e` (trip ID), not `t`.
- From an `edit/*` page, root-page links need a `../` prefix (the nav helper handles this automatically).
