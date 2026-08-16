# Places API (New) — Backend (Cloudflare Worker) Contract

> **Status:** Finalized (Prompt 13 of `docs/implementation-plans/20260812-places-api-edit-destination.md`)
> **Date:** 2026-08-08
> **Scope:** Documentation only — no runtime code in this doc. It is the single source of truth for implementing the Cloudflare worker behind the edit-destination Places API feature.
> **Frontend counterpart:** `public/assets/ts/data/services/places-api.service.ts` + `public/assets/ts/models/places-api.model.ts` (types below are the live, finalized shapes).

This document defines everything a backend developer needs to build the Cloudflare worker that proxies the **Google Places API (New)** for TripViewer. Once implemented, the frontend only needs two changes to go live: set `PLACES_API_MOCK = false` and make `PLACES_API_BASE_URL` resolve per environment by hostname (§6.5) in `public/assets/ts/data/services/places-api.service.ts` (same pattern as `firebase-config.js`).

---

## 1. Overview

```
TripViewer frontend
   │  GET {base}/places/search?q=…&lang=…&photos=true      + Authorization: Bearer <firebase token>
   │  GET {base}/places/{placeId}?lang=…&photos=false      + Authorization: Bearer <firebase token>
   │  GET {base}/places/{placeId}/photos?lang=…            + Authorization: Bearer <firebase token>
   ▼
Cloudflare Worker  ──►  Google Places API (New)  https://places.googleapis.com/v1
   (verifies the Firebase token + origin; holds the Google API key; normalizes payloads)
```

- The **client sends** the Firebase ID token (`Authorization: Bearer <token>`), `lang` (`en` | `pt`) and the `photos` flag. The worker derives the user's `uid` from the **verified token** — the client **never** sends `uid`, so a spoofed `?uid=` is not possible (see §6.1). It never sends the Google API key, and it never sends raw Google payloads.
- The **worker** owns the Google API key, verifies the caller's token, calls Google, and returns the **normalized** shapes in §4.
- All routes are **GET** with query parameters plus an `Authorization` header; all responses are JSON.

---

## 2. Configuration

| Setting | Value / format | Notes |
|---|---|---|
| Worker base URL | single deployed route `https://{worker}.tripviewer.dev` (dev + prd); local = `wrangler dev` (e.g. `http://localhost:8787`) | One route/codebase; frontend picks local vs deployed by hostname (§6.5) |
| Google API key | `PLACES_API_KEY` (worker secret) | Used as `X-Goog-Api-Key` header + in photo media URLs. Never exposed to the client. |
| Places API base (Google) | `https://places.googleapis.com/v1` | |
| Firebase token verification | Firebase Admin SDK `verifyIdToken()` | Worker derives `uid` from the verified token (§6.1) |
| Field mask (details) | see §5 | `X-Goog-FieldMask` header for `GET places/{id}` |
| Field mask (search) | see §5 | `X-Goog-FieldMask` header for `POST places:searchText` |
| Allowed origins | TripViewer app origins (Firebase Hosting, dev/preview) | Worker CORS allowlist (§6.3) |
| Allowed CORS headers | `Authorization`, `Content-Type` | Worker CORS preflight (§6.3) |
| Supported languages | `en`, `pt` | `lang` param; maps to Google `languageCode`/`Accept-Language` (§6.2) |

---

## 3. Route Summary

| # | Route (relative to `{base}`) | Purpose | Request params | Response envelope |
|---|---|---|---|---|
| 1 | `GET /places/search` | Name search, ≤ 5 results with all needed data | `q`, `lang`, `photos=true`; token in header | `{ "results": PlaceSearchResult[] }` |
| 2 | `GET /places/{placeId}` | Full place info by Google Place ID | `lang`, `photos` (false on refresh); token in header (path: `placeId`) | `{ "place": PlaceDetails }` |
| 3 | `GET /places/{placeId}/photos` | Direct image URLs for the first 3 photos | `lang`; token in header (path: `placeId`); `photos` n/a — always returns photos | `{ "photos": PlacePhoto[] }` |

> Route 3 needs the `placeId` path param (plus the Firebase token for auth) — the worker resolves the photo references itself (it calls the Google details endpoint and takes the first 3 `photos[].name` refs, then returns fetchable signed URLs). The client never passes raw Google photo refs.

---

## 4. Response Data Model (finalized — matches `models/places-api.model.ts`)

