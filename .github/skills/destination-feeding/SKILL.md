---
name: destination-feeding
description: 'Use when you need to populate or refresh a destination document with real data — adding places from itineraries/notes, filling name/description/emoji/price/priority/map/website, and sourcing entry images. Covers production authentication (app UI, Firebase CLI token + Firestore REST), the entry schema conventions, safe merge-only writes, summary/version sync, and the tiered no-API image pipeline (Google Maps local scraper → official-site OG image → Wikipedia/Wikimedia → Places API only if approved).'
---

# Feeding Destinations (data + images)

How to take raw material (markdown itineraries, notes, itineraries from travel agencies) and turn it into a well-formed `destinations/{destId}` document in Firestore — including images — without breaking the app.

> **Scope:** this skill writes **data**, never code. It also never commits, deploys or runs migrations. See the project's operational constraints in `copilot-instructions.md`.

---

## 1. Authentication

The app uses Firebase Auth, but you rarely need a browser session for data work. Pick the cheapest path that fits the target project.

### 1.1 Where the data lives

| Target | Project | How the app reaches it |
|---|---|---|
| Local dev (default) | `trip-viewer-prd` **emulator** (Firestore `localhost:8085`, Auth `9099`) | `npm run dev` → tab shows `[LOCAL]` |
| Production | `trip-viewer-prd` (real) | `npm run dev:prd` / `https://trip-viewer-prd.firebaseapp.com` |

Project id, apiKey and hosting URLs are in `firebase-config.js`. **Never** point agent work at production unless the user explicitly asks for it.

### 1.2 Option A — App UI (simplest for small edits)

1. Sign in to the app (emulator test user or the real account).
2. Destination viewer: `destination.html?d=<destId>`
3. Destination editor: `edit/destination.html?d=<destId>`

Good for a handful of places or for eyeballing the result. Bad for bulk data (100+ entries, image backfills).

### 1.3 Option B — Firebase CLI token + Firestore REST (recommended for bulk)

No service account, no Admin SDK, no gcloud. The Firebase CLI already holds a refresh token; exchange it for an access token and call the Firestore REST API. Security rules are still enforced for the **user's** identity? No — REST calls with an OAuth access token act as the **Google user** (the CLI login), and the project's Firestore rules are **bypassed for users who are project Owners/Editors** (Owner/Editor grants full data access). Treat the token like a production credential.

```bash
firebase login:list          # confirms who is logged in
```

Token file:
- Windows: `%USERPROFILE%\.config\configstore\firebase-tools.json`
- macOS/Linux: `~/.config/configstore/firebase-tools.json`

