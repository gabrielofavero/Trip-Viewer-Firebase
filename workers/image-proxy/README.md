# TripViewer Image Proxy — Cloudflare Worker

A Cloudflare Worker that batch-downloads trip images for **Export as Static
Web Page** (complete mode). The browser sends **ONE POST with every image
URL**; the worker fetches them server-side (no CORS) and returns them **all in
a single response**.

Fixes the **0-byte image bug**: a browser `fetch(url, { mode: 'no-cors' })`
for a CORS-blocked host (`images.trvl-media.com`, `www.brussels.be`, …)
returns an *opaque* response whose `.blob()` is always **0 bytes** — the old
frontend fallback zipped that empty file and rewrote the URL to it, corrupting
the export. Server-side fetching has no CORS, so every URL resolves to its
real bytes.

---

## How it works

```
Browser (TripViewer, logged in)
    │  POST /   { "urls": ["https://…", "https://…", …] }   (ONE request)
    │  Authorization: Bearer <Firebase ID token>
    ▼
Cloudflare Worker ──► fetches each URL server-side (bounded concurrency)
    │  verifies the Firebase token first (local → emulator; dev/prd → Google)
    ▼
Binary envelope response:  <JSON header>\n<image0 bytes><image1 bytes>…
```

### Request

```
POST /   (Content-Type: application/json)
Authorization: Bearer <Firebase ID token>
{ "urls": ["https://images.trvl-media.com/…jpg?…", "https://…"] }
```

- Max **40 URLs** per request (`MAX_URLS`) — free-tier subrequest cap is 50.
- Only `http:`/`https:`; loopback/metadata hosts are blocked (SSRF hygiene).

### Response

`Content-Type: application/octet-stream`. Body = a JSON header line followed
by a `\n`, then the image bytes concatenated in order:

```json
{
  "images": [ { "url": "…", "contentType": "image/jpeg", "size": 12345, "offset": 0 } ],
  "failed": [ { "url": "…", "reason": "http_404" } ]
}
```

`offset` is the byte position relative to the byte **after** the header's `\n`.
The client slices `[bodyStart + offset, +size)` → `Blob`. Binary (not base64)
keeps the worker within the free-tier 10ms CPU budget — fetching is I/O,
base64-encoding MBs is CPU.

### CORS

Allowlisted origins only: `localhost` / `127.0.0.1` (any port) for local dev,
plus `trip-viewer-dev.firebaseapp.com` / `trip-viewer-prd.firebaseapp.com`.
Any other Origin → 403.

### Auth

Every request must carry the caller's **Firebase ID token** (any logged-in
TripViewer user; not UID-allowlisted — exporting your own trip's images is
available to all). Local (`wrangler dev`) verifies against the Firebase Auth
emulator; dev/prd verify against Google's public keys via the token's
`aud`/`iss` claims.

---

## Run locally

```bash
cd workers/image-proxy
npm install
npm run dev        # wrangler dev --port 8788
```

`npm run dev` at the repo root starts this worker automatically (alongside
`workers/places-api`). Port **8788** is reserved for it (8787 = places-api).

## Deploy

```bash
cd workers/image-proxy
npm run deploy
```

> The deployed URL **must** match `IMAGE_PROXY_DEPLOYED_URL` in
> `public/assets/ts/static-export/build-zip.ts`:
> `https://trip-viewer-image-proxy.gabriel-o-favero.workers.dev`

No secrets to configure. `wrangler.toml` sets `FIREBASE_AUTH_EMULATOR_HOST`
for local token verification only.

---

## Smoke test

```bash
# local (auth against the emulator):
curl -s -X POST http://localhost:8788/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <emulator id token>" \
  -d '{"urls":["https://images.trvl-media.com/…jpg?w=10"]}' | head -c 300

# expect: 200, Content-Type application/octet-stream, X-Image-Proxy-* headers
```

Verify the fixed export: run the app, Settings → Export as Static Web Page →
**Complete** mode → unzip → every `images/*` file is **> 0 bytes** and the
`data.json` URLs point at local files.