### 4.1 `PlaceSearchResult` (route 1 item) / `PlaceDetails` (route 2, same shape, fully populated)

```jsonc
{
  "id": "ChIJN1t_tDeuEmsRUsoyG83frY4",        // Google Place ID (required)
  "name": "Pizzeria Bella Napoli",
  "description": "Authentic Neapolitan wood-fired pizza…", // localized; ONLY requested lang
  "region": "Historic Center",                // postalAddress.sublocality
  "website": "https://example.com/bella-napoli",
  "instagram": "bellanapoli.pizza",           // when websiteUri was an instagram URL
  "rating": "4",                              // string; nearest integer (python round_rating)
  "price": "$$",                              // "$" | "$$" | "$$$" | "$$$$" | "-"
  "emoji": "🍕",                               // resolved from Google `types` via emoji-map
  "map": "https://maps.google.com/?cid=…",    // googleMapsUri
  "businessStatus": "OPERATIONAL",            // "OPERATIONAL" | "CLOSED_PERMANENTLY" | "CLOSED_TEMPORARILY" | …
  "photos": [                                 // photo references (route 3 consumes these)
    { "name": "places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos/AUc7tX…" }
  ]
}
```

### 4.2 `PlacePhoto` (route 3 item)

```jsonc
{
  "name": "places/ChIJN1t_tDeuEmsRUsoyG83frY4/photos/AUc7tX…", // Google photo reference id
  "url": "https://{worker}/places/ChIJ…/photos/AUc7tX…?exp=…&sig=…" // directly fetchable signed URL — no token, no API key (§4.3)
}
```

### 4.3 Photo URL rules (important)

- The `url` must be **directly loadable by the browser** (`<img src>` / plain `fetch`) with **no extra auth** and **no Google API key** exposed.
- **Important (auth):** an `<img>` tag cannot send an `Authorization` header, so photo `url`s must **not** require the Firebase token. The worker must issue short-lived **signed URLs** (expiry + HMAC signature) or serve the bytes from an unauthenticated worker route keyed by an unguessable photo ref.
- **Recommended:** the worker serves the image bytes itself — i.e. `url` points back at the worker (e.g. `GET {base}/places/{placeId}/photos/{photoRef}?exp=…&sig=…` returns the image with the correct `Content-Type`), or a short-lived pre-signed URL. Implement whichever fits the worker; the contract only requires: no API key in the URL, no token needed, and the URL is stable/loadable at least while the page is open.
- The worker decides image sizing (e.g. `maxWidthPx=1600` for the details media request). The frontend does not need the exact size.

---

## 5. Google Places API (New) — Required Field Masks

The worker must request **at least** these fields. (The python export script `scripts/export-maps-data/export-maps-data.py` uses a very close mask; the contract **adds** `businessStatus` and `photos`.)

> `photos` is requested **only when the client sends `photos=true`** (new-place fetch). On refresh (`photos=false`) the worker omits `photos` from the mask, so the response has no `photos` array (§6.4).

### 5.1 `GET https://places.googleapis.com/v1/places/{placeId}` (route 2 + photo resolution for route 3)

```
X-Goog-FieldMask:
id,
displayName,
shortFormattedAddress,
postalAddress,
primaryTypeDisplayName,
types,
rating,
priceLevel,
priceRange,
googleMapsUri,
websiteUri,
reviewSummary,
editorialSummary,
businessStatus,
photos
```

### 5.2 `POST https://places.googleapis.com/v1/places:searchText` (route 1)

```
X-Goog-FieldMask:
places.id,
places.displayName,
places.shortFormattedAddress,
places.postalAddress,
places.primaryTypeDisplayName,
places.types,
places.rating,
places.priceLevel,
places.priceRange,
places.googleMapsUri,
places.websiteUri,
places.reviewSummary,
places.editorialSummary,
places.businessStatus,
places.photos
```

Body: `{ "textQuery": "<q>", "pageSize": 5, "languageCode": "<langCode>" }`

---

## 6. Auth, User & Language Contract

### 6.1 Firebase token (authoritative `uid`)

