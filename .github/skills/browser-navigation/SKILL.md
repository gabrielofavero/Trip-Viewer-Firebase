---
name: browser-navigation
description: 'Use when you must build a TripViewer page URL (params t/d/l/e/visibility/ai), sign in with emulator test credentials, wait for Firestore-backed content to load before asserting/screenshotting, or triage a "Loading Error" after navigating. NOT for: reading DB state (query-firestore), emulator lifecycle (firebase-emulators), or trivial re-verification of an already-loaded page.'
---

# TripViewer Browser Navigation

Fast-path reference for driving the TripViewer web app in the integrated browser (dev emulators or production).

## ⚠️ Explicit Approval Required (Playwright / Browser)

This skill drives the integrated browser with Playwright (open pages, navigate, click/type, screenshot, sign in). Per the project instructions, **do NOT use any browser/Playwright tools unless the user has explicitly approved browser validation for the current task** — this includes:

- Opening a page or tab
- Navigating between pages
- Clicking, typing, or otherwise interacting with the page
- Taking screenshots
- Signing in via the browser console or UI

If a task could be checked in the browser but the user hasn't approved it, **ask first**. Prefer non-browser verification (`npm run build`, `query-firestore`, `dev.firestore.get(...)`) instead. Only after the user approves (e.g. "yes, validate in the browser") should you follow the steps below.

## When to Use

- Building correct page URLs (params `t`/`d`/`l`/`e`) and navigating between pages
- Signing in with emulator test credentials before inspecting authenticated pages
- Waiting for Firestore-backed content to finish loading before acting/screenshotting
- Triaging a `Loading Error` after navigation

## When NOT to Use (delegate elsewhere)

- **Reading Firestore data** → `query-firestore` skill (`node scripts/dev/query-firestore.js ...` or `dev.firestore.get(...)` in the console)
- **Starting/stopping/exporting emulators, seeding, `initLocalDb`** → `firebase-emulators` skill
- **Trivial re-check of a page you already loaded/verified** → just re-read the page; no full ceremony needed

## Quick Start

0. **Dev is usually already running** — this repo's workflow keeps `npm run dev` active in a terminal. Don't start/restart it; just confirm `http://localhost:5000` responds (if it doesn't, see the `firebase-emulators` skill).
1. **Get creds:** read `.emulator-data/auth_export/accounts.json` (kept fresh by `npm run dev`) or `npm run backup`. Password = text after `password=` in `passwordHash`; emulator users only, never production. *Known-good dev user: `gabriel.o.favero@live.com` / `123456` (re-check `accounts.json` only if auth fails).*
2. **Sign in (browser console):** `await firebase.auth().signInWithEmailAndPassword(email, pass)` — persists (LOCAL) across tabs. On `index.html` instead: fill `#login-email`/`#login-password`, click `#login-button`. Verify: `firebase.auth().currentUser?.email`; if a page already errored, **reload** after signing in.
3. **Build URL** from the route table (preserve existing params). Append `&visibility=light` for stable screenshots; `&ai=1` to enable the dev nav helper.
4. **Navigate, then WAIT** — content is async: a loading screen + `#preloader` cover the page until data is ready. Re-read the page and wait until the relevant `.loadable` content is visible before clicking or asserting.
5. **Verify** with a page read / screenshot before asserting.

## Environment

- **Dev (recommended):** `npm run dev` → app at `http://localhost:5000`, emulators Firestore `8085` / Auth `9099` / Functions `5001` / Emulator UI `4000`. Data persists in `.emulator-data/`. **`npm run dev` is almost always already running** — verify `http://localhost:5000` is up and proceed; only start it if unreachable (lifecycle → `firebase-emulators` skill).
- **Production:** `https://trip-viewer.com` (project `trip-viewer-prd`) — emulator creds never work here.
- **Dev console helper (localhost only):** global `dev` object — `dev.firestore.get("path")`, `dev.firestore.set("path", {})`, `dev.help()`. Read DB state in-app without leaving the page.

## Page & Route Reference

| Page | URL | Params | Firestore source | Entry module |
|---|---|---|---|---|
| Dashboard | `index.html` | — | `users/{uid}` summaries | `pages/home` |
| Trip detail | `view.html` | `t=<tripId>` | `trips/{id}` + subcollections (destination boxes render from cached `destinationRefs` metadata) | `pages/trip-detail` |
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
- **Preserve existing params when navigating between pages of the same document.**

## URL Parameters

- `t` — trip ID
- `d` — destination ID
- `l` — listing ID
- `e` — trip ID on the expenses page
- `visibility=light|dark` — force theme (the app appends it via `getVisibility()`; the "Copy URL" action strips it). Use `&visibility=light` for stable screenshots.
- `embed=1` — embed mode (expenses).
- `ai=1` — AI-only: enables the dev nav helper (see below). Omit it for normal browsing; final users never see the helper.

## Triaging `Loading Error 🙁`

**Not all loading errors are auth problems.** Check the error text:

- `false for 'list' @ LNN` / `false for 'get' @ LNN` → a Firestore security-rule denial = the session isn't authenticated. Sign in (Quick Start) and reload. If you created a new emulator user (Emulator UI at `http://localhost:4000` → Auth, or the app's registration flow), its password appears in the next export. Seed minimum DB with the `initLocalDb` Cloud Function (see `firebase-emulators` skill).
- Any other text (e.g. `getState.itinerary is not iterable`, `Cannot read properties of ...`) → an app/data bug on that page, unrelated to auth. Inspect emulator data (`query-firestore` / `dev.firestore.get(...)`) before treating it as an auth problem.

## Dev Nav Helper (AI-only floating widget)

A small floating 🧭 button (bottom-left) for AI browsing. It never changes page functionality — it only appends its own panel and links.

- **AI-only:** renders ONLY when the URL contains `&ai=1` (and on `localhost`). Final users never see it.
- **Toggle:** click the button or press `Alt+Shift+N`. Programmatic: `window.__TRIPVIEWER_NAV__.toggle()` / `.open()`; `html` gets `data-tvn-helper="active"`.
- Shows current page name, doc type + ID, and quick links (Home, View, Edit, Itinerary, Expenses) built from the current URL params — quick links preserve `ai=1`. **Copy URL** copies the canonical URL (strips `visibility` and `ai`).
- Never in production (localhost-only) and never for regular users (requires `ai=1`). Source: `public/shared/nav-helper.html`.

## Firestore Context

- Collections: `users`, `trips`, `destinations`, `listings`, `expenses`, `protected`, `config`, `admin`.
- Subcollections under a doc (e.g., `trips/{id}/…`): `tripSummaries`, `accommodations`, `transportation`, `itinerary`, `protected` (and similar under destinations/listings).
- Reads go through services (`trip.service.ts`, etc.) → `data/firebase/database.ts` real-time listeners. Inspect live state via the UI or `dev.firestore.get(...)` in the console.
- Query the emulator directly from the CLI: `node scripts/dev/query-firestore.js ...` (see the `query-firestore` skill).

## Pitfalls

- Don't hardcode collection names — the app uses `COLLECTION.*` / `SUBCOLLECTION.*` constants.
- Don't open `view.html` without a doc param to inspect a document — it renders empty/error states.
- Don't screenshot before content loads (wait for `.loadable` / preloader to clear).
- Expenses uses `e` (trip ID), not `t`.
- Prefer opening **edit pages in a new tab**; `edit/*` pages show a `beforeunload` confirmation when navigating away — accept it to leave, or open edits in a new tab to avoid it.
- From an `edit/*` page, root-page links need a `../` prefix (the nav helper handles this automatically).
