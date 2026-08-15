# Implementation Plan: Replace view.html iframe embeds with component injection

**Status:** Proposed
**Date:** 2026-08-12
**Owner:** TBD
**Related backlog:** ⚔️ E027 "New Front-End: view.html" — *"no more iframe/embeds. Use html injection instead"*
**Related docs:** `docs/analysis/20260613-firestore-auth-intensity.md` (documents the fragile `localStorage` + `postMessage` interop)

---

## 1. Goal

Remove the iframe-based embedding on `view.html` (expenses section, full-itinerary lightbox, destination-detail lightbox) and render that content as **injected components** in the same document, **while keeping `expenses.html`, `itinerary.html`, and `destination.html` fully working as standalone pages**.

**Non-goals:** Do not delete the standalone HTML pages or their URL-entry points. Do not change data models, i18n keys, or the PIN logic semantics. Do not touch the external-media iframes (YouTube/Vimeo via glightbox) — those legitimately need iframes.

---

## 2. Current state (context map)

| Content | Today | Key files |
|---|---|---|
| Expenses section on view.html | iframe `#expenses-embed-frame` → `expenses.html?…&embed=1&e=<tripId>`; auto-height + pin/visibility over `postMessage`; `localStorage('expenses')` handoff | `view.ts` (`loadExpensesModule`), `trip-detail/support/embed.ts` (`openExpensesEmbed`), `expenses/expenses.ts`, `expenses/support/embed.ts`, `ui/embed.ts` |
| Full itinerary lightbox | iframe `#lightbox-iframe` → `itinerary?t=…&visibility=…` | `trip-detail/categories/itinerary-module/itinerary-module.ts` (`openFullItinerary`), `pages/itinerary/*` |
| Destination detail lightbox | iframe `#lightbox-iframe` → `destination?d=…&t=…&type=…&visibility=…` | `trip-detail/categories/destination.ts` (`loadAndOpenDestino`), `pages/destination/*` |
| Interop layer | `postMessage` + `window.parent.closeViewEmbed` (never actually attached to parent `window`) + `localStorage` | `ui/embed.ts`, `trip-detail/support/embed.ts`, `expenses/support/embed.ts` |
| Inline (keep as-is, follow the pattern) | summary/keypoints, transportation, accommodation, daily itinerary calendar, destinations boxes, gallery | `trip-detail/categories/*` |

Build note: each page has its own entry bundle (`scripts/build/inject-partials.js`): `view-entry`, `expenses-entry`, `itinerary-entry`, `destination-entry`. Standalone pages must keep their entries.

---

## 3. Target architecture

```
pages/expenses/        →  mountExpenses(container, opts)          (render-only component)
pages/itinerary/       →  mountFullItinerary(container, opts)     (render-only component)
pages/destination/     →  mountDestination(container, opts)       (render-only component)

expenses.html   (standalone bootstrap) ─┐
itinerary.html  (standalone bootstrap) ─┼─► call the same mount functions
destination.html(standalone bootstrap) ─┘

view.html (trip-detail) ──► dynamic import() of the 3 components, inject into containers
```

**Shared contract for every `mountX(container, opts)`:**
- `container` — the DOM node to render into (already existing in the page).
- `opts` — plain object: `{ tripId, documentId, pin, visibility, embedMode?: boolean }` (only what the component actually needs).
- Returns a cleanup/dispose function (or at least must be idempotent on re-mount: clears `container` before rendering).
- Never reads URL params, never touches `window.parent`, never reads/writes `localStorage`, never creates iframes.
- All the existing data-fetch + PIN gate logic stays; only the *bootstrap* (URL param parsing, top-bar/header/footer wiring) and the *embed adapter* move out.

---

## 4. Workstreams — 4 prompts, 3 parallelizable

Workstreams **A, B, C are independent → run in parallel**. **D is the integration/cleanup pass → runs after A, B, C.**

### Prompt 1 (Workstream A) — Expenses component  🟢 parallel

**Goal:** Extract the expenses render logic into `mountExpenses(container, opts)` so both standalone `expenses.html` and `view.html` can render it.

