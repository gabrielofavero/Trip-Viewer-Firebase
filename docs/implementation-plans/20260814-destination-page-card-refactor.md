# Implementation Plan: Destination Page — Card-Based Visual Refactor

**Status:** Proposed
**Date:** 2026-08-14
**Owner:** TBD
**Related backlog:** 🎨 New destination page look (cards, hero background, lazy load, search, tab bar)
**Related docs:**
- `docs/implementation-plans/20260812-iframe-to-components.md` (component contract that `pages/destination/mount.ts` must keep honoring)
- `.github/skills/css-ui-patterns` / `.github/skills/typescript-conventions` / `.github/skills/data-model`
- `docs/implementation-plans/20260728-edit-styling-guide.md` (edit page styling that informs the tab-bar reuse)

---

## 1. Goal

Rework the **destination page** (`destination.html`) from its current "title + custom-select + filter/sort pills + accordions" layout into a **card-based, index-like** experience, reusing components and visual patterns that already exist elsewhere in the app.

**Non-goals:** Do not change the Firestore data model, i18n keys semantics, the PIN/access logic, or the `mountDestination(container, opts)` component contract (view.html still embeds this page in its lightbox). Do not delete standalone `destination.html` or `view.html`. Do not touch the edit-destination page (`edit/destination.html`) itself — only how the destination page *reads* and *edits* entries.

---

## 2. Current state (context map)

| Concern | Today | Key files |
|---|---|---|
| Page chrome | Plain `.section-title` + `.destinations-select` (custom select) + `.section-buttons` filter/sort pills + footer | `public/destination.html`, `public/assets/css/destination/destination.css` |
| Category switch | Custom select (`loadDestinationCustomSelect` in `destination.ts` → `loadCustomSelect`) | `pages/destination/destination.ts`, `ui/custom-select.ts` |
| Item rendering | Bootstrap accordions (`getDestinationsHTML` → `getDestinationsAccordionBodyHTML`), full re-render via `applyContent()` | `pages/destination/support/content.ts`, `pages/destination/mount.ts` |
| Media / embeds | iframe embeds (YouTube/TikTok/Instagram) + watchdogs | `pages/destination/support/media-embed.ts` |
| Sort / filter | `CONTENT[]` flags + `applyContent()` re-render, drawer | `pages/destination/support/sort-and-filter/*` |
| Edit in place | `edit()`/`add()` swap accordion body for `getEditHTML` | `pages/destination/edit-destination.ts` |
| Lazy + search (to copy) | `LazyGrid` IntersectionObserver + `.search-bar` | `pages/home/support/lazy-grid.ts`, `pages/home/support/data.ts`, `public/assets/css/index/index.css` |
| Hero bg (to copy) | `#hero` fixed-attachment bg + `#hero::before` + `.content-box` frosted panel | `public/assets/css/index/index.css` |
| Tab bar (to copy) | `.edit-tab-bar` / `.edit-tab` | `public/assets/css/edit/edit.css`, `public/edit/destination.html` |
| Category icon + color (to copy) | `iconbox-<color>` blob + `bx bx-*` icon in `loadDestinationsHTML` | `pages/trip-detail/categories/destination.ts`, `public/assets/json/destinations-config.json` (`icons`, `boxes`) |
| Lightbox + hover (to copy) | `loadImageLightbox` + `.portfolio-wrap` hover | `pages/trip-detail/support/embed.ts`, `public/assets/css/view/view.css` |

**Data facts (destination entry):** `images: { description, link }[]` (up to 5, added Aug 2026 — may be absent → guard with `Array.isArray`); `media` = TikTok/YouTube embed URL; links `website`/`map`/`instagram`; `rating` "1"–"5" or ""; `region`; `price`; `description.{en,pt}`; `name`; `emoji`; `isNew`. See `.github/skills/data-model` → DestinationEntry.

