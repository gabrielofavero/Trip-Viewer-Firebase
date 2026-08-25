# Scrapling evaluation (2026-08-23)

Evaluated [`D4Vinci/Scrapling`](https://github.com/d4vinci/Scrapling) (BSD-3-Clause, Python 3.10+, v0.4.14, 76k stars) as a potential replacement/alternative for the app's Google Maps data pipeline — either the official Places API worker (`worker/`) or the local gmaps-scraper (`scripts/gmaps-scraper/`).

## Verdict

- **Q1 (can it scrape places info + photos?):** Technically yes, but only as a **framework you build the Maps extractor on top of** — there is no out-of-the-box Google Maps scraper/template in the repo. It would be a reimplementation of what `gosom/google-maps-scraper` already gives the app for free.
- **Q2 (Cloudflare free tier?):** **No.** Scrapling is local/self-hosted Python + Playwright browsers. It cannot run on Cloudflare Workers at any tier (free or paid). Same local-only category as the existing gmaps-scraper.

---

## Q1 — Capability to extract places info + photos

Scrapling is a general-purpose adaptive scraping framework. A repo search for `google maps` / `google.com/maps` / `maps.google` returns **only sponsor ads** (CoreClaw), no Maps-specific code, templates, or spiders. There is no `MapsSpider`.

What it *does* give you (browser-backed):

- `DynamicFetcher`/`StealthyFetcher` launch real Playwright Chromium/Chrome — so it **can load** `https://www.google.com/maps/place/...`, run JS, and read the live DOM.
- `capture_xhr` can capture Google's internal `pb=` XHR responses the page makes.
- CSS/XPath/BeautifulSoup-style selection + the app's existing pattern of parsing embedded JSON (like `window.APP_INITIALIZATION_STATE`) to get `place_id`.

Field-by-field feasibility vs what the Places API worker returns:

| Field | Feasible? | Notes |
| --- | --- | --- |
| id (place_id) | ⚠️ | Not in DOM; must parse embedded JSON blob or URL |
| name | ✅ | Easy DOM text |
| rating (string) | ✅ | Visible text |
| price ($..$$$$) | ✅ | Visible `$` indicator |
| website | ✅ | `www.google.com/url?q=` link or direct |
| instagram | ⚠️ | Not on page; derived from website URL (same as current `splitWebsiteInstagram`) |
| region/municipality | ⚠️ | Present in page, needs structured parse |
| description | ⚠️ | Only a short "About" blurb when Google shows one; thinner than Places API `editorialSummary` |
| emoji | ⚠️ | Derived from categories (same as current python `export-maps-data.py`) |
| map | ✅ | The Maps URL itself |
| businessStatus | ✅ | "Temporarily/Permanently closed" badge in DOM |
| **photos[]** | ⚠️ | **Hardest part.** Lazy-loaded gallery; must click through the photo viewer or parse the embedded JSON photo blob for `lh3.googleusercontent.com` URLs — you write this yourself |

**Bottom line:** Scrapling can reach everything, but you'd hand-build ~200–400 lines of Python for extraction + photo gallery + Google bot/consent handling, then maintain it against Maps DOM churn. `gosom/google-maps-scraper` (the current local scraper) already returns `thumbnail` + `images[]` + all business fields out of the box. Scrapling is not a capability step up for this app — it's a reimplementation.

---

## Q2 — Cloudflare compatibility

**Not compatible. Not on the free tier, not on any Workers tier.**

Evidence:

1. **Runtime model mismatch.** Workers is a V8-isolate serverless runtime (JS/WASM; Python Workers are a beta Pyodide/WASM flavor). It cannot spawn OS processes or launch browsers. Scrapling's main fetchers (`StealthyFetcher`, `DynamicFetcher`) require full Playwright Chromium/Chrome binaries downloaded via `scrapling install`.
2. **Free-tier limits make it impossible regardless.** Workers Free = **10 ms CPU/request**, **128 MB memory**, 1 s startup, 3 MB compressed bundle. Chromium alone needs hundreds of MB and far more than 10 ms of CPU to boot + render a Maps page.
3. **Python package support is too narrow.** Cloudflare Python Workers only support pure-Python / PyEmscripten (WASM) / Pyodide packages (FastAPI, httpx, aiohttp, Pydantic…). Native packages like `lxml`/TLS-impersonation deps and Playwright are not supported.
4. **The only official deploy story is Docker** (`ghcr.io/d4vinci/scrapling`) — self-hosted, same category as the current gmaps-scraper. There is no serverless story.
5. **Even a paid container path is blocked by Google.** The geoleadscraper evaluation already concluded scrapers hitting Google Maps from Cloudflare **datacenter egress IPs are almost certainly blocked**. A Maps scraper on Cloudflare infrastructure is doubly infeasible regardless of runtime.

So: **local-only, exactly like the current `scripts/gmaps-scraper/`.** (In fact slightly more constrained: gosom is Go — a single static binary that would at least fit a paid Cloudflare Containers image easily — whereas Scrapling bundles Python + browsers, heavier to containerize.)

---

## Recommendation

Do **not** pursue Scrapling for this app.

- The official Places API worker (`worker/`) is the legitimate, quota-capped, ToS-compliant path that already returns every field including keyless `photoUri`s.
- The local `gosom` gmaps-scraper already covers the unlimited free path with photos out of the box.
- Scrapling would add nothing either path lacks, cannot deploy to Cloudflare, and would be a significant custom-extraction maintenance burden on top.

Keep for reference only.