**Do:**
1. Create `public/assets/ts/pages/expenses/mount.ts` (or `component.ts`) exporting `mountExpenses(container, opts)`.
   - Move the render pipeline from `expenses.ts` (`applyExpenses`, `loadSummary`, `loadPreTripExpenses`, `loadDuringTripExpenses`, `loadTravelerExpenses`, currency conversion, tab listeners) into the component. These already live in `categories.ts`, `currency.ts`, `expenses-converted.ts`, `models/expense.model.ts` — reuse them, don't duplicate.
   - `opts`: `{ tripId, pin?, visibility?, embedMode? }`. Render into `container`, clear it first.
   - Keep the PIN gate (`requestPin` / `expenses/protected/{pin}/{tripId}` fetch) inside the component; pass the resolved pin back via an `onPinResolved?` callback if the host needs it.
2. Rewrite `expenses.ts` (standalone bootstrap) to: parse URL params → call `mountExpenses(getID('expenses-content') /* or equivalent */, opts)` → keep top-bar/close/logo wiring for standalone mode.
3. **Remove the iframe adapter:** delete `expenses/support/embed.ts` (`loadEmbedMode`, `sendHeightMessageToParent`, `embedAfterLoadAction`, `EXPENSES_EMBED`). Remove `postMessage` + `localStorage` reads in `expenses.ts`.
4. Keep `embed=1` param support as a no-op or drop it — decide and note in the PR (D removes the view-side sender).

**Acceptance criteria:**
- `expenses.html?e=<tripId>` standalone renders identically (with PIN gate when `pin != 'no-pin'`).
- `mountExpenses` is a pure render function: no URL params, no `window.parent`, no `localStorage`, no iframe.
- No `sendHeightMessageToParent` / height postMessage remains in `pages/expenses`.

### Prompt 2 (Workstream B) — Full itinerary component  🟢 parallel

**Goal:** Extract the full-itinerary render logic into `mountFullItinerary(container, opts)`.

**Do:**
1. Create `public/assets/ts/pages/itinerary/mount.ts` exporting `mountFullItinerary(container, opts)`.
   - Move the fetch + render from `itinerary.ts` (`getItineraryContent('page')`, print/export handlers, PIN gate for `all-data` / `sensitive-only`) into the component. `opts`: `{ tripId, visibility? }`.
   - Note: standalone itinerary reads `trips/{id}` itself; when used from view, prefer passing the already-loaded trip data (`opts.data`) to avoid a duplicate Firestore read.
2. Rewrite `itinerary.ts` (standalone bootstrap) to call `mountFullItinerary(...)` and keep print/export/top-bar wiring for standalone mode.
3. Remove itinerary's use of `loadEmbedVisibility`/`isEmbed`/`postMessage` from `ui/embed.ts`.

**Acceptance criteria:**
- `itinerary.html?t=<tripId>` standalone renders identically, print/export still work.
- `mountFullItinerary` is pure render; no `window.parent`, no `postMessage`, no iframe.
- When called with `opts.data`, it does **not** re-fetch `trips/{id}`.

### Prompt 3 (Workstream C) — Destination detail component  🟢 parallel

**Goal:** Extract the destination-detail render logic into `mountDestination(container, opts)`.

**Do:**
1. Create `public/assets/ts/pages/destination/mount.ts` exporting `mountDestination(container, opts)`.
   - Move fetch + render from `destination.ts` (categories render, sort-and-filter, media, PIN gate) into the component. `opts`: `{ destinationId, tripId?, type?, visibility? }`.
   - Reuse `destination/support/content.ts`, `categories.ts`, `sort-and-filter/*`.
2. Rewrite `destination.ts` (standalone bootstrap) to call `mountDestination(...)` and keep header/close/logo wiring for standalone mode.
3. Remove destination's `postMessage`/`isEmbed` usage from `ui/embed.ts` (`loadEmbedVisibility`).

**Acceptance criteria:**
- `destination.html?d=<id>&t=<tripId>` standalone renders identically (all categories + filters + media).
- `mountDestination` is pure render; no `window.parent`, no `postMessage`, no iframe.

### Prompt 4 (Workstream D) — Integrate into view.html + remove interop  🔴 after A/B/C

**Goal:** Wire the three components into `view.html` and delete the iframe/postMessage plumbing.