Refresh (public firebase-tools OAuth client, no secret leaks beyond the CLI's own):

```http
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&refresh_token=<tokens.refresh_token>
&client_id=563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com
&client_secret=j9iVZfS8kkCEFUPaAeJV0sAi
```

Then:

```http
GET   https://firestore.googleapis.com/v1/projects/<project>/databases/(default)/documents/destinations?pageSize=300
GET   https://firestore.googleapis.com/v1/projects/<project>/databases/(default)/documents/destinations/<destId>
PATCH https://firestore.googleapis.com/v1/projects/<project>/databases/(default)/documents/destinations/<destId>?updateMask.fieldPaths=tourism&updateMask.fieldPaths=version
Authorization: Bearer <access_token>
Content-Type: application/json
```

**`bulk`** applies a whole plan in one process (one OAuth token, one `fieldPaths` mask per entry):

```bash
node .github/skills/destination-feeding/scripts/firestore-rest.mjs bulk tmp/feed/ops.json
# {"ops":[ {"op":"patch","path":"destinations/<id>","mask":["restaurants.abc12"],"fields":{"restaurants":{"abc12":{…}}}},
#          {"op":"create","collection":"destinations","documentId":"<id>","fields":{…}} ]}
```

A new destination is written as a root patch (`title`, `currency`, `image`, `modules`, `sharing`, `version`) plus **one patch per entry** — `PATCH` upserts, so the whole plan is re-runnable and never replaces a category map. Remember the backtick quoting for ids that start with a digit (`tourism.``2qyMo```).

A ready-made helper lives in `.github/skills/destination-feeding/scripts/firestore-rest.mjs` (see §5). It handles the typed-value JSON (`stringValue`, `mapValue`, `arrayValue`, `integerValue`…), which is the only awkward part of the REST API.

> `firebase-tools` also logs in the browser user; for the **emulator** just use `FIRESTORE_EMULATOR_HOST=localhost:8085` with `firebase-admin` (see the `query-firestore` skill) — no token needed.

### 1.4 Option C — Admin SDK

Only when you need server-side semantics (counters, transactions, bypassing rules for other users). It needs a service-account key or ADC — **avoid** unless required. The custom-credential trick (passing a bearer token to `admin.initializeApp`) does **not** work: Firestore requires a certificate or ADC.

---

## 2. Destination document model (cheat sheet)

Full reference: `docs/database/destination-document-structure.md`; types in `public/assets/ts/models/`.

```ts
destinations/{destId} = {
  title: string,                    // "Japão"
  currency: string,                 // ISO 4217: "JPY", "BRL", "EUR"
  myMaps: string,                   // My Maps URL or ""
  myMapsImported?: boolean,
  image: { background: string, active: boolean },   // destination wallpaper
  modules: { restaurants, snacks, nightlife, tourism, shopping, map: boolean },
  sharing: { owner: uid, active: true, editors?: [] },
  version: { lastUpdated: ISO8601 },
  restaurants: Record<entryId, Entry>,
  snacks:      Record<entryId, Entry>,
  nightlife:   Record<entryId, Entry>,
  tourism:     Record<entryId, Entry>,
  shopping:    Record<entryId, Entry>,
}
```

### Entry

```ts
{
  isNew: boolean,                 // "recently added" badge — false for bulk imports
  createdAt: ISO8601,
  name: string,
  emoji: string,                  // one or two emoji, required
  description: { pt: string, en: string },
  website: string,                // official site or ""
  map: string,                    // https://www.google.com/maps/search/?api=1&query=<urlencoded>
  placeAPI: PlaceAPI,             // leave the empty template (see below)
  instagram: string,              // profile URL or ""
  regions: string[],              // area/city labels used by the region filter
  media: string,                  // TikTok/YouTube embed or ""
  price: string,                  // "-" free · "$$" bucket · "~¥500" free text · "" unknown
  rating: string,                 // PRIORITY: "1".."5" or "" ("Prioridade não definida")
  images: { description: string, link: string }[],   // max 5, direct image URLs
}
```

`placeAPI` empty template (keeps Migration 17 semantics and the enrich flow happy):

```json
{"region":"","name":"","website":"","rating":"","price":"","description":{"pt":"","en":""},
 "emoji":"","map":"","updatedAt":"","instagram":"","id":""}
```

### Conventions that matter

| Field | Rule |
|---|---|
| `rating` | This is **Priority** in the UI (`1` Sem prioridade … `5` Altíssima). Leave `""` when the user says "deixe tudo pendente". |
| `price` | `"-"` renders **Gratuito**; `"$"…"$$$$"` uses the currency buckets; anything else is shown verbatim (e.g. `"~¥500"`, `"~¥8.600–10.900 (dinâmico)"`); `""` renders "Valor Desconhecido". Never invent a precise value. |
| `regions` | City/area labels (`"Kyoto"`, `"Osaka"`, `"Tokyo"`, `"Hakone"`). They populate the region filter — keep the vocabulary consistent across entries. |
| `map` | Always the `?api=1&query=` form with `encodeURIComponent` — the app opens it directly and the local scraper can resolve it. |
| `images` | **Direct** image file URLs (they must render in an `<img>`), max **5** (editor `maxSlots: 5`). Page URLs and search links are wrong. |
| Entry ids | 5-char `[A-Za-z0-9]`, unique inside the document. Deterministic generation from `category:name` is fine. |
| `createdAt` | One shared ISO timestamp for a bulk import is fine. |

### Category mapping

| Category | Goes here |
|---|---|
| `tourism` | landmarks, temples/shrines, museums, districts, parks, observatories, theme parks |
| `restaurants` | full-service dining, izakayas, ramen/sushi/okonomiyaki |
| `snacks` | cafés, bakeries, ice cream, quick bites |
| `nightlife` | bars, beer halls, craft-beer pubs, night districts/yokocho |
| `shopping` | shops, malls, **markets** (Nishiki, Tsukiji, Omicho…), shopping streets |

---

## 3. Feeding workflow (raw material → document)

1. **Collect sources.** Markdown itineraries, agency PDFs, chat notes, map links. Extract every *place* (not every sentence) and normalise the spelling.
2. **Draft entries** with: `name`, `emoji`, `description.pt` (1–2 sentences + a practical hint such as opening days/closing time), `map` query (prefer the exact address when the source has one), `website` (official only), `instagram` (only if known), `regions`, `price`, and `rating: ""`.
3. **Validate before writing:**
   - `JSON.parse` round-trip of the patch payload.
   - Every `map`/`website`/`images[].link` responds (see §4.4). Drop or replace dead links — a 404 in prod is worse than an empty field.
   - No duplicate `name` inside a category.
4. **Write merge-only, one entry at a time.** `updateMask.fieldPaths=restaurants.abc12` (an **entry**) is safe; `updateMask.fieldPaths=restaurants` (the **category map**) **replaces the whole map** and silently deletes every entry that is not in the payload. Same for `modules`/`version` (those are small and complete, so they are fine). **Never** `set()` the whole document and never patch a whole category map with a partial map.

   > ⚠️ **Incident 2026-11-22:** `resolve-images.mjs` patched full category maps containing only the resolved entries and deleted **~400 entries across 25 destinations**. Restored from Firestore stale reads (see §6). The script now emits one `updateMask.fieldPaths=<category>.<entryId>` per changed entry.
5. **Sync the summary** (the index card does not read the destination document):

   ```
   users/{ownerUid}/destinationSummaries/{destId}
   { title, currency, image, version: { lastUpdated } }
   ```
   Patch at least `version.lastUpdated` (and `title`/`image`/`currency` if they changed).

   > This applies to **any indexed document**, not just destinations: `trips/{id}` → `users/{sharing.owner}/tripSummaries/{id}` (`title`, `start`, `end`, `colors`, `image`, `modules`, `pin`, `version`) and `listings/{id}` → `users/{sharing.owner}/listingSummaries/{id}` (`title`, `subtitle`, `description`, `colors`, `image`, `version`). Direct REST writes bypass the app's automatic summary update (`public/assets/ts/utils/set.ts`), so always mirror the changed values.
6. **Verify** by re-reading the document and counting entries per category; check `modules` flags are `true` for every populated category.
7. **Notify** via the `ntfy-notifications` skill. **No backlog ticket** — feeding data is a data-only operation (see the scope gate in `backlog-management`). Create one only if the same request also changed project code, skills or docs.

### Creating a destination from scratch — mandatory checklist

A destination that is written incorrectly **silently disappears from the app**. Every new document must satisfy all of this:

| # | Requirement | Why |
|---|---|---|
| 1 | `sharing: { owner: <uid>, active: true }` with the uid copied from an **existing** destination (`list destinations` prints it) | a wrong/absent owner hides the document (`edit-destination.ts` checks `sharing.owner === uid`) |
| 2 | **all five category maps** exist — `tourism`, `restaurants`, `snacks`, `nightlife`, `shopping` — **even when empty** (write `{}` explicitly) | a PATCH only creates the maps you send, so a destination with no snacks ends up without `snacks` and the destination page breaks |
| 3 | `modules` (six booleans), `myMaps: ""`, `currency`, `image { background, active }`, `version.lastUpdated` | the card/editor read them directly |
| 4 | a **summary** at `users/<ownerUid>/destinationSummaries/<destId>` with at least `title`, `currency`, `image`, `version` | the home list reads **only** this subcollection (`getUserDestinationSummaries`); a destination without a summary never appears in the app |
| 5 | verify afterwards: owner, the five maps, the summary — then ask the user to **hard-reload** | the home page loads the summaries once, at page load; an open tab keeps the old list |

When splitting/merging destinations, remember the same rules apply to what stays behind: deleting the last entry of a category leaves the map empty (fine) but never remove the map itself, and always refresh the summary of the renamed/new documents.

### Encoding hygiene (learned the hard way)

- PATCH bodies are UTF-8 JSON; never pass the payload through PowerShell string juggling — write it to a file with Node and send the bytes.
- When chunking a JSON file for display/inspection, split **per entry line**, never by `String.Substring` on arbitrary offsets — that cuts emoji surrogate pairs in half and silently corrupts the data with `U+FFFD`.
- After a bulk write, scan the document for `U+FFFD` (`\uFFFD`) and fix any hit before declaring success.

---

## 4. Images architecture

Goal: every entry with an image, cheaply, without a paid API. The pipeline is **tiered** — stop at the first tier that yields a validated image.

```
Tier 0  already has images[]                         → keep (never overwrite silently)
Tier 1  Google Maps place photos (local scraper)     → best relevance, needs Docker
Tier 2  official website og:image / twitter:image    → great for restaurants, shops, museums
Tier 3  Wikipedia/Wikimedia (keyless REST)           → great for landmarks, temples, parks, cities
Tier 4  Google Places API photos                     → ONLY with explicit approval (key + billing)
```

### 4.1 Tier 1 — Google Maps photos via the local scraper (no API key)

The repo already ships this: `scripts/gmaps-scraper/server.mjs` runs `gosom/google-maps-scraper` in Docker (Playwright) and normalises the output.

```powershell
npm run gmaps:server          # or: node scripts/gmaps-scraper/server.mjs  → http://127.0.0.1:8788
```

```http
POST http://127.0.0.1:8788/scrape
Content-Type: application/json

{ "urls": ["https://www.google.com/maps/search/?api=1&query=Fushimi%20Inari%20Taisha%20Kyoto"], "lang": "en" }

→ { "places": [ { "id", "name", "map", "website", "rating", "price", "emoji",
                  "description", "descriptions": { "en", "pt" },
                  "sourceUrl", "imageUrls": ["https://lh3.googleusercontent.com/…"] } ] }
```

Rules that make it work:
- Start Docker Desktop first (`com.docker.service`); the image is pulled lazily on the first scrape. On Windows, a **stale WSL** breaks Docker Desktop — `wsl --update` then restart Docker (`wsl --status` should report WSL 2).
- **Input format decides success (learned the hard way).** The scraper turns *any URL input* into `…/maps/search/<urlencoded>`:
  - `https://maps.google.com/?cid=…` (Places-API/Takeout imports) → the search page renders nothing, the job dies with `playwright: TypeError: Cannot read properties of null (reading 'scrollHeight')` and **no record is produced**. This is *not* a rate limit, no matter how much you wait.
  - `https://maps.app.goo.gl/…` short links work, but often resolve to an area/list page → record with `images: []`.
  - ✅ **Always feed a city-anchored text query**: `"Place Name" City` (e.g. `"Texas Roadhouse" Youngstown OH`). Works from any exit IP and returns the full place record.
- Run **one place at a time** (`-c 1`).
- **Budget ~45–60 s per place**: the server scrapes the description twice (`en` + `pt-BR`), two Docker runs each. A 60-place backfill is ~1 h — run it **in the background** and let the resume cache (below) survive interrupts.
- `images[]` gallery is flaky (0–7 photos); `thumbnail` is always there. `imageUrls` already contains both, deduped.
- **Upscale before saving**: Google returns `…=w408-h544-k-no`. Rewriting the size segment to `=w1600-h1200` returns the same photo at card resolution (verified `200` + `image/jpeg`) — `resolve-images.mjs` does this automatically.
- Coordinate-only pins don't scrape; use `maps/search/<name>@<lat>,<lng>,15z`.
- For more than ~50 places use the unattended runner (§5) instead of the resolver.
- Returned URLs are Google-hosted (`lh3.googleusercontent.com`) and load in a browser, but they are **not guaranteed permanent** — for anything long-lived, rehost or re-resolve later.

### 4.2 Tier 2 — Official website `og:image` (no API, no Docker)

Most restaurant/shop websites expose a social card. Fetch the page with a normal desktop UA and read the first of:

```
<meta property="og:image"          content="…">
<meta property="og:image:secure_url" content="…">
<meta name="twitter:image"         content="…">
```

Works well (verified on `shibuya-scramble-square.com`, `osaka-ohsho.com`); fails on JS-only or image-less sites. Prefer the largest `og:image:*` when several sizes exist.

### 4.3 Tier 3 — Wikipedia / Wikimedia Commons (keyless)

```http
GET https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=Fushimi%20Inari&format=json
GET https://en.wikipedia.org/api/rest_v1/page/summary/<title>
→ thumbnail.source / originalimage.source
```

- Great coverage for temples, shrines, castles, parks, districts, stations.
- **User-Agent matters:** Wikimedia answers **429** to generic browser UAs. Send a descriptive one (`TripViewerDestinations/1.0 (personal trip planner; https://trip-viewer-prd.firebaseapp.com)`), serialise the calls (~3 req/s) and retry honouring `Retry-After`. Verified 2026-11-22: Chrome UA → 429 on every call, descriptive UA → 200.
- Only use this tier for `tourism`/`shopping` by default: a restaurant or bar name often matches an unrelated article (a chain, a dish, a person). `--wiki-all` opts food categories back in.
- Upgrade the thumbnail: `/330px-<file>` → `/1280px-<file>` (same filename, bigger width).
- Strip the `?utm_*` query params Wikipedia appends.
- Licences are usually CC-BY-SA — keep the file page link in `images[].description` when attribution matters.

### 4.4 Validation before writing (all tiers)

An image is accepted only if:

1. `https:` and a **direct file** (not an HTML page),
2. `GET` returns `2xx` **and** `content-type: image/*`,
3. body size ≥ ~10 KB (filters tracking pixels and 1×1 placeholders),
4. not already used by another entry in the same destination (dedupe by URL),
5. width ≥ ~800 px when the URL exposes the size (Google `=s1600`, Wikimedia `/1280px-`),
6. avoids logos/watermarks when a real photo exists.

Keep at most **5** per entry; one good photo beats three mediocre ones.

### 4.5 Tier 4 — Places API (only if explicitly approved)

Existing pieces: `workers/places-api` (Cloudflare Worker with quota guard) and `scripts/export-maps-data/export-maps-data.py` (batches Places details into the destination JSON). Both need an API key and billing — ask the user first; prefer re-resolving Tiers 1–3 first.

### 4.6 Legal

Google Maps content is subject to Google's Terms — scraping photos is acceptable for **private planning** in this project (see the repo analysis doc), not for redistribution. Wikimedia/OG images keep their own licences. Never publish a dataset of Google photos.

---

## 5. Ready-made scripts

| Script | What it does |
|---|---|
| `.github/skills/destination-feeding/scripts/firestore-rest.mjs` | Token exchange + `list` / `dump` / `apply` (PATCH with updateMask) / `patch-summary` |
| `.github/skills/destination-feeding/scripts/resolve-images.mjs` | Finds entries without images, resolves them through Tiers 1→2→3, validates, and (with `--apply`) patches only the affected entries + version + summary |
| `scripts/images-backfill.mjs` | **Unattended long run**: Docker Maps only, one place at a time, resume state, retries/cooldown, per-entry patch, backup + integrity check |

```bash
# read
node .github/skills/destination-feeding/scripts/firestore-rest.mjs list destinations
node .github/skills/destination-feeding/scripts/firestore-rest.mjs dump destinations/<id> out.json

# write (patch = JSON file with only the fields you touched)
node .github/skills/destination-feeding/scripts/firestore-rest.mjs apply destinations/<id> patch.json

# images (Tier 1 needs the scraper server running)
node .github/skills/destination-feeding/scripts/resolve-images.mjs --dest <id> --maps --dry-run
node .github/skills/destination-feeding/scripts/resolve-images.mjs --dest <id> --maps --apply
node .github/skills/destination-feeding/scripts/resolve-images.mjs --dest <id> --maps --only tourism --apply
```

**Resume cache:** every resolved entry is written to `%TMP%\resolve-images-<destId>.cache.json` (`os.tmpdir()` on other platforms, path printed at start). Re-running the script skips what is already cached and still patches everything at the end — so a crash, a rate limit or a closed terminal never loses paid work. Delete the file to force a fresh pass.

### Unattended Maps backfill (`scripts/images-backfill.mjs`)

For hundreds of places (hours of runtime) use the standalone runner instead of an agent:

```bash
node scripts/images-backfill.mjs                        # every destination, writes to Firestore
node scripts/images-backfill.mjs --dest <id>            # one destination
node scripts/images-backfill.mjs --to-file patch.json    # no writes: dump a patch for review
node scripts/images-backfill.mjs --limit 3 --dry-run     # sample
node scripts/images-backfill.mjs --delay 30              # gentle mode (± 25% jitter between places)
```

What it does differently from the resolver:
- talks to **Docker directly** (one container per place, `-lang en`, ~15–25 s) — no scraper server needed;
- builds a **city-anchored text query** `"<entry name>" <destination title>` for every place (never the raw `?cid=` map link — see §4.1) and only falls back to the entry's short link when the text query yields nothing;
- **resume state** in `tmp/image-backfill/state.json` (never re-scrapes a resolved place; `--skip-failed` ignores known failures);
- **retries** with a short backoff; a place that yields no record is marked `deferred` and the run **moves on** — only a **streak of 2 misses** triggers a single `--cooldown` (default 10 min). Never let one place eat 3 × 30 min;
- **`--timeout <s>`** (default 150): a scrape that takes longer is throttled. The container is **named and removed with `docker rm -f`** on timeout, and every run **sweeps orphan containers first** — unanswered `docker run` processes are what turn a mild throttle into a hard block;
- **`--delay <s>`** adds ±25% jitter between places — use it after an IP block or when running through a VPN;
- **title guard**: a record whose title does not share the entry's meaningful words is **rejected** (`rejected "Belo Horizonte" — does not look like "Koctus Pizza"`). Without it, a city page or a neighbouring business becomes the entry's photo;
- **`--queries <file>` + `--only-overrides`** re-resolve specific entries without touching the rest:

  ```json
  { "<destId>/<category>/<entryId>": { "url": "…", "query": "…", "geo": "lat,lng", "og": true, "image": "…" } }
  ```

  `url` = short link, `query` = hand-written search, `geo` = search anchor (needs the place's coordinates), `og` = social card of `entry.website`, `image` = a curated URL (Wikimedia, press kit). Inputs are tried in that order. **The key uses slashes**: `<destId>/<category>/<entryId>`;
- **`--no-guard`** turns the title check off — needed when the curated names are in Portuguese/Spanish and Google answers in English/Japanese (`Retiro e Estanque Grande` → “El Retiro's Great Pond”). Use it only for hand-written, city-anchored queries;
- **last resort for a stubborn place**: search Wikimedia Commons and pass the file URL as `image`:

  ```text
  https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search
    &gsrsearch=<place>&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url|size|mime&iiurlwidth=1280
  ```

  prefer the landmark itself over look-alikes (the Kuromon results are full of the LaLaport Kadoma replica), and normalise the URL to `upload.wikimedia.org/.../1280px-...`;
- **refreshes the OAuth token** every 45 min *and* on any `401` (a long run outlives the 1 h access token);
- writes **one `updateMask.fieldPaths=<category>.<entryId>` per entry** (ids starting with a digit must be backtick-quoted!);
- copies the document to `tmp/image-backfill/backups/` before writing and **re-counts afterwards** — any lost entry triggers an automatic restore and aborts that destination;
- one destination at a time, and each destination is patched **only when all of its places were processed**;
- SIGINT-safe (finishes the current place, saves state, exits) and logs to `tmp/image-backfill/run-<ts>.log`.

⚠️ **Orphan containers:** a `docker run` keeps running when its Node client is killed (closed terminal, timed-out request). Those orphans keep browsing Google in parallel — that is what triggers the rate-limit. Before/while a long run check `docker ps` and clean up with:

```bash
docker ps -q --filter ancestor=gosom/google-maps-scraper | xargs -r docker rm -f
```

⚠️ **Throttle vs. bad query** (they both log "no record"):
- *bad query* → **fast** empty (10–40 s) and only for that place;
- *throttled* → **slow** (150–240 s), misses pile up across different places.
  Stop, sweep the orphans, change the IP (a different VPN exit helps) and resume — the state file skips what is already done.

Real run (2026-11-22): 1.575 entries across 25 destinations filled to 100% — ~485 images in one pass, then the last 46 after the throttle was cleared.

Estimated throughput ~18 s/place with a warm image → ~4 h for 750 places.

Scripts read the project from `--project` (default `trip-viewer-prd`) and honour `FIRESTORE_EMULATOR_HOST` when set.

---

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `HTTP 403` on `oauth2.googleapis.com/token` | CLI logged out → `firebase login` |
| `HTTP 403` on Firestore REST | Token expired (1 h) → re-run the script; wrong project id |
| `PATCH` succeeded but the app shows old data | The viewer caches per `version.lastUpdated` — update it in the destination **and** in the summary |
| Entries disappeared after a bulk write | A category **map** was patched with a partial payload → restore immediately (row below) |
| Data loss (entries deleted) | Firestore keeps **1 h of versions** (`versionRetentionPeriod: 3600s`) even with PITR disabled: `GET …/destinations/<id>?readTime=<ISO>` returns the pre-write snapshot. Read the oldest readable version, merge it with the current doc (keep newer images), and PATCH each entry back. `earliestVersionTime` in the database metadata tells how far back you can go. |
| Images don't render in the app | URL is a page, requires cookies/hotlinking, or is `http:` → re-resolve or route through `workers/image-proxy` (static export only) |
| Maps scraper returns empty places | Check the **input**, not the weather: a `?cid=…` link always fails (see §4.1) — use `"Name" City`. Genuine throttling shows the same symptom, so wait a few minutes and keep `-c 1` |
| `playwright: … (reading 'scrollHeight')` | The input was a plain URL (usually `?cid=…`) that the scraper rewrote into a search page → send a text query instead |
| Scraper returns a **different business / the city name** | The place is probably closed or renamed. Resolve its short link to coordinates with `fetch(link)` and read `@lat,lng` from the final URL, then search the name alone with `-geo lat,lng`; if Google still answers with neighbours, take the photo from the site's `og:image` or from Wikimedia (`…wiki/…/page/summary` → `originalimage.source`) and pass it as `"image"` in `--queries` |
| Wikimedia photo rejected (`not usable`) | Wikimedia 4xx/403 for generic browser UAs → send a descriptive one (`TripViewerDestinations/1.0 (…; https://trip-viewer-prd.firebaseapp.com)`) when validating that URL |
| Docker Desktop won't start / `docker version` fails | Stale WSL → `wsl --update`, reboot, restart Docker Desktop; `wsl --status` must show WSL 2 |
| Scrape is very slow (~1 min/place) | Expected: the server runs `en` + `pt-BR` per place. Run it in the background and rely on the resume cache |
| Maps scraper: `no place data` | Coordinate-only pin → use `search/<name>@lat,lng,15z` |
| Text with `�` | Payload was corrupted by a lossy encoding step → re-write from a UTF-8 file and re-check |
| Wikipedia returns `429` on every call | Generic browser UA → send the descriptive `TripViewerDestinations/1.0 (…)` UA, throttle to ~3 req/s and retry |

---

## 7. Checklist

- [ ] Target project confirmed (emulator vs prod) and the user authorised prod writes
- [ ] Document exists; `sharing.owner` captured (needed for the summary path)
- [ ] Entries drafted with map + website + description + regions + emoji
- [ ] `rating` left `""` unless the user asked for priorities
- [ ] Prices are `-`/`$$`/free text or `""` — never invented
- [ ] Links validated (HTTP) before writing
- [ ] Merge-only PATCH **per entry** (`<category>.<entryId>`), never a partial category map
- [ ] Summary mirror synced (`destinationSummaries`, or `tripSummaries`/`listingSummaries` for other document types)
- [ ] Re-read and counted (entry count must not drop); `U+FFFD` scan clean
- [ ] Images resolved per tier, validated, ≤ 5 per entry
- [ ] Bulk runs use `scripts/images-backfill.mjs` (resume + backup + integrity check) and leave **no orphan Docker containers**
- [ ] Backlog ticket **only if** project files changed (data-only feeding needs none) + ntfy sent
