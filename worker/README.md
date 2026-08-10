# TripViewer Places API — Cloudflare Worker

A Cloudflare Worker that proxies the **Google Places API (New)** for TripViewer.
One deployed route serves **local / dev / prd** from a single codebase.

Source of truth: `docs/ai-analysis/7-places-api-backend-contract.md` (contract)
and `docs/ai-analysis/8-places-api-worker-build-prompts.md` (build plan).

---

## Start here — beginner-friendly guide

New to this repo, Cloudflare, or how the Places API fits together? Read this
section first. Everything after it is the detailed reference for people who
already know the setup.

### What this is, in plain English

Your TripViewer website needs place info from the **Google Places API** (search
for a restaurant, get its rating/photos, etc.). Instead of the website talking
to Google directly, it talks to **this small program** ("a Worker") that runs
on Cloudflare's free tier. The Worker does the boring, risky, and secret stuff:

- 🔒 **Keeps your Google API keys secret.** The keys live only on Cloudflare —
  they are never sent to browsers, so nobody can steal them and run up your bill.
- 🪪 **Checks who is asking.** Every request must carry the user's **Firebase
  login token**; the Worker verifies it and checks the user is allowed to use
  the feature.
- 🔎 **Calls Google for you**, then cleans the result into the simple shape
  your app already understands (rating, price, emoji, description, photos…).
- 🧮 **Stops you from getting a bill.** It counts its own calls per key per
  month and refuses to go past the budget you set (see *Billing* below).

You don't rent a server or run a database — Cloudflare runs the Worker for you.

```
Browser (TripViewer)
    │  HTTPS + Firebase login token
    ▼
Cloudflare Worker ──►  Google Places API    (keys stay here, secret)
    │  checks: logged in? allowed? budget left?
    ▼
Your app (JSON data, already cleaned up)
```

### What you need before you start

- **Node.js** installed (used to install and run the tooling).
- A **Cloudflare account** (the free plan is enough).
- Your two **Google Maps API keys** (see `PLACES_API_KEY` and
  `PLACES_PHOTOS_API_KEY` further down).

### Step-by-step: put it on Cloudflare

1. **Install the tools.**

   ```bash
   cd worker
   npm install
   ```

2. **Set up a local test config** (optional but recommended).
   Copy `.dev.vars.example` to `.dev.vars` and fill in your keys. This file is
   **only for testing on your computer** — it is gitignored and never deployed.

   ```bash
   cp .dev.vars.example .dev.vars   # then edit with your keys
   ```

3. **Log in to Cloudflare** (opens your browser once).

   ```bash
   npx wrangler login
   ```

4. **Create a place to store the monthly budget counter** (recommended).
   Cloudflare runs your Worker on many servers at once. To share the "how many
   calls have we used this month" counter between all of them, it needs a small
   storage area called a **KV namespace**:

   ```bash
   npx wrangler kv namespace create PLACES_QUOTA
   ```

   It prints two long IDs. Paste them into `wrangler.toml`:

   ```toml
   [[kv_namespaces]]
   binding = "PLACES_QUOTA"
   id = "<production_namespace_id>"
   preview_id = "<preview_namespace_id>"
   ```

   > Skipping this step is fine — the counter then just lives in memory, which
   > is perfectly good while only you are editing. Do it for a real guarantee.

5. **Deploy the Worker.**

   ```bash
   npm run deploy
   ```

6. **Tell Cloudflare your secrets** (once, right after deploying). A "secret"
   is a value Cloudflare keeps encrypted — the code reads it at runtime, and it
   never appears in your code or in git.

   ```bash
   wrangler secret put PLACES_API_KEY          # your main key (search + details)
   wrangler secret put PLACES_PHOTOS_API_KEY   # your photos key
   # optional — the defaults already cap BOTH keys at Google's FREE monthly
   # limit (1,000/mo; your requests run on the Enterprise + Atmosphere tier):
   wrangler secret put PLACES_PHOTOS_BUDGET    # e.g. 1000 = free cap (photos work, never billed)
   wrangler secret put PLACES_MAIN_BUDGET      # e.g. 1000 = free cap (search/details, default)
   ```

