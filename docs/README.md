# Docs Index

House rules: docs are grouped by **purpose**, not by author or tool. When adding a new doc,
put it in the folder that matches its kind (see below) — don't drop it into `analysis/` just
because it was written by an AI.

Filenames use `YYYYMMDD-title.md` (title in kebab-case) — the date is the doc's
content date, falling back to its git creation date when the doc carries none.

| Folder | Purpose | Contents |
|---|---|---|
| [`analysis/`](./analysis/) | Research, investigation, and findings — severity assessments, options evaluation, feasibility research. | `20260728-framework-recommendation`, `20260613-firestore-auth-intensity`, `20260705-vendor-globals-cleanup`, `20260810-google-maps-local-scraping-research` |
| [`proposals/`](./proposals/) | Proposed designs awaiting a decision (status: proposal / draft). | `20260726-encryption-at-rest`, `20260614-new-database-proposal` |
| [`contracts/`](./contracts/) | Finalized interface/API contracts that code must implement against (single source of truth). | `20260808-places-api-backend-contract` |
| [`implementation-plans/`](./implementation-plans/) | Step-by-step build plans, specs, and feature docs for work that is planned, in flight, or done. | `20260728-edit-styling-guide`, `20260812-places-api-edit-destination`, `20260809-places-api-worker-build-prompts`, `20260810-gmaps-scraper-local-import`, `20260814-destination-page-card-refactor`, `20260812-iframe-to-components`, `20260815-static-web-export` |
| [`database/`](./database/) | Firestore document/schema documentation. | `trip-document-structure`, `expenses-document-structure`, `destination-document-structure` |
| [`legacy-trips/`](./legacy-trips/) | Historical trip data (JSON), not documentation. | — |
| [`responses/`](./responses/) | Archived AI conversation responses (per feature). | `Places API/`, `Pleper Extension/` |

---

## `analysis/` — Research & findings

| Doc | What it is | Date / status |
|---|---|---|
| [`20260728-framework-recommendation.md`](./analysis/20260728-framework-recommendation.md) | Frontend architecture options evaluation (React/Angular/Vue vs incremental TypeScript) + recommendation. | 2026-07-28 |
| [`20260613-firestore-auth-intensity.md`](./analysis/20260613-firestore-auth-intensity.md) | Firestore read/write + Auth listener intensity analysis (severity-ordered). | 2026-06-13 |
| [`20260705-vendor-globals-cleanup.md`](./analysis/20260705-vendor-globals-cleanup.md) | Audit of legacy globals in `vendor.d.ts` — what to delete vs. keep. | 2026-07-05 |
| [`20260810-google-maps-local-scraping-research.md`](./analysis/20260810-google-maps-local-scraping-research.md) | Research on local Google Maps scraping options (chose `gosom/google-maps-scraper`). | 2026-08-10 |

## `proposals/` — Proposals awaiting decision

| Doc | What it is | Date / status |
|---|---|---|
| [`20260614-new-database-proposal.md`](./proposals/20260614-new-database-proposal.md) | English translation + optimization of the Firestore schema (Option A vs Option B). | 2026-06-14 · proposal |
| [`20260726-encryption-at-rest.md`](./proposals/20260726-encryption-at-rest.md) | Encrypt sensitive fields at rest (Firestore + offline JSON exports). | 2026-07-26 · draft |

## `contracts/` — Finalized contracts

| Doc | What it is | Date / status |
|---|---|---|
| [`20260808-places-api-backend-contract.md`](./contracts/20260808-places-api-backend-contract.md) | Cloudflare Worker ↔ Google Places API (New) contract — routes, data model, auth/uid/lang, field masks, errors. Source of truth for the worker. | 2026-08-08 · finalized |

## `implementation-plans/` — Build plans & specs

| Doc | What it is | Status |
|---|---|---|
| [`20260728-edit-styling-guide.md`](./implementation-plans/20260728-edit-styling-guide.md) | Edit pages styling & UX modernization specification (trip/destination/listing). | spec |
| [`20260812-places-api-edit-destination.md`](./implementation-plans/20260812-places-api-edit-destination.md) | Frontend integration of the Places API into edit-destination (per-item + bulk flows, 13 prompts). | planned → done |
| [`20260809-places-api-worker-build-prompts.md`](./implementation-plans/20260809-places-api-worker-build-prompts.md) | Cloudflare Worker build plan (P1–P4 prompts); contract in `../contracts/20260808-places-api-backend-contract.md`. | P1–P4 done |
| [`20260810-gmaps-scraper-local-import.md`](./implementation-plans/20260810-gmaps-scraper-local-import.md) | Local "Import with maps" (gmaps scraper) option E045 — feature docs + revert guide. | implemented (local-only) |
| [`20260814-destination-page-card-refactor.md`](./implementation-plans/20260814-destination-page-card-refactor.md) | Destination page card-based visual refactor. | 2026-08-14 · proposed |
| [`20260812-iframe-to-components.md`](./implementation-plans/20260812-iframe-to-components.md) | Replace view.html iframe embeds with injected components. | 2026-08-12 · proposed |
| [`20260815-static-web-export.md`](./implementation-plans/20260815-static-web-export.md) | Export a document as a self-contained offline ZIP (no Firebase) — runtime static-mode seam, build manifest, export UI, ZIP builder, self-hosted icons/fonts (E043). | P1–P4 done |