- Every request must carry the **Firebase ID token** as `Authorization: Bearer <token>` (the client gets it via `firebase.auth().currentUser.getIdToken()` — mirrors `getFirebaseIdToken()` in `public/assets/ts/data/firebase/auth.ts`).
- The worker **verifies** the token with the Firebase Admin SDK (`verifyIdToken(token)`). The user's `uid` = `decodedToken.uid`. The same route accepts tokens from **both** `trip-viewer-dev` and `trip-viewer-prd` — `verifyIdToken` validates `aud`, and the `aud` also selects which project's Firestore the permission check reads from (§6.5).
- **`uid` is never sent by the client.** Deriving it from the verified token is what makes spoofing impossible — unlike a raw `?uid=` or an `Origin` header, a valid ID token is signed by Firebase and cannot be forged by a caller.
- Permission check: source of truth is the Firestore document `admin/permissions/canUsePlacesAPI/{uid}` **exists** → the user may use the API (mirrors `getPermissions()` in `public/assets/ts/data/firebase/database.ts`, which reads exactly that path).
- Behavior:
  - Missing, malformed or expired token → **401 Unauthorized**.
  - Valid token but no `canUsePlacesAPI` permission → **403 Forbidden**.
- The worker should also confirm the `uid` is a known app user (not strictly required by the frontend; recommended for rate-limit attribution).
- **How Cloudflare can verify the token:** (a) the Firebase Admin SDK's `verifyIdToken()` inside the Worker; or (b) manual JWT verification — fetch & cache Google's public keys from `https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com` (same endpoint for every Firebase project), verify the RSA signature with Web Crypto, then check `iss` ∈ {`https://securetoken.google.com/trip-viewer-dev`, `https://securetoken.google.com/trip-viewer-prd`}, `aud` ∈ {`trip-viewer-dev`, `trip-viewer-prd`}, and `exp` not past.

### 6.2 `lang`

- Values: `en` | `pt` (defaults to `en` when absent).
- Maps to Google: `en` → `en`, `pt` → `pt-BR` (matches `LANGUAGE_MAP.short` in `export-maps-data.py`).
- Send it as both the `languageCode` body field (search) and the `Accept-Language` header (details).
- **`description` is returned ONLY in the requested language.** The worker must not merge languages. (The frontend preserves the other language itself — see `mergePlaceAPI` in `places-apply.ts`.)
- Invalid `lang` → **400 Bad Request** (or default to `en`; pick one and document it in the worker README).

### 6.3 Origin / CORS validation

- The worker must reject requests whose `Origin` is not in the allowlist (TripViewer Firebase Hosting origins + local dev origins).
- Respond to `OPTIONS` preflight with the allowlisted origin, `Access-Control-Allow-Methods: GET, OPTIONS`, and `Access-Control-Allow-Headers: Authorization, Content-Type`.
- Reject non-allowlisted origins with **403**.

### 6.4 `photos` flag