**⚠️ Cross-page coupling that must survive:** `utils/dom.ts` imports `getDestinationsAccordionBodyHTML` from `pages/destination/support/content.js`, and **view.html's inner-itinerary popups** (`trip-detail/categories/itinerary-module/inner-itinerary.ts`) render destination entries through `getDestinationsBoxHTML(…, { innerItinerary: true, editBtn: false })`. Any change to the shared detail-body renderer must keep it working for view.html (edit affordance hidden), or be updated in the same prompt.

---

## 3. Target architecture

```
destination.html
└─ section#hero.loadable  (index-like fixed bg + ::before overlay)
   └─ .content-box  (frosted panel, max-width like index)
      ├─ .section-title (h1#title + #destinations-subtitle)
      ├─ #destination-tab-bar      ← edit-tab-bar-style pills (JS-rendered from config)
      ├─ #destination-search-bar   ← index search bar (below the tab bar)
      ├─ #filter-sort-container    ← sort/filter pills (view tabs styling inspiration)
      ├─ #content                  ← card grid (LazyGrid target)
      ├─ #destinations-grid-sentinel (static sibling sentinel for infinite scroll)
      └─ .add-container            ← "add destination" button (kept, owner-only)

render pipeline (mount.ts):
  setDestinationData → loadTabBar() → loadSortAndFilter() → computeEntries()
                    → grid.setItems(ordered+filtered entries)   ← lazy + search via grid
  card = getDestinationCardHTML({ j, id, item })
         ├─ getCardImageHTML(item, j)      // first image | icon+color blob (view pattern)
         ├─ score badge (rating icon+text) // replaces any dialog-badge
         ├─ detail body (shared with inner-itinerary)
         ├─ getCardActionsHTML(item)       // website / map / instagram / video links
         └─ getCardEditHTML(item, j)       // edit affordance (owner only)
```

---

## 4. Spec → solution map