7. **Test it.** Use the Smoke test commands further down in this file, or just
   open your app and try the "Fetch Info With Maps" button.

> **Want everything to work but never get billed?** Just use the defaults —
> both budgets are `1000`, which is exactly Google's **free** monthly allowance
> for the tier your requests run on (see *Billing* below). Photos, search and
> details all work normally, and the Worker hard-stops at 100% of each
> allowance, so it can never cross into paid usage. (`0` would hard-disable
> that key entirely — only set that if you want none of it.)

### Parameters & responses, in plain English

| Route | What it does | Params |
|---|---|---|
| `/places/search?q=...` | Search Google for a place by name | `q`, `lang`, `photos` |
| `/places/{placeId}` | Full info for one place | `lang`, `photos` |
| `/places/{placeId}/photos` | Direct image URLs for a place's photos | `lang` |

Every request also needs:

- `Authorization: Bearer <token>` — the user's **Firebase login token**. This
  is how the Worker knows who is asking. It never trusts a plain "user id" from
  the URL — that would be easy to fake.
- An `Origin` header from one of the allowed app hosts (`localhost` for local
  testing, the dev/prd Firebase hosts). Anything else gets a `403`.

The params:

- `q` — the search text ("pizza rome").
- `lang` — `en` or `pt`. Controls the language Google returns for names and
  descriptions. Defaults to `en`.
- `photos` — `true` or `false` (default `false`). `true` = this is a brand-new
  place, so also grab photo references (uses the **paid** photos key).
  `false` = just refreshing an existing place's info (uses the **free** key —
  cheaper and faster).

Every response is a small JSON envelope:

- **Success** → the data (`{ "results": [...] }`, `{ "place": {...} }`, or
  `{ "photos": [...] }`). If the Worker had to turn photos off because the
  monthly budget is almost gone, the same success response also contains
  `"limited": true` — your app shows a toast saying search still works but
  photos are temporarily disabled.
- **Failure** → `{ "error": { "code": "...", "message": "..." } }`.

Common error codes:

| HTTP | Code | What it usually means |
|---|---|---|
| 400 | `places/missing-q`, `places/invalid-lang` | Bad request — a required param is missing or wrong |
| 401 | `places/unauthorized` | No login token, or the token is invalid/expired |
| 403 | `places/forbidden` | Not allowed to use the feature, or the request came from an unknown origin |
| 404 | `places/not-found` | Google doesn't know that place id |
| 429 | `places/rate-limit` / `places/upstream` | Too many requests per minute, or Google is rate-limiting |
| 429 | `places/quota-exceeded` | A key's monthly budget is used up — no more calls until next month |
| 500 | `places/internal` | Something broke on our side |

### Billing, in plain English

- Google Maps gives every API an allowance of **free calls per month**, and it
  resets on the **1st of each month**. Go above the allowance and Google bills you.
- **Which tier are we on?** Google bills each request at the **highest SKU**
  among the fields you ask for. This worker's field mask asks for `rating`,
  `priceLevel`, `priceRange`, `websiteUri` (**Enterprise** fields) and
  `reviewSummary`, `editorialSummary` (**Atmosphere** fields — these power the
  description). So **every search and details call is billed at the
  Enterprise + Atmosphere SKU**, whose free allowance is only **1,000
  events/month** (not the 5,000/10,000 of Pro/Essentials). Photos are a
  separate **Place Details Photos** SKU, also **1,000 free/month**.
- You have **two keys** — both must respect the same 1,000/mo free allowance
  (they hit the same Enterprise + Atmosphere SKUs):
  - `PLACES_API_KEY` — used for search + place info (`photos=false`).
  - `PLACES_PHOTOS_API_KEY` — used for anything with photos (`photos=true`,
    route 3, and the image media calls).