- Query param `photos` (`true` | `false`), sent by the frontend on routes 1 & 2.
- `true` — the client is **fetching a new thing** (no place id yet — route 1 search, or building a brand-new place from a search result). The worker includes `photos` in the Google field mask and returns `photos[]` refs.
- `false` — the client is **refreshing an existing place** (it already has a place id, e.g. the bulk "Update with Maps" flow). The worker omits `photos` from the mask; the response has no `photos` array (saves quota + latency).
- Route 3 is the dedicated photos route — it always returns photo URLs; the flag does **not** gate it (the frontend doesn't send it there).
- Invalid/absent value → treat as `false` (document the choice in the worker README).

### 6.5 Environments & single-route strategy (local / dev / prd)

Three environments, all served by **one worker codebase and one deployed route** (dev + prd share the same URL; local runs the same code locally):

| Environment | Allowlisted Origin | Token source | Worker mode |
|---|---|---|---|
| **Local** (`npm run dev`) | `localhost` / `127.0.0.1` (emulator hosting) | **Firebase Auth emulator** (:9099) — tokens are **not** verifiable against Google's keys | **LOCAL** — verify against the emulator's keys; read permission from the **Firestore emulator** |
| **Dev** | `trip-viewer-dev.firebaseapp.com` | real project `trip-viewer-dev` | verify with Google keys; `aud` = `trip-viewer-dev` |
| **Prd** | `trip-viewer-prd.firebaseapp.com` | real project `trip-viewer-prd` | verify with Google keys; `aud` = `trip-viewer-prd` |

- **Do NOT send a `env=dev|prod|local` param/header from the client.** A client-supplied environment flag is spoofable (same class of problem as a raw `?uid=` or `Origin`) — an attacker would just send `env=local` to weaken auth. The worker decides the mode **server-side only**:
  1. Validate `Origin` against the allowlist (§6.3). A `localhost`/`127.0.0.1` origin → **LOCAL mode**.
  2. Otherwise verify the token against Google's public keys — the signed **`aud` claim** then identifies the project (`trip-viewer-dev` vs `trip-viewer-prd`). Dev vs prd is never taken from the request; it is read out of the **verified token**.
- **`aud` selects the Firestore project for the permission check** (`admin/permissions/canUsePlacesAPI/{uid}` lives in each project's own Firestore). The worker holds one service-account credential per project (selected by `aud`); in LOCAL mode it reads the emulator Firestore (:8085).
- **Local requires a locally-running worker.** A *deployed* worker can never verify emulator tokens (signed by the local emulator, not Google), so local runs the **same worker code** with `wrangler dev` (e.g. `http://localhost:8787`); being on the dev machine it can reach the Auth emulator (:9099) and Firestore emulator (:8085). The frontend points **only** localhost at `http://localhost:8787`; dev and prd both point at the single deployed URL.
- **Alternative for local only (bypass the worker):** call the Google Places API directly from the local app using an API key stored in a gitignored `.env`. If you choose this, use a dedicated key **restricted by HTTP referrer to `localhost`/`127.0.0.1`**, and note that local then exercises **no** token validation, permission check, or normalization. Recommended: keep local on `wrangler dev` so the local path is identical to prod.

---

## 7. Field Mapping: Google Places (New) → Contract Shape

| Contract field | Google source | Transform (mirrors `export-maps-data.py`) |
|---|---|---|
| `id` | `id` | passthrough |
| `name` | `displayName.text` | passthrough |
| `region` | `postalAddress.sublocality` | passthrough; `""` if absent |
| `website` | `websiteUri` | `""` if the URI is an Instagram URL (contains `instagram.com`), else the URI |
| `instagram` | `websiteUri` | the URI if it is an Instagram URL, else `""` (i.e. exactly one of `website`/`instagram` is set) |
| `rating` | `rating` (float) | round to nearest integer → **string** (`round(float(r))`); `""` if missing/non-numeric |
| `price` | `priceRange` (priority 1) or `priceLevel` (priority 2) | see §7.1 |
| `description` | `editorialSummary.text` → `reviewSummary.text` → `primaryTypeDisplayName.text` | first non-empty; requested language only |
| `emoji` | `types[]` via `emoji-map.json` | exact match → wildcard substring → first-token prefix (see `resolve_emoji` in `export-maps-data.py`) |
| `map` | `googleMapsUri` | passthrough |
| `businessStatus` | `businessStatus` | passthrough (omit field if Google omits it) |
| `photos` | `photos[].name` | `[{ "name": "<photoRefName>" }]` (all refs on routes 1/2; worker re-resolves on route 3) |

### 7.1 `price` resolution (priority order)

1. **`priceRange`** (`startPrice`/`endPrice`, with `currencyCode` + `units`): average the two unit values, then map the average against the currency's numeric bands (see `public/assets/json/currencies.json` → `scaleNumeric`, used by `resolve_price_level`) → `"$"` … `"$$$$"`.
2. **`priceLevel`** → fixed map (see `scripts/export-maps-data/maps/price-level-map.json`):
   - `PRICE_LEVEL_FREE` → `"-"`
   - `PRICE_LEVEL_INEXPENSIVE` → `"$"`
   - `PRICE_LEVEL_MODERATE` → `"$$"`
   - `PRICE_LEVEL_EXPENSIVE` → `"$$$"`
   - `PRICE_LEVEL_VERY_EXPENSIVE` → `"$$$$"`
3. **Fallback** → `"-"`.

> `"default"` is an accepted legacy value in the app's type comment, but the current pipeline never emits it; the worker should emit one of `"$"`, `"$$"`, `"$$$"`, `"$$$$"`, `"-"`.

---

## 8. `businessStatus` Handling

- The worker **passes through** Google's raw `businessStatus` unchanged.
- Closed detection is a **frontend** concern, defined once in `places-apply.ts` (`buildClosedState`):
  - `CLOSED_PERMANENTLY` → treated as **closed** ("place no longer operational").
  - `CLOSED_TEMPORARILY` → **not** treated as closed (per plan Open Question 8 — permanent only).
  - `OPERATIONAL` / anything else → not closed.
- The worker must ensure `businessStatus` is in the field mask (§5) so it is always present when Google provides it.

---

## 9. Photo Reference Format

- Google photo references are `name` strings like `places/{placeId}/photos/{photoRef}`.
- Routes 1 & 2 expose them as `photos: [{ "name": "<full ref>" }]` — the **full** Google ref, not truncated.
- Route 3: worker fetches the place (field mask §5.1), takes `photos[].name` **first 3**, and returns `{ photos: [{ name, url }] }` where `url` follows §4.3. If the place has no photos → `{ "photos": [] }` (200, empty array).

---

## 10. Errors

### 10.1 Error envelope (JSON, consistent across routes)

```jsonc
{
  "error": {
    "code": "places/not-found",
    "message": "Place not found"
  }
}
```

### 10.2 Status codes

| HTTP | When | Frontend result |
|---|---|---|
| `200` | Success | parsed envelope |
| `400` | Missing/invalid `q` (route 1) or invalid `lang` | `placesApi.errors.network` |
| `401` | Missing/invalid/expired Firebase token | `placesApi.errors.network` |
| `403` | No `canUsePlacesAPI` permission, or bad Origin | `placesApi.errors.network` |
| `404` | Unknown `placeId` (routes 2/3) | `placesApi.errors.network` |
| `429` | Google rate limit / quota | `placesApi.errors.network` (frontend shows generic network error) |
| `429` | **Monthly budget exhausted** (`places/quota-exceeded`, quota.js) | `placesApi.errors.quotaExceeded` (frontend shows "monthly quota reached") |
| `502` / `503` | Google upstream failure / timeout | `placesApi.errors.network` |
| `500` | Worker internal error | `placesApi.errors.network` |

> The frontend only checks `response.ok` and throws a friendly translatable error (`translate('placesApi.errors.network')`); it does **not** parse the error body. The envelope exists so the worker is debuggable and consistent.

> **Quota / budget protection** (workers/places-api/src/quota.js): the worker self-accounts
> monthly calls per key because Google exposes no usage API. When a budget is
> ≥ 90% spent it returns **`200` with `"limited": true`** (routes 1/2 degrade
> `photos=true → false` onto the free main key; route 3 returns `{ photos: [],
> limited: true }`) so the frontend can show a "search has been limited" toast.
> A fully spent budget returns **`429 places/quota-exceeded`** (see §10.2).

---

## 11. Implementation Checklist (worker)

- [ ] `OPTIONS` preflight + CORS allowlist, allowing the `Authorization` header (§6.3).
- [ ] Firebase token verification (`verifyIdToken`) → derive `uid` + `admin/permissions/canUsePlacesAPI/{uid}` existence check (§6.1).
- [ ] `lang` validation + Google language mapping (`pt` → `pt-BR`) (§6.2).
- [ ] `photos` flag → include/omit `photos` in the Google field mask (§6.4).
- [ ] Route 1: `places:searchText` with mask §5.2, `pageSize: 5`, normalize via §7 → `{ results }` (≤ 5).
- [ ] Route 2: `GET places/{id}` with mask §5.1, normalize via §7 → `{ place }`.
- [ ] Route 3: resolve photo refs (details call), take first 3, produce direct URLs (§4.3, §9) → `{ photos }`.
- [ ] Timeouts on upstream calls (Google) with a worker-level cap (e.g. 30s).
- [ ] Error envelope + status codes (§10).
- [ ] Rate limiting per `uid` (recommended; protects the Google quota).
- [ ] Single deployed route for dev + prd; local runs the same worker via `wrangler dev`. Mode from validated Origin + token `aud` — **never** a client `env` flag (§6.5).
- [ ] `aud`-based Firestore selection for the permission check (one service-account credential per project) (§6.1, §6.5).
- [ ] When deployed, tell the frontend to set `PLACES_API_MOCK = false` and compute `PLACES_API_BASE_URL` per hostname (localhost → `wrangler dev` URL; else → deployed URL) (§6.5) in `public/assets/ts/data/services/places-api.service.ts`.

---

## 12. Open Items (backend-side, not blocking)

- **Exact worker URL** and whether photo `url`s are worker-proxied or pre-signed (either satisfies §4.3).
- **Price mapping data**: the worker needs the same currency band data the python script reads from `public/assets/json/currencies.json` (`scaleNumeric`) and `maps/price-level-map.json` — decide whether to replicate the JSON in the worker bundle or fetch from Firestore/static.
- **Emoji map**: same for `maps/emoji-map.json` (exact/wildcard/first-token resolution).
- **Rate-limit budget** per user/plan tier.

*End of backend contract. A backend developer should be able to implement the worker from this document without further questions to the frontend team.*
