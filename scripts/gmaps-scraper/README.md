# gmaps-scraper

Local scraping of Google Maps place data using [`gosom/google-maps-scraper`](https://github.com/gosom/google-maps-scraper).

This is a **work in progress** — a minimal local setup to evaluate the scraper
before wiring it into the export pipeline. See
`docs/analysis/20260810-google-maps-local-scraping-research.md` for the research and
decision behind this choice.

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
  (the `com.docker.service` + engine must be up).
- The `gosom/google-maps-scraper` Docker image. The HTTP server (section 1
  below) pulls it automatically on the first scrape, but you can also pre-pull
  it yourself:

  ```powershell
  # check whether it's already present
  docker image inspect gosom/google-maps-scraper

  # if not, pull it
  docker pull gosom/google-maps-scraper
  ```

  > ⚠️ On first use the image downloads Playwright browsers into the named
  > volume `gmaps-playwright-cache`, so the very first scrape is slower than
  > later ones.

## Two ways to run

### 1. HTTP server (`npm run dev` — what the edit page uses)

`npm run dev` starts `server.mjs` (the "route we can always point to") on
`http://127.0.0.1:8788` — the edit-destination **"Import with maps → Local
(gmaps scraper)"** flow and the bulk **"Update all → Local"** flow talk to it.
The image is pulled lazily on first scrape if missing.

```http
POST /scrape
Content-Type: application/json

{ "urls": ["https://www.google.com/maps/place/..."], "lang": "en" }
→ { "places": [ { id, name, description, descriptions: { en, pt }, region,
                  website, instagram, rating, price, emoji, map,
                  businessStatus, sourceUrl, imageUrls } ] }
GET /health → { ok: true }
```

The server validates each URL, runs the scraper **once per language** (en + pt-BR,
single request) and normalizes the scraper's JSONL into the app's `PlaceDetails`
shape:
- `description` = the **requested** language's text (what the dialog previews).
- `descriptions = { en, pt }` = **both** languages' raw texts (the apply step
  writes both into the entry's multi-language `description` object).
- `sourceUrl` = canonical Maps link for later refresh; `imageUrls` = direct
  photo URLs (thumbnail + gallery images when Google serves them).

Manual start: `npm run gmaps:server` (or `node scripts/gmaps-scraper/server.mjs`).

### 2. One-shot CLI (for manual runs / debugging)

```powershell
# 1. (first time only) pull the image
docker pull gosom/google-maps-scraper

# 2. run the scraper
.\run.ps1
```

Output is written to `output/results.json` (the `output/` folder is gitignored).

## Input format

Edit `queries.txt` — one Google Maps URL **or** search query per line:

```text
https://maps.app.goo.gl/J4vLoJiyU7j6bkrs7
https://www.google.com/maps/place/Empire+State+Building/@40.7484405,-73.9856632
pizza in Brooklyn, NY
```

> ⚠️ **No comments allowed.** The scraper treats every line as a real query
> (lines starting with `#` fail as searches). Keep the file to URLs/queries only.

Supported URL formats (from the upstream README):

```text
https://www.google.com/maps/search/pizza
https://www.google.com/maps/place/Empire+State+Building/@40.7484405,-73.9856632
https://maps.google.com/maps?z=16&q=Empire+State+Building
maps.app.goo.gl/abc123
```

## Useful flags (pass via `-ExtraArgs`)

```powershell
# write CSV instead of JSON
.\run.ps1 -Results results.csv -ExtraArgs "-csv"

# collect extended reviews
.\run.ps1 -ExtraArgs "-extra-reviews"

# raise concurrency on a capable machine
.\run.ps1 -Concurrency 4

# extract emails from business websites (slower)
.\run.ps1 -ExtraArgs "-email"
```

## Language (always both English + Portuguese via the server)

The **HTTP server** (`/scrape`) strips tracking/UI query params (`entry`, `g_ep`,
`hl`, `utm_*`, …) from the input URL and scrapes the description in **both**
languages — one docker run with `-lang en`, one with `-lang pt-BR` — merged
into `descriptions: { en, pt }`. The `-lang pt-BR` run is skipped when no place
returned a description (most restaurants/bars have none — no point scraping
again). Set `GMAPS_SCRAPER_LANG_DELAY_MS` to insert a pause between the two runs
if Google starts blocking the second (best-effort) one.

Why the URL cleaning? VERIFIED 2026-08-12: Google's Share button appends
`?entry=ttu&g_ep=...` to place URLs, and the scraper rewrites such URLs as
`...?hl=en?entry=ttu&...` (a second `?`), so `hl` never sticks and Google falls
back to the geo-IP language (pt-BR for a Brazilian IP) — even with `-lang en`.
Stripping those params lets `-lang` produce a clean `?hl=en`/`?hl=pt-BR` and the
requested language actually applies.

### One-shot CLI (run.ps1)

The CLI still takes a single `-lang` (default `en`), so it returns one language
per run — useful for debugging. The same URL-cleaning rule applies: strip
`entry`/`g_ep` (or use `-ExtraArgs`), or you'll get geo-localized output:

- ✅ **Clean `google.com/maps/place/...` URLs (no `entry`/`g_ep`/`hl` params)** —
  `-lang` applies: `-lang en` → English, `-lang pt-BR` → Portuguese. Verified
  2026-08-12 on Chelsea Market (en: *"Indoor marketplace renowned for its wide
  range of grocers…"*, pt: *"Mercado famoso pela ampla variedade de mercearias…"*).
- ❌ **URLs with `?entry=ttu&g_ep=...`** — mangled by the scraper (`?hl=en?hl=en`),
  everything falls back to the geo-IP language regardless of `-lang`.
- ❌ **`maps.app.goo.gl` short URLs** — Google 302-redirects and drops `hl`, so
  data renders in the IP's geo-language; the server can't force it either
  (both runs return the same localized text — the server keeps only the
  requested language in that case).
- ❌ **`google.com.br` (any non-`.com`) Maps URLs** — not recognized as direct
  place URLs; the server converts `.br` → `.com` automatically.

## Notes

- The Docker image runs Playwright; browsers are cached in the named volume
  `gmaps-playwright-cache` so the first run may take longer than later ones.
- Keep `-c` low (default 2) to avoid memory pressure.
- **Images are flaky.** Raw `images[]` items are `{ Title, Image }` objects
  (photo-filter thumbnails like "All"/"Latest"/"Food"); the server reads both
  `Image` and `url`. Google only serves them when its page state includes the
  photo section, so a scrape may return 0–7 gallery images (the thumbnail
  always comes through). All returned URLs are Google-hosted
  (`lh3.googleusercontent.com`) and load directly in a browser.
- **Dual-language = 2 docker runs per request.** Each `/scrape` runs the scraper
  twice (en + pt-BR). The second run is best-effort and skipped when no
  description exists; set `GMAPS_SCRAPER_LANG_DELAY_MS` if you hit rate limiting
  on it.
- **Rate limiting / flakiness.** Google blocks or challenges scraping,
  especially when runs are back-to-back. A common symptom is
  `TypeError: Cannot read properties of null (reading 'scrollHeight')` on
  every place. If that happens, wait a few minutes before retrying, use
  `-Concurrency 1`, and avoid hammering the same places repeatedly.
- **Inactivity timeout.** The `-Inactivity` value must be long enough for the
  first result to arrive (each place can take ~15–30 s). The wrapper default is
  `3m`; only lower it (e.g. `30s`) for short, already-warm runs.
- Google may rate-limit or block scrapes; this tool is for low-volume use only.