- The Worker counts its own calls **per key per month** and compares them to
  the budgets you set. That's your protection:
  - **Budget `1000` (the default for both keys)** → everything keeps working up
    to Google's **1,000 free events/month**, and the Worker **stops at 1,000**
    — so you use the free allowance and **never cross into paid**.
  - At **90%** of a budget the Worker switches to "limited" mode (photos off
    for a moment, tagged `limited: true`) as a safety margin before the cap.
  - At **100%** it returns `429 places/quota-exceeded` — no more calls until
    the 1st. **This hard stop at 100% is what keeps you at $0.**
  - (Optional extreme: **budget `0`** = that key disabled entirely. Not needed
    to stay at $0.)
- Want the real numbers for your account? **Google Cloud Console → Google Maps
  Platform → Quotas** shows each API's free allowance and your current usage.
- Extra safety net (optional, on Google's side): create a **Cloud Billing
  Budget** of a few dollars with **"disable billing when budget exceeded"**
  turned on. Even if something unexpected used Google directly, Google itself
  would stop before billing you.

---

## What it does

| Route | Params | Response |
|---|---|---|
| `GET /places/search` | `q`, `lang`, `photos=true`; token in header | `{ results }` (≤ 20) |
| `GET /places/{placeId}` | `lang`, `photos`; token in header | `{ place }` |
| `GET /places/{placeId}/photos` | `lang`; token in header | `{ photos }` (first 3, each `{ name, photoUri }`) |

Every JSON route requires `Authorization: Bearer <Firebase ID token>` and an
allowlisted `Origin`. Responses use the envelope `{ error: { code, message } }`
on failure; the frontend only checks `response.ok`.

**Photos (v1 strategy):** the worker resolves each Google photo `name` ref to a
stable, **keyless** CDN `photoUri` (`lh3.googleusercontent.com/…`) via the
media endpoint. The frontend **stores `photoUri` on the Firestore `placeAPI`
doc** and hotlinks it in `<img>` — end users never call the worker or Google
for photos. There is **no** byte proxy and **no** HMAC signing in v1
(`PHOTO_URL_SECRET` is not used).

---

## Environment strategy

**The client never chooses the environment** (a client `env` param is spoofable
→ auth bypass). The mode is derived server-side:

1. **Origin header** → `getMode()` in `src/config.js`:
   - `localhost` / `127.0.0.1` → `local`
   - `trip-viewer-dev.firebaseapp.com` → `dev`
   - `trip-viewer-prd.firebaseapp.com` → `prd`
   - anything else / missing → **403**
2. **Token `aud` claim** → `verifyToken()` verifies against every project
   (`trip-viewer-dev`, `trip-viewer-prd`); `firebase-auth-cloudflare-workers`
   checks `aud`/`iss`, so a dev token only verifies against dev and a prd token
   only against prd.
3. `local` mode verifies against the **Firebase Auth emulator**
   (`FIREBASE_AUTH_EMULATOR_HOST`, default `127.0.0.1:9099`); dev/prd verify
   against Google's public JWK set (cached in-memory; no service account).

---

## Setup

```bash
cd worker
npm install
```

- Copy `public/assets/json/currencies.json` → `worker/src/data/currencies.json`
  if it is missing (price resolution reads its `scaleNumeric` bands).
- Create `.dev.vars` from `.dev.vars.example` and fill in your secrets
  (`.dev.vars` is gitignored — never commit it).

```bash
cp .dev.vars.example .dev.vars   # then edit
```

`.dev.vars` keys:

| Key | Required | Purpose |
|---|---|---|
| `PLACES_API_KEY` | yes* | Main Google Places API (New) key — FREE/trial; used when `photos=false` |
| `PLACES_PHOTOS_API_KEY` | yes* | Dedicated photos key — REAL/paid; `photos=true` on routes 1/2 + route 3 + media endpoint |
| `ALLOWED_UIDS_JSON` | no | Optional JSON array of Firebase UIDs allowed to call the API (v1 allowlist) |
| `PLACES_API_MOCK` | no | `true` runs the auth/permission/rate-limit gates without a live Google key |
| `PLACES_MAIN_BUDGET` | no | Monthly call budget for the main key — default 1000 = the Enterprise+Atmosphere free cap (search/details, never billed) |
| `PLACES_PHOTOS_BUDGET` | no | Monthly call budget for the photos key — default 1000 = the Enterprise+Atmosphere / Photos free cap (never billed) |
| `PLACES_QUOTA_DEGRADE_RATIO` | no | Fraction of a budget at which "limited" mode kicks in — default 0.9 |

\* Required unless `PLACES_API_MOCK=true`.

> **Two Google keys (user decision 2026-08-09):** `PLACES_API_KEY` for
> `photos=false`, and `PLACES_PHOTOS_API_KEY` for anything photo-related.
> The `photos` param picks the key via `config.apiKeyFor(config, photos)`;
> route 3 always uses the photos key. Both are required in non-mock use.
> `PHOTO_URL_SECRET` is **not** needed (no HMAC/proxy in v1).

---

## Run locally

With the Firebase emulators running (Firestore `:8085`, Auth `:9099`, etc.):

```bash
# terminal 1 — Firebase emulators (from the repo root)
npm run dev            # or: npx firebase emulators:start

# terminal 2 — this worker
cd worker
npm run dev            # → wrangler dev on http://localhost:8787
```

`wrangler dev` picks up `.dev.vars` automatically and serves on `:8787`.
Requests from `http://localhost:8787` (Origin `http://localhost:8787`) map to
`local` mode, so you can smoke-test from a browser or curl with the `Origin`
header set.

---

## Deploy

```bash
cd worker
npm run deploy         # → wrangler deploy
```

Then set the secrets (once per account/route):

```bash
wrangler secret put PLACES_API_KEY
wrangler secret put PLACES_PHOTOS_API_KEY
wrangler secret put ALLOWED_UIDS_JSON    # optional
```

> `PHOTO_URL_SECRET` is **not** needed — photos use the stable CDN `photoUri`
> strategy (no signing/proxy).

The same deployed route serves dev and prd; the Origin + token `aud` decide the
mode. The `[vars]` `FIREBASE_AUTH_EMULATOR_HOST` in `wrangler.toml` is ignored
by the deployed worker (it only affects `wrangler dev`).

---

## Quota / budget protection

Google Maps Platform exposes **no API to read remaining quota**, so the worker
**self-accounts**: it counts every Google call it makes (the worker is the only
caller — the frontend never talks to Google directly) and compares against a
monthly budget **per key** (`worker/src/quota.js`).

Two buckets (one per key — user decision 2026-08-09):

| Bucket | Key | Uses | Default budget |
|---|---|---|---|
| `main` | `PLACES_API_KEY` | search + details, `photos=false` | 1,000 calls/mo |
| `photos` | `PLACES_PHOTOS_API_KEY` | `photos=true` + route 3 + media | 1,000 calls/mo |

> Both keys hit the **Enterprise + Atmosphere** SKUs (the field mask requests
> `rating`, `priceLevel`, `priceRange`, `websiteUri` — Enterprise — plus
> `reviewSummary`/`editorialSummary` — Atmosphere). Their free allowance is
> **1,000 events/month each** (Text Search E+A, Place Details E+A, and Place
> Details Photos), which is why the default budget is 1,000 for both keys.

Once a bucket reaches **degradeRatio** (default 0.9) of its budget:

- **`limited` mode** — routes 1/2 silently degrade `photos=true → false` (run
  on the FREE main key) and tag the 200 response `limited: true`; route 3
  returns `{ photos: [], limited: true }` without calling Google. The frontend
  shows a toast — *"Places quota is nearly reached — search and place info
  still work, but photos are temporarily disabled."* **No charges accrue.**
- **Hard block** — once a budget is fully spent the worker returns
  `429 { "error": { "code": "places/quota-exceeded", ... } }`; the frontend
  shows a specific "monthly quota reached" message.

**Budget semantics** (per key, per month):

| Value | Meaning |
|---|---|
| `0` | **Disabled** — the worker never calls that key. Photos fully off (search/details keep running on the free main key, tagged `limited`); a disabled main key hard-blocks. Optional hard-off — **not** needed to stay at $0 (use the default `1000` = free cap instead). |
| `> 0` | Monthly call cap — degraded (`limited`) at 90%, hard-blocked (`429`) at 100%. Keep it *at or below* Google's free monthly cap for that SKU and you stay at $0. |
| unset | Uses the default (main 1,000 / photos 1,000). |

**"I want photos to work, but never pay for them"**

The default budgets already do exactly this:

- `PLACES_PHOTOS_BUDGET` defaults to **1000** = Google's **free** monthly cap
  for the Place Details Photos SKU (1,000 events, then $7/1k). Photos keep
  working, and the worker **hard-blocks at 1000** — so it can never cross into
  paid usage. **$0 guaranteed.**
- At **90%** it enters "limited" mode (photos off + `limited: true` toast) as a
  safety margin so you slow down before the cap, not after.
- The main key is used for search/details — it hits the **same
  Enterprise + Atmosphere** SKUs, so its free allowance is also 1,000/mo and its
  default budget is also **1000**. Keep it at (or below) 1,000; if you exceed
  it, Google starts billing that key too.
- Only set a budget to `0` if you want to **disable that key entirely** —
  optional, not required for $0.

To see your project's actual free caps, check **Google Cloud Console →
Google Maps Platform → Quotas** (per-API free usage caps + current usage).

Set the budgets (adjust `PLACES_PHOTOS_BUDGET` for how much photos use you want):

```bash
wrangler secret put PLACES_MAIN_BUDGET          # e.g. 1000 = Enterprise+Atmosphere free cap (default)
wrangler secret put PLACES_PHOTOS_BUDGET        # e.g. 1000 = free cap (default; photos work, never billed)
wrangler secret put PLACES_QUOTA_DEGRADE_RATIO  # optional, default 0.9
```

### Sharing the ledger across worker isolates

The default counters are in-memory (per-isolate, best-effort — fine for a
single editor). For a real cost guarantee, bind a Cloudflare KV namespace so
every isolate shares the same counters:

```bash
npx wrangler kv namespace create PLACES_QUOTA
```

Then add the returned `id` (and `preview_id`) to `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "PLACES_QUOTA"
id = "<production_namespace_id>"
preview_id = "<preview_namespace_id>"
```

and redeploy. The counters reset automatically on the 1st of each month.

### Smoke test

```bash
# limited mode — set PLACES_PHOTOS_BUDGET=10, run ~9 photo requests, the next
# returns 200 with {"photos": [], "limited": true} (no Google call)
curl -i -H "Origin: http://localhost:8787" -H "Authorization: Bearer <token>" \
  "http://localhost:8787/places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos?lang=en"

# hard block — set PLACES_PHOTOS_BUDGET=1 and run a second photos request:
# expect 429 with {"error":{"code":"places/quota-exceeded"}}
```

---

## Granting a user access

v1 permission = an **allowlist** (the worker has no Firestore / service-account
access; the app's real source of truth is the Firestore doc
`admin/permissions/canUsePlacesAPI/{uid}`). Granting access is **two-step**:

1. Create the Firestore doc `admin/permissions/canUsePlacesAPI/{uid}` (frontend
   `getPermissions()` reads this — auth alone is not enough).
2. Add the UID to `ALLOWED_UIDS_JSON` (deployed) — or rely on the committed
   starter allowlist in `src/permissions.js` locally.

Few users hold this permission, so the duplication is acceptable for v1.
`isUidAllowed` stays thin so a direct Firestore check can replace it later
without touching callers.

---

## Smoke test

Run the worker (`cd worker && npm run dev`) and the Firebase Auth emulator,
then:

```bash
# 401 — no token
curl -i -H "Origin: http://localhost:8787" \
  "http://localhost:8787/places/search?q=restaurant"

# 403 — unknown origin
curl -i -H "Origin: https://evil.example.com" \
  -H "Authorization: Bearer <token>" \
  "http://localhost:8787/places/search?q=restaurant"

# 400 — missing q
curl -i -H "Origin: http://localhost:8787" \
  -H "Authorization: Bearer <token>" \
  "http://localhost:8787/places/search"

# 400 — invalid lang
curl -i -H "Origin: http://localhost:8787" \
  -H "Authorization: Bearer <token>" \
  "http://localhost:8787/places/search?q=restaurant&lang=xx"

# 200 — search (≤ 20 normalized results)
curl -i -H "Origin: http://localhost:8787" \
  -H "Authorization: Bearer <token>" \
  "http://localhost:8787/places/search?q=pizza%20rome&lang=en"

# 200 — details
curl -i -H "Origin: http://localhost:8787" \
  -H "Authorization: Bearer <token>" \
  "http://localhost:8787/places/ChIJN1t_tDeuEmsRUsoyG83frY4?lang=pt"

# 200 — photos → expect ≤ 3 photoUris; each loads as an image with NO auth/key
curl -i -H "Origin: http://localhost:8787" \
  -H "Authorization: Bearer <token>" \
  "http://localhost:8787/places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos?lang=en"

# 429 — rate limit (60 req/min per UID, same isolate)
for i in $(seq 1 61); do
  curl -s -o /dev/null -w "%{http_code}\n" -H "Origin: http://localhost:8787" \
    -H "Authorization: Bearer <token>" \
    "http://localhost:8787/places/search?q=x"
done | sort | uniq -c
```

Notes:

- Get a real token from the Auth emulator (sign in with an emulator test user
  and pass the ID token), or set `PLACES_API_MOCK=true` in `.dev.vars` to
  exercise the gates without a Google key.
- `photoUri` values are keyless `lh3.googleusercontent.com/…` URLs — paste one
  into a browser (or `curl -I`) to confirm it loads as an image with no
  auth/key.

---

## Deviations from the original plan

- **Photo strategy** — store the stable CDN `photoUri` on the Firestore
  `placeAPI` doc (resolved once at edit time); no byte proxy, no HMAC signing,
  no `PHOTO_URL_SECRET`. Old design documented as contingency only.
- **Two Google keys** — `PLACES_API_KEY` (main) + `PLACES_PHOTOS_API_KEY`
  (dedicated), picked via `config.apiKeyFor(config, photos)`.
- **Permission = allowlist** (not a Firestore doc check) for v1 — two-step
  grant (Firestore doc **and** `ALLOWED_UIDS_JSON`).
- **Price data** comes from `currencies.json` `scaleNumeric` bands (not the old
  `moedas.json`).

---

## Layout

```
src/
├── index.js         P4  entry: router, CORS, origin/mode, wiring, errors
├── config.js        P1  env + origin→mode detection (local/dev/prd)
├── auth.js          P2  Firebase ID token verification (multi-project + emulator)
├── permissions.js   P2  allowed-uid check (allowlist / env override)
├── rate-limit.js    P2  in-memory per-uid limiter (best-effort)
├── errors.js        P2  error envelope + status mapping
├── normalize.js     P3  §7 field mapping (rating/price/emoji/desc/…)
├── places.js        P3  Google Places client (search/details/photo media)
├── photo-url.js     P3  photo name → stable CDN photoUri (no HMAC, no proxy)
└── data/
    ├── emoji-map.json       P1  copy from scripts/export-maps-data/maps/
    ├── price-level-map.json P1  copy from scripts/export-maps-data/maps/
    └── currencies.json      P1  copy of public/assets/json/currencies.json
```
