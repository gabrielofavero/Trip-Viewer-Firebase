# TripViewer Places API — Cloudflare Worker

A Cloudflare Worker that proxies the **Google Places API (New)** for TripViewer.
One deployed route serves **local / dev / prd** from a single codebase.

Source of truth: `docs/ai-analysis/7-places-api-backend-contract.md` (contract)
and `docs/ai-analysis/8-places-api-worker-build-prompts.md` (build plan).

---

## What it does

| Route | Params | Response |
|---|---|---|
| `GET /places/search` | `q`, `lang`, `photos=true`; token in header | `{ results }` (≤ 5) |
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
| `PLACES_API_KEY` | yes* | Main Google Places API (New) key; used when `photos=false` |
| `PLACES_PHOTOS_API_KEY` | yes* | Dedicated photos key; `photos=true` on routes 1/2 + route 3 + media endpoint |
| `ALLOWED_UIDS_JSON` | no | Optional JSON array of Firebase UIDs allowed to call the API (v1 allowlist) |
| `PLACES_API_MOCK` | no | `true` runs the auth/permission/rate-limit gates without a live Google key |

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

# 200 — search (≤ 5 normalized results)
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