**Do:**
1. `view.html`: replace `<iframe id="expenses-embed-frame">` with an empty container `<div id="expenses-embed">` (already exists as wrapper); replace `<iframe id="lightbox-iframe">` with a container div inside `#lightbox-content`.
2. `trip-detail/support/embed.ts`:
   - `openExpensesEmbed()` → `mountExpenses` (lazy, via `await import('../../expenses/mount.js')`) into `#expenses-embed`; pass `{ tripId, pin, visibility, embedMode: true }` from `getState()` (no `localStorage`, no URL params).
   - `openViewEmbed(url)` → replace the two callers (`openFullItinerary`, `loadAndOpenDestino`) with `mountFullItinerary` / `mountDestination` rendered into the lightbox container. Keep the lightbox overlay open/close + scroll-save behavior, but inject into the container instead of setting `iframe.src`.
   - Remove `loadViewEmbedAction`/`sendToExpenses`/height resizing.
3. Delete the now-unused interop: `ui/embed.ts` (`loadEmbedListeners`, `openEmbed`, `sendToEmbed`, `sendToParent`, `loadEmbedVisibility`, `getOrigin`, `isEmbed` — only if no other caller remains; grep first), the `localStorage.setItem('expenses', …)` in `view.ts:384`, and `ACTIVE_EMBEDS`.
4. **CSS scoping:** make `expenses.css`, `itinerary.css`, `destination.css` available to view.html. Options (pick one, prefer the shared-layer option):
   - Add the `<link>`s to `view.html` (only for the sections view actually renders), or
   - Refactor the three stylesheets onto the shared `variables.css`/component layer and drop page-specific files.
   - Audit class-name collisions with `view.css` (e.g. `.section-title`, `.footer`, cards).
5. **Bundling / perf:** import the three components via **dynamic `import()`** (lazy) in `trip-detail/support/embed.ts` so the initial `view.html` bundle stays lean; rely on esbuild code-splitting. Keep standalone page entries untouched.
6. **Standalone regression:** verify `expenses.html`, `itinerary.html`, `destination.html` still work (they now share the mount functions).
7. **Backlog/README:** update E027 checklist — mark iframe removal done, close `[🏆F129] Adjust expenses iframe height` (no longer needed), note remaining E027 items (destination subcategory refinement).

**Acceptance criteria:**
- `view.html?t=<tripId>` renders expenses inline, full itinerary and destination detail in the lightbox — **no `<iframe>` in the DOM** for these three (dev-tools check).
- Zero `postMessage` between view and the three sections; zero `localStorage` handoff.
- Visibility + PIN sync work in-document (they already flow through `getState()`/theme).
- `npm run build` passes; standalone pages verified via `browser-navigation` skill + emulators.

---

## 5. Global guardrails (all prompts)

- Consult skills before editing: `typescript-conventions`, `css-ui-patterns`, `build-pipeline`, `browser-navigation` (for verification), `git-workflow` (for commits).
- **Never change** the data model (`models/schema.ts`, Firestore reads), i18n keys, PIN semantics, or the standalone page URL-entry points.
- Every mount function must clear its container before rendering (idempotent re-mount).
- Prefer passing already-fetched data via `opts.data` to avoid duplicate Firestore reads when embedded.
- Keep the `postMessage` in `ui/embed.ts` **until** all consumers are migrated (grep for `sendToParent|sendToEmbed|loadEmbedListeners|loadEmbedVisibility` — if only view/expenses/itinerary/destination consume it, D can remove it).
- Do not remove the standalone HTML pages or their build entries in `scripts/build/inject-partials.js`.

## 6. Verification checklist (end of D)

- [ ] `npm run build` clean.
- [ ] Emulators up; `view.html?t=<tripId>` renders expenses, full itinerary, destination detail without iframes (dev-tools `document.querySelectorAll('iframe')` shows only media embeds / none for these).
- [ ] `expenses.html?e=<tripId>`, `itinerary.html?t=<tripId>`, `destination.html?d=<id>&t=<tripId>` standalone all render + PIN gates work.
- [ ] Theme/visibility switch propagates in-document (no cross-frame sync needed).
- [ ] No `localStorage('expenses')` reads/writes remain.
- [ ] No `window.parent.closeViewEmbed` references remain in `pages/{expenses,itinerary,destination}`.
- [ ] README E027 / F129 updated.

## 7. Suggested commit structure

1. `feat(expenses): extract mountExpenses component` (A)
2. `feat(itinerary): extract mountFullItinerary component` (B)
3. `feat(destination): extract mountDestination component` (C)
4. `refactor(view): render expenses/itinerary/destination inline, drop iframes` (D)
