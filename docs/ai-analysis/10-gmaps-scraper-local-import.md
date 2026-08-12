# gmaps-scraper — Local "Import with maps" option (E045)

Date: 2026-08-10
Status: implemented (local-only). Companion to `9-google-maps-local-scraping-research.md`
(research behind the scraper choice).

## What this feature is

Adds a **"Local (gmaps scraper)"** import source alongside the existing **"Via Places
API"** flow on the edit-destination page. Both the per-item **"Fetch Info With Maps"**
button and the bulk **"Update with Maps"** button now open a **source-selection prompt
first** (Local vs Places API — same styling as the linked-step option cards), then
continue to the matching flow.

The Local path lets the user **paste a Google Maps link** (no search bar), which is
scraped on the dev machine via `gosom/google-maps-scraper` (Docker), normalized into
the app's `PlaceDetails` shape, and fed through the **existing** details/apply steps.

## How it works (flow)

```
Button (per-item or bulk)
  └─ source prompt: "Local (gmaps scraper)" vs "Via Places API"
       ├─ Places API → existing flow (per-item: linked/search; bulk: confirm → runBulkUpdate)
       └─ Local → paste Maps link → POST http://127.0.0.1:8788/scrape
            → server runs ONE docker run for the URL(s), parses JSONL
            → normalizes to PlaceDetails (+ sourceUrl, imageUrls)
            → per-item: reuses 'details' step → apply (no photos route; scraper imageUrls applied directly)
            → bulk: runBulkLocalUpdate() → reuses the bulk report + apply options
```

The fixed route `http://127.0.0.1:8788` is started by `npm run dev` (`gmaps:server`).

## Refresh strategy (blank Google id)

The scraper returns a real Google `place_id` (e.g. `ChIJ…`), so it is stored in
`placeAPI.id` when present (Places API refresh keeps working). When absent, the id stays
blank but the canonical Maps link is persisted as **`placeAPI.sourceUrl`**, keeping the
entry refreshable:
- per-item re-scrape pre-fills the link input;
- bulk Local path re-scrapes by link;
- button labels + bulk-button visibility treat `sourceUrl` as "linked".

## Files

### New (delete these to remove the feature)

| File | Purpose |
|---|---|
| `scripts/gmaps-scraper/server.mjs` | Node HTTP server on `:8788` — `POST /scrape`, `GET /health`; runs docker, normalizes JSONL |
| `public/assets/ts/data/services/gmaps-scraper.service.ts` | Frontend client: `scrapePlaces(urls, {lang, signal})`, `GMAPS_SCRAPER_ENABLED` (local-only gate) |
| `public/assets/ts/places/places-source-step.ts` | `source` step renderer + per-item actions; exports `getSourceOptionsHTML()`, `SOURCE_LOCAL_ACTION/API_ACTION` + bulk variants |
| `public/assets/ts/places/places-local-step.ts` | `local` step renderer (Maps-link input) + `places-local-run` action; exports `LOCAL_SOURCE_URL_KEY` |

### Modified (revert the specific edits below)