| User spec | Solution | Reuse (don't duplicate) |
|---|---|---|
| Background like index | Add `#hero` + `::before` + `.content-box`; fixed-attachment bg | Extract shared hero rules into `components/page-hero.css` (import via `main.css`); index keeps working |
| Cards instead of accordions | Replace `getDestinationsHTML` with `getDestinationCardHTML` | `.trip-card/.dest-card` CSS pattern from `index.css` |
| Card image = first entry image, else icon+color | `item.images?.[0]?.link`; fallback = category icon + `boxes[i].color` blob (same as view `loadDestinationsHTML`) | `getDestinations().icons` + `.boxes` + `getDestinationsBoxesIndex` logic |
| Open card: auto carousel when multiple images; click → glightbox-slider with view hover | Swiper autoplay inside expanded card; `GLightbox` on click; `.portfolio-wrap` hover | `trip-detail/support/swiper.ts` init pattern, `loadImageLightbox`, `.portfolio-wrap` CSS |
| Adapt fields to card; score replaces dialog-badge | Score badge = `getRatingIcon` + `getRatingClass` + `getRatingTranslation`; meta rows = region/price/planned/description | existing rating helpers + `getPriceValue`/`getDescriptionValue`/`getPlanned` |
| Kill embeds → clickable video links | Delete embed pipeline; video button via `getLinkMediaButton(media)` (already provider-aware); link buttons for website/map/instagram | `getLinkMediaButton` (utils/dom.ts), `getLinkOnClick` |
| Container: select → edit-tab-bar style | `#destination-tab-bar` with `.edit-tab` pills, one per category that has entries (+ Map) | `.edit-tab-bar/.edit-tab` CSS + `ui/edit-tabs.ts` interaction pattern (not the module itself) |
| Lazy load + search below tab bar | `LazyGrid` + `.search-bar` | Extract `LazyGrid` to `ui/lazy-grid.ts`, reuse `.search-bar` CSS |
| Sort/filter buttons + modernized drawer | Keep pills + drawer; restyle pills like view `.tabs`; restyle drawer | view `.tabs` styling, existing drawer logic |
| Keep in-place editing; edit not in link row | Card-level edit button opens `getEditHTML` inside expanded card | `edit-destination.ts` save/validate/delete logic stays; only mount/restore targets change |

---

## 5. Shared contract (IDs / classes / module ownership)

**New static IDs in `destination.html`** (P1 creates; later prompts consume — do not rename):

- `#hero` (section) — hero background wrapper
- `.content-box` — frosted panel (same class as index)
- `#title`, `#destinations-subtitle` — unchanged
- `#destination-tab-bar` — category pill bar (JS-rendered)
- `#destination-search-bar`, `#destination-search-input`, `#destination-search-clear`
- `#filter-sort-container`, `#filter`, `#sort` — unchanged ids, restyled
- `#content` — **card grid container** (unchanged id, keeps `mountDestination` contract working for view.html lightbox)
- `#destinations-grid-sentinel` — infinite-scroll sentinel (static sibling of `#content`)
- `.add-container`, `#add-button` — unchanged

**Module ownership (avoid merge conflicts across prompts):**

| File | Owner |
|---|---|
| `public/destination.html` | P1 only |
| `public/assets/css/destination/destination.css` | P1 (chrome) + P3 (media) + P4 (actions) — each touches only its own commented section |
| `components/page-hero.css`, `components/frosted-tabs.css`, `components/search-bar.css` (new shared CSS) | P1 only |
| `ui/lazy-grid.ts` (extracted) | P2 only |
| `pages/home/support/lazy-grid.ts` + `pages/home/support/data.ts` (re-import) | P2 only (one-line import swap) |
| `pages/destination/support/card.ts` (new — card shell) | P2 creates; P4/P5 only call their stubs (no edit) |
| `pages/destination/support/card-media.ts` (new) | P2 creates base; **P3 enhances** |
| `pages/destination/support/card-actions.ts` (new) | P4 only |
| `pages/destination/support/card-edit.ts` (new) | P5 only |
| `pages/destination/support/content.ts` (detail body) | P4 (links/media) and P5 (remove edit button) — coordinate via comment markers |
| `pages/destination/support/media-embed.ts` | P4 deletes |
| `pages/destination/support/sort-and-filter/*` | P2 rewires |
| `pages/destination/mount.ts`, `destination.ts`, `edit-destination.ts`, `event-listeners.ts`, `destination-entry.ts`, `support/visibility.ts` | P2 + P4 + P5 by section; P6 does final cross-cutting cleanup |

---

## 6. Workstreams — 6 prompts, 3 parallelizable

```
P1 (Foundation HTML/CSS)
   │
   ▼
P2 (Card renderer + data pipeline + lazy + search)
   │
   ├─► P3 (Card media: carousel + lightbox + hover)        🟢 parallel
   ├─► P4 (Kill embeds → link buttons)                     🟢 parallel
   └─► P5 (Edit flow adaptation)                           🟢 parallel
                        │
                        ▼
               P6 (Integration + cleanup + verify)
```

---

### Prompt 1 (Foundation) — Restructure `destination.html` + CSS chrome

**Goal:** Give the page the index-like chrome (hero, frosted panel, pill tab bar, search bar, sort/filter pills, grid + sentinel, modernized drawer) **without any TS changes** — the page may render with empty content at this stage.

**Do:**
1. Rewrite `public/destination.html` body:
   - Wrap everything in `<section id="hero" class="loadable">` → `.content-box`.
   - Keep `top-bar`, footer, `#preloader`, `#toast`, drawer markup, `nav-helper`.
   - Replace `.destinations-select` block with `#destination-tab-bar` (empty, JS-rendered).
   - Add `#destination-search-bar` (icon + input + clear button) **below** the tab bar.
   - Keep `#filter-sort-container` with `#filter` / `#sort` buttons (re-markup with pill classes).
   - `#content` becomes the card grid; add `#destinations-grid-sentinel` as a sibling right after `#content`.
   - Remove the tiktok/instagram embed `<script>` tags (P4 deletes the embed code that used them).
2. CSS (dedupe by extracting shared primitives):
   - New `components/page-hero.css`: move `#hero`, `#hero::before`, `[data-theme="dark"] #hero`, `.content-box` from `index.css`; import in `main.css`; remove the duplicates from `index.css`.
   - New `components/frosted-tabs.css`: move `.category-tabs/.category-tab` (index) **and** `.edit-tab-bar/.edit-tab` (edit) into one file (they are near-identical); import in `main.css`; remove duplicates from `index.css` and `edit.css`.
   - New `components/search-bar.css`: move `.search-bar/.search-icon/.search-input/.search-clear` from `index.css`.
   - In `destination.css`: add the destination card grid styles (`.dest-grid`-like), sort/filter pills restyled after view `.tabs` (frosted pill + active state), and modernize the drawer (frosted glass, rounded, updated option buttons) — keep existing drawer class names so `sort-and-filter` keeps working.
   - Add dark-mode overrides for any new chrome to `base/dark-mode.css`.
3. **Contract:** keep every id/class listed in §5 exactly.

**Acceptance:**
- `npm run build` passes; `destination.html?d=…` renders the new chrome (hero bg, tab bar placeholder, search, pills, empty grid, modern drawer) with no data; index.html and edit pages still look unchanged.
- No TS files modified.

---

### Prompt 2 (Card renderer + data pipeline + lazy + search) — sequential after P1

**Goal:** Replace the accordion render path with lazy card rendering, and make sort/filter/search drive the grid.

**Do:**
1. Extract `pages/home/support/lazy-grid.ts` → `ui/lazy-grid.ts`; add an optional `getSearchText(item)` accessor (default `(item) => item.title`) so destination can search by `entry.name`. Update `pages/home/support/data.ts` import to the new path (home keeps working). Delete the old file.
2. New `pages/destination/support/card.ts` → `getDestinationCardHTML({ j, id, item })`:
   - Card shell modeled on index `.dest-card` (image area + body + score badge in top-right of the image area, replacing the old rating icon in the accordion header).
   - Compose from stubs it also creates: `getCardImageHTML(item, j)` (base = first `item.images?.[0]?.link`, else icon+color via `getDestinations().icons[ACTIVE_CATEGORY]` + `boxes[getDestinationsBoxesIndex(i)]` — reuse the exact blob/`iconbox-<color>` markup from `trip-detail/categories/destination.ts` `loadDestinationsHTML`), `getCardActionsHTML(item)` (stub returns `''`), `getCardEditHTML(item, j)` (stub returns `''`).
   - Detail body: reuse the existing `getDestinationsAccordionBodyHTML` with `editBtn: false` (P5 moves the edit affordance out; P4 will own the links/media inside it).
   - Score badge: reuse `getRatingIcon` + `getRatingClass` + `getRatingTranslation`; hide when `rating` empty (render `rating-absent`/question icon as today).
   - Meta rows: region (`mingcute:location-line`), price (`getPriceValue`), planned (`getPlanned`), description (`getDescriptionValue`) — mirror the existing `.destinations-topic` structure.
3. New `pages/destination/support/card-media.ts` with the base `getCardImageHTML` (first image or icon+color).
4. Rewire the pipeline in `mount.ts`:
   - `loadDestinationByType`: instead of building `CONTENT[]` of `{id, innerHTML}` and `applyContent()`, build an **entry list** `[{ id, item }]`, run `loadSortAndFilter()` (sort/filter become pure list transforms — see below), then `grid.setItems(orderedFilteredEntries)`.
   - Create one `LazyGrid` bound to `#content` + `#destinations-grid-sentinel` with `renderItem = (entry) => getDestinationCardHTML({ id: entry.id, item: entry.item })` and `getSearchText = (entry) => entry.item?.name || ''`.
   - `applyContent()` becomes "recompute entries + `grid.setItems(...)`" (keep the exported name for backward compat with view.html lightbox path).
   - `myMaps`: keep the existing map iframe path; additionally hide search bar + sentinel for map.
5. Rewire `sort-and-filter`:
   - `sort()` and `filter()` operate on the entry list and **return** an ordered/filtered list (stop mutating `CONTENT[].filtered` + full innerHTML re-render). Keep the drawer option loaders (`loadFilterOptions`/`loadSortOptions`) and `FILTER_OPTIONS`/`SORT_OPTIONS` intact.
   - Keep `getDataSet`, `shouldDisplay*`, `isPlanned`, preferences logic untouched.
6. Replace `loadDestinationCustomSelect` in `destination.ts` with `loadDestinationTabBar()`: render `.edit-tab` pills into `#destination-tab-bar` from `getDestinations().categories.ids`, showing only categories present in `FIRESTORE_DESTINATIONS_DATA` (empty data categories skipped; `myMaps` shown as "Map" when present). Tab click → `updateActiveCategory(value)` + `loadDestinationByType(value)`. Reuse the edit-tab-bar interaction pattern; icons from `getDestinations().icons[type]`.
7. Wire the search bar: input → `grid.setQuery(value)`; clear button toggles/resets.

**Acceptance:**
- Cards lazy-load in batches as you scroll; search filters by name; sort + filter + planned all work and re-render lazily; category tabs switch correctly; `myMaps` still shows the map iframe.
- `npm run build` passes; `index.html` lazy grids still work (shared `LazyGrid`).
- No embed/iframe code is touched (that's P4).

---

### Prompt 3 (Card media: carousel + lightbox + hover) — parallel, after P2

**Owner file:** `pages/destination/support/card-media.ts` + a dedicated section in `destination.css`.

**Goal:** When a card is expanded and its entry has images, show an auto-cycling carousel; clicking an image opens a GLightbox slider with the view gallery's hover effect.

**Do:**
1. In `card-media.ts`, extend the media area:
   - 0 images → keep the icon+color fallback (from P2).
   - 1 image → static image.
   - ≥2 images → Swiper slider (reuse the `initSwiper` pattern from `trip-detail/support/swiper.ts`; vendored Swiper is already loaded in `scripts-vendor.html`) with `autoplay` enabled.
2. Every image is wrapped like view's `.portfolio-wrap` (image + overlay + zoom link) so the same hover effect applies (reuse `.portfolio-wrap` CSS — move it to a shared component CSS or `@import`/duplicate-free location so both view and destination use one definition).
3. Register `GLightbox` via a shared `loadImageLightbox` (extract the tiny wrapper from `trip-detail/support/embed.ts` into `ui/lightbox.ts`, re-export from view for backward compat) with `data-gallery` per card so the lightbox navigates across that entry's images.
4. Define and export the card-open/close media hooks `onCardOpen(j)` / `onCardClose(j)` (init Swiper + register lightbox on open; destroy Swiper on close) — P5 calls them from the card open/close mechanics.
5. Add dark-mode + responsive styles for the carousel and the hover overlay.

**Acceptance:**
- Expanded card with ≥2 images auto-cycles; click opens a GLightbox slider (same hover effect as view); single image static; no image → icon+color. Re-collapsing the card destroys the Swiper instance (no leaks).
- `npm run build` passes; view gallery lightbox still works (shared `loadImageLightbox`).

---

### Prompt 4 (Kill embeds → link buttons) — parallel, after P2

**Owner file:** `pages/destination/support/card-actions.ts` + delete `media-embed.ts`.

**Goal:** Remove the iframe embed implementation entirely and replace the old link icons + embed area with a row of clickable link buttons (website, map, instagram, video).

**Do:**
1. Delete `pages/destination/support/media-embed.ts` (embeds, watchdogs, Instagram blockquote, TikTok iframes, `adjustInstagramMedia`, `MEDIA_HYPERLINKS`, etc.). Update every importer:
   - `mount.ts`: drop `loadEmbed/loadMedia/unloadMedia/unloadMedias/MEDIA_HYPERLINKS/adjustInstagramMedia` usage; remove the `toggleMedia`/media-height logic tied to accordions.
   - `destination.ts` / `destination-entry.ts`: drop `adjustMediaEmbeds` and the side-effect import.
   - `support/visibility.ts`: remove `applyDestinationsMediaHeight` if it only served embeds (keep anything else it does).
2. Implement `getCardActionsHTML(item)` in `card-actions.ts`:
   - Buttons for `website` (`tabler:world`), `map` (`f7:map`), `instagram` (`ri:instagram-line`), and `media`/video.
   - Video button: reuse `getLinkMediaButton(media)` from `utils/dom.ts` (already provider-aware: YouTube/TikTok/Instagram/Spotify/generic icons + `data-action="open-link"`). This is the only video affordance now — opens in a new tab.
   - All buttons use `data-action="open-link"` (already registered in `event-listeners.ts`); hide buttons whose field is empty.
3. Update the shared detail body (`content.ts` `getDestinationsAccordionBodyHTML`) to remove the old `.links-container` icon row and the `#media-${j}` embed container (the new `getCardActionsHTML` replaces them). **Keep it working with `editBtn: false` for view.html inner-itinerary** — the links/media must still render for view popups via the new actions row or an inner-itinerary-safe variant.
4. Remove the tiktok/instagram embed `<script>` tags from `destination.html` (if not already removed in P1).
5. Keep `normalizeTikTokLink`, `validateMediaLink`, `validateLink`, `validateMapLink`, `validateInstagramLink` (still used by the edit form).

**Acceptance:**
- No iframe embeds render anywhere on the destination page or view.html inner-itinerary destination popups; every media/link is a clickable button opening in a new tab with the correct provider icon.
- `npm run build` passes; `getLinkMediaButton` still works for itinerary media (unchanged).

---

### Prompt 5 (Edit flow adaptation) — parallel, after P2

**Owner files:** `pages/destination/edit-destination.ts` + new `support/card-edit.ts`.

**Goal:** Keep in-place add/edit/delete working, but move the edit affordance out of the link/action row and onto the card, and adapt the accordion-body swap to card-body swap.

**Do:**
1. New `support/card-edit.ts` → `getCardEditHTML(item, j)` renders a small owner-only edit button (pencil, e.g. `tabler:edit`) in the card header/footer area — **not** in the actions row. It must be hidden for non-owners (reuse the existing `canEdit()` check / `adjustEditVisibility`).
2. Adapt `edit-destination.ts`:
   - `edit(j)`: replace the **card body** (new `card-body-${j}` element produced by `card.ts`) with `getEditHTML(j)` instead of `accordion-body-${j}`.
   - `add()`: append a new **card** (via `getDestinationCardHTML` + `getEditHTML`) instead of an accordion; keep `ADDED_J` + `closeAddedDestination` semantics (`removeEl('destinations-card-${j}')`).
   - `restoreAccordionBody` → `restoreCardBody` (rebuild the card detail via the shared detail renderer); `restoreIfEditing` follows.
   - Replace `processAccordion` with `processCard(j)`: open/close card (custom expand, no Bootstrap collapse) + call the media hooks `onCardOpen(j)`/`onCardClose(j)` from P3 + `adjustDrawer()` + `adjustEditVisibility(j)`.
   - Keep `saveEdit`, `deleteEdit`, `promptDeleteEdit`, field listeners, planned/rating/region/price/description handling, and `normalizeTikTokLink` unchanged — only the DOM mount/restore targets change.
3. Update `event-listeners.ts` and `mount.ts` to register/reference `processCard` instead of `processAccordion` (keep an alias if view.html lightbox still references it — verify with P6).
4. Remove the edit button from `getDestinationsAccordionBodyHTML` (its `editBtn` branch) — P5 owns this; coordinate with P4 which edits the same function.

**Acceptance:**
- Owner can add/edit/delete entries in place on cards; non-owner sees no edit affordance; the edit button is never in the link/action row.
- `npm run build` passes; edit save/delete still refresh the destination via `refreshDestination()`.

---

### Prompt 6 (Integration + cleanup + verify) — final, after P3/P4/P5

**Goal:** Remove dead code, confirm the component contract for view.html is intact, and verify end-to-end.

**Do:**
1. Delete dead accordion/select/embed code and CSS no longer referenced: accordion CSS in `destination.css`, `.destinations-select` styles, `processAccordion` remnants, `MEDIA_HYPERLINKS`, media-height helpers, and any now-unused imports in `destination-entry.ts`.
2. Verify the `mountDestination(container, opts)` contract is still honored (no URL params, no `window.parent`, no `localStorage`, no page-level iframes besides My Maps) — critical because `view.html` lightbox (`trip-detail/support/embed.ts`) dynamically imports and mounts this component.
3. Confirm view.html inner-itinerary destination popups still render correctly after P4/P5 changes (they share `getDestinationsBoxHTML` / `getDestinationsAccordionBodyHTML`).
4. Run `npm run build` (and `tsc` if configured) — zero errors.
5. Update `README.md` backlog (add a `🏆`/`🎨` task + move any related older tasks) via `npm run readme`; update the i18n packs if any new keys were introduced (prefer reusing existing keys).
6. Optional browser verification (emulator) with explicit user approval per the browser-navigation skill: load `destination.html?d=…`, confirm hero/cards/lazy/search/sort/filter/edit and the view.html lightbox path.

**Acceptance:**
- Build clean; no dead references; standalone `destination.html` and the `view.html` destination lightbox both render correctly; inner-itinerary destination popups unchanged.

---

## 7. Risks & gotchas

- **Shared detail renderer (`content.ts`)** is imported by `utils/dom.ts` → used by `view.html` inner-itinerary. P4/P5 must not break it for `editBtn: false`. Verify view.html popups in P6.
- **`mountDestination` contract** must survive (view.html lightbox embeds this page). The new `#content` grid must not assume standalone-only markup.
- **Sort/filter currently mutate `CONTENT[].filtered` + full re-render** — with lazy loading this must become a list transform; otherwise filter breaks under infinite scroll.
- **`LazyGrid` is home-specific today** (`filtered()` searches `item.title`) — add a `getSearchText` accessor rather than forking the class.
- **Swiper/GLightbox are vendor globals** — do not `import` them (see `vendor.d.ts`); access as globals. Destroy Swiper instances on card close to avoid leaks/duplicate bullets.
- **Category tab set** must mirror the old `loadDestinationCustomSelect` logic (skip empty data categories; show Map when `myMaps` exists).
- **Edit page `edit-tab-bar` SVGs vs iconify** — prefer data-driven `getDestinations().icons[type]` iconify icons to avoid hardcoding SVG markup in a second place.

---

## 8. Verification checklist

- [ ] `npm run build` passes after every prompt.
- [ ] Hero background matches index (fixed attachment, frosted `.content-box`).
- [ ] Cards render with first image, or category icon + box color when no image.
- [ ] Expanded card: auto carousel on ≥2 images; GLightbox slider with view hover effect on click.
- [ ] Score badge (icon + text) replaces any badge; other fields mapped into card meta.
- [ ] No iframe embeds; website/map/instagram/video render as link buttons with provider-aware icons.
- [ ] Category tab bar switches categories; search filters; infinite scroll lazy-loads.
- [ ] Sort/filter pills + modernized drawer work.
- [ ] Owner can edit/add/delete on cards; edit button not in the link row; non-owner sees nothing.
- [ ] `view.html` destination lightbox + inner-itinerary destination popups still work.
