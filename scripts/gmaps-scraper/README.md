# gmaps-scraper

Local scraping of Google Maps place data using [`gosom/google-maps-scraper`](https://github.com/gosom/google-maps-scraper).

This is a **work in progress** — a minimal local setup to evaluate the scraper
before wiring it into the export pipeline. See
`docs/ai-analysis/9-google-maps-local-scraping-research.md` for the research and
decision behind this choice.

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running
  (the `com.docker.service` + engine must be up).

## Usage

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

## Language (forcing English, pt-BR, etc.)

The scraper passes `hl=<lang>` (from `-lang`, default `en`) on every request, but
the input URL decides whether that parameter sticks:

- ✅ **Full `google.com/maps/place/...?hl=en` URLs** — `hl=en` is applied and data
  comes back in English (categories, address, day names). Verified 2026-08-10:
  Mr. Beef returned "Sandwich shop / Fast food restaurant / Restaurant".
- ❌ **`maps.app.goo.gl` short URLs** — Google 302-redirects and **drops the `hl`
  param**, so data renders in your IP's geo-language (Portuguese for a Brazilian
  IP). Localized labels then come back in that language.
- ❌ **`google.com.br` (any non-`.com`) Maps URLs** — the scraper does **not**
  recognize them as direct place URLs and treats the line as a search query,
  which fails. Convert `google.com.br` → `google.com` (the `data=` param is
  domain-independent).

Rule of thumb: **use full `google.com/maps/place/...` URLs with `?hl=<lang>`.**
If you only have a short `maps.app.goo.gl` URL, resolve it first (follow the
redirect) or accept geo-localized output.

## Notes

- The Docker image runs Playwright; browsers are cached in the named volume
  `gmaps-playwright-cache` so the first run may take longer than later ones.
- Keep `-c` low (default 2) to avoid memory pressure.
- **Rate limiting / flakiness.** Google blocks or challenges scraping,
  especially when runs are back-to-back. A common symptom is
  `TypeError: Cannot read properties of null (reading 'scrollHeight')` on
  every place. If that happens, wait a few minutes before retrying, use
  `-Concurrency 1`, and avoid hammering the same places repeatedly.
- **Inactivity timeout.** The `-Inactivity` value must be long enough for the
  first result to arrive (each place can take ~15–30 s). The wrapper default is
  `3m`; only lower it (e.g. `30s`) for short, already-warm runs.
- Google may rate-limit or block scrapes; this tool is for low-volume use only.