| File | What to undo |
|---|---|
| `package.json` | Remove `gmaps:server` script; drop the `gmaps` process from `dev` / `dev:livereload`; remove `8788` from `kill-ports` |
| `scripts/gmaps-scraper/README.md` | (docs only) remove the "Two ways to run / HTTP server" section — optional |
| `public/assets/ts/ui/fields.ts` | Remove pure `isValidMapLink()`; restore `validateMapLink` to its inline check (keep behavior) |
| `public/assets/ts/models/schema.ts` | Remove `sourceUrl?: string` from `PlaceAPI` |
| `public/assets/ts/models/places-api.model.ts` | Remove `sourceUrl?: string` from `PlaceSearchResult` |
| `public/assets/ts/places/places-dialog.ts` | Remove `'source' | 'local'` from `PlacesDialogStep`; drop `local` from `STEP_LOADING_KEYS`; `openPlacesDialog` starts at `placeAPI?.id ? 'linked' : 'search'` again |
| `public/assets/ts/places/places-details-step.ts` | Make `CANDIDATE_KEY` private again (drop `export`) |
| `public/assets/ts/places/places-apply.ts` | Drop the `sourceUrl` line in `mergePlaceAPI` |
| `public/assets/ts/places/places-apply-flow.ts` | Remove `LOCAL_SOURCE_URL_KEY` import + the `entry.placeAPI.sourceUrl` block in `applyAndClose` |
| `public/assets/ts/places/places-bulk.ts` | Remove `GMAPS_SCRAPER_ENABLED`/`scrapePlaces` import, `scrapeUrl` on `BulkLinkedEntry`, `collectLocalScrapeEntries`/`countLocalScrapeEntries`/`countBulkEligibleEntries`, `runBulkLocalUpdate`, the `concurrency` param on `runBulkFetch`/`fetchPlaces` (and its use), `dev.page.runBulkLocal` |
| `public/assets/ts/pages/edit-destination/edit-destination.ts` | Remove `countBulkEligibleEntries`/`runBulkLocalUpdate` import, `getSourceOptionsHTML`/bulk-action constants import, the `places-local-step` side-effect import, the `registerActions` import + bulk-source action block; restore `openPlacesBulkDialog` to the old confirm dialog (delete `openPlacesBulkConfirm`); `refreshPlacesBulkButton` back to `countLinkedItems() > 0` |
| `public/assets/ts/pages/edit-destination/new-destination.ts` | `hasLinkedPlace` back to `Boolean(entry?.placeAPI?.id)` |
| `public/assets/json/languages/en.json` + `pt.json` | Remove keys: `placesApi.source.*`, `placesApi.local.*`, `placesApi.loading.scraping`, `placesApi.bulk.local.none`, `placesApi.errors.invalidMapLink`, `.scraperUnavailable`, `.scraperFailed`, `.rateLimited` |
| `public/assets/css/edit/edit.css` | Remove the trailing `.places-source`, `.places-local*` block |

## ⚠️ Critical: `edit.css` had a pre-existing accidental deletion

Before this feature, the working tree had the whole Places API CSS block
(`.places-fetch-wrapper`, `.places-dialog*`, `.places-search*`, `.places-linked*`,
`.places-bulk*`, etc.) **staged as a 904-line deletion**. That deletion was undone
with `git checkout HEAD -- public/assets/css/edit/edit.css` (restored from the last
commit) so the dialog renders, then the new source/local styles were appended.

**Do NOT revert `edit.css` to HEAD to undo this feature** — that would restore the
deleted CSS (fine) but the new styles live in the working tree, not HEAD. To fully
undo the feature's CSS, only delete the appended `.places-source`/`.places-local`
block. If the goal is to reproduce the *pre-session* working state (including the
accidental CSS deletion), that deletion must be re-applied manually — it was never a
deliberate part of the feature.

## Gotchas (verified 2026-08-10)

- **Rate limiting:** Google blocks back-to-back scrapes. Symptom = "success" records
  with ALL fields empty (`name: ''`), not an error. Server throws a clear 500
  ("wait a few minutes") when every place is empty; frontend shows `rateLimited`.
  Bulk Local runs **sequentially** (concurrency 1) on purpose.
- **Field names:** scraper JSONL uses `web_site` (not `website`) and `complete_address`
  is an object (`{borough, street, city, ...}`) — `normalizeRecord` handles both.
- **Don't append `hl=`** to input URLs — the scraper's `-lang en` already adds it;
  manual append creates a doubled `?hl=en?hl=en` redirect. Only `.br → .com` rewrite.
- **Local-only:** the route only exists on the dev machine (`GMAPS_SCRAPER_ENABLED`),
  matching the Places API's `PLACES_API_ENABLED` hard gate. No token/auth on the route.
- **Browser testing** requires explicit approval (see `browser-navigation` skill).

## Quick smoke test

```powershell
node scripts/gmaps-scraper/server.mjs          # or: npm run gmaps:server
curl -X POST http://127.0.0.1:8788/scrape -H "Content-Type: application/json" `
  -d '{"urls":["https://www.google.com/maps/place/..."],"lang":"en"}'
```

Expect `{ "places": [ { id, name, ..., sourceUrl, imageUrls } ] }`. Empty `name` ⇒
rate-limited (cooldown a few minutes, `-Concurrency 1` in the docker args).
