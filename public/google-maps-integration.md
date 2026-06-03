# Google Maps Integration — Places API

## Goal

Auto-fill destination item fields (name, description, region, website, price, emoji) from a Google Maps URL using the **Places API**. API key is stored locally (never committed) and proxied through a local Python server. Architecture is designed so production migration is a one-step swap.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ LOCAL (today)                                       │
│                                                     │
│  Browser (localhost)                                │
│       │ POST {url}                                  │
│       ▼                                             │
│  localhost:8765 (Python proxy)                      │
│       │ reads GOOGLE_MAPS_API_KEY from .env         │
│       ▼                                             │
│  Google Places API                                  │
│                                                     │
├─────────────────────────────────────────────────────┤
│ PRODUCTION (future — one swap)                      │
│                                                     │
│  Browser (anywhere)                                 │
│       │ POST {url}                                  │
│       ▼                                             │
│  Firebase Cloud Function (places-proxy)             │
│       │ reads key from firebase functions:config    │
│       ▼                                             │
│  Google Places API                                  │
└─────────────────────────────────────────────────────┘
```

The frontend always calls the same shape of endpoint. In localhost it points to `localhost:8765`; in production you flip the URL to the Cloud Function. No other code changes.

---

## Current Destination Fields

| Field | UI Input | Auto-fill? | Source |
|-------|----------|------------|--------|
| `nome` | `editar-nome-{j}` | ✅ | `name` |
| `emoji` | `editar-emoji-{j}` | ✅ | `types` mapping |
| `nota` | `editar-nota-{j}` | ❌ | Personal — leave manual |
| `mapa` | `editar-mapa-{j}` | ✅ | The URL you pasted |
| `instagram` | `editar-instagram-{j}` | ❌ | Not in Places API |
| `website` | `editar-website-{j}` | ✅ | `website` |
| `regiao` | `editar-regiao-select-{j}` | ✅ | `address_components` (sublocality/neighborhood) |
| `valor` | `editar-valor-select-{j}` | ⚠️ | `price_level` (0–4) mapped to € scale |
| `descricao.en` | `editar-descricao-en-{j}` | ✅ | `editorial_summary.overview` |
| `descricao.pt` | `editar-descricao-pt-{j}` | ⚠️ | Auto-translate from EN (or leave blank) |
| `midia` | `editar-midia-{j}` | ❌ | — |

---

## Google Places API

### Endpoint

`https://maps.googleapis.com/maps/api/place/details/json`

### Request

```
GET /maps/api/place/details/json
  ?place_id=ChIJ...
  &fields=name,formatted_address,website,url,formatted_phone_number,
          price_level,rating,user_ratings_total,editorial_summary,
          types,photos,opening_hours,geometry,address_components
  &key=API_KEY
  &language=en
```

### Fields → Destination Mapping

| Places API field | Destination field | Notes |
|-----------------|-------------------|-------|
| `result.name` | `nome` | |
| `result.website` | `website` | |
| `result.url` | `mapa` | Canonical Maps URL |
| `result.price_level` | `valor` | 0=Free, 1=$, 2=$$, 3=$$$, 4=$$$$ |
| `result.editorial_summary.overview` | `descricao.en` | Short editorial blurb |
| `result.types[]` | `emoji` | See mapping table below |
| `result.address_components[]` | `regiao` | `sublocality_level_1` or `neighborhood` |
| `result.geometry.location` | (coords) | lat/lng |
| `result.rating` | (info) | Google rating — not your personal score |

### Cost

- **Place Details**: ~$0.025/request (with contact + atmosphere fields)
- **Free tier**: $200/month credit → ~8,000 calls/month free
- **Personal use**: effectively $0 (you'll never hit the limit)
- Billing account required, but you stay within the always-free tier

---

## Place ID Extraction

The proxy server handles all URL formats:

| Format | Example | Strategy |
|--------|---------|----------|
| Share link | `https://maps.app.goo.gl/abc123` | HEAD redirect → full URL |
| Full URL | `.../place/.../data=...!19sChIJ...` | Parse `!19s` → base64 place ID |
| Query param | `.../place/?q=place_id:ChIJ...` | Parse `place_id` param |
| Fallback | (no place ID found) | Find Place From Text by name |

```python
import re
from urllib.parse import urlparse, parse_qs

def extract_place_id(url: str) -> str | None:
    # 1. Resolve short URLs first
    if "goo.gl/maps" in url or "maps.app.goo.gl" in url:
        try:
            resp = requests.head(url, allow_redirects=True, timeout=10)
            url = resp.url
        except Exception:
            pass

    # 2. Query params: place_id=... or ftid=...
    params = parse_qs(urlparse(url).query)
    if "place_id" in params: return params["place_id"][0]
    if "ftid" in params:     return params["ftid"][0]

    # 3. !19s marker in /data/ path
    m = re.search(r'!19s([A-Za-z0-9_-]{20,})', url)
    if m: return m.group(1)

    return None
```

---

## Local Proxy Server

### File Layout

```
scripts/
├── .env                    # API key (GITIGNORED — never committed)
├── .env.example            # Template (committed)
├── requirements.txt        # requests, python-dotenv
└── places-proxy-server.py  # Local HTTP proxy
```

### API Key Setup

`scripts/.env.example` (committed):
```
GOOGLE_MAPS_API_KEY=your_api_key_here
# Get your key: https://console.cloud.google.com/apis/credentials
# Enable: Places API
```

`scripts/.env` (gitignored — real key):
```
GOOGLE_MAPS_API_KEY=AIza...your_actual_key
```

`.gitignore` addition:
```
scripts/.env
```

### Python Requirements

`scripts/requirements.txt`:
```
requests>=2.30.0
python-dotenv>=1.0.0
```

### Proxy Server Code

`scripts/places-proxy-server.py`:

```python
"""
Google Places API Proxy — Local Only
Proxies requests to Google Places API, keeping the API key server-side.

Usage:
    python scripts/places-proxy-server.py
    → http://localhost:8765

Production path (future):
    Deploy as Firebase Cloud Function with API key in env config.
"""

import json
import os
import re
import sys
import requests
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")

if not API_KEY:
    print("❌ GOOGLE_MAPS_API_KEY not set.")
    print("   Create scripts/.env with: GOOGLE_MAPS_API_KEY=your_key")
    sys.exit(1)

PLACES_DETAIL_URL = "https://maps.googleapis.com/maps/api/place/details/json"
FIND_PLACE_URL = "https://maps.googleapis.com/maps/api/place/findplacefromtext/json"

FIELDS = (
    "name,formatted_address,website,url,formatted_phone_number,"
    "price_level,rating,user_ratings_total,editorial_summary,"
    "types,photos,opening_hours,geometry,address_components"
)

# ── URL Parsing ───────────────────────────────────────

def resolve_short_url(url: str) -> str:
    if "goo.gl/maps" in url or "maps.app.goo.gl" in url:
        try:
            resp = requests.head(url, allow_redirects=True, timeout=10)
            return resp.url
        except Exception:
            pass
    return url


def extract_place_name(url: str) -> str | None:
    m = re.search(r'/place/([^/@]+?)(?:/@|$|\?)', url)
    if m:
        return m.group(1).replace("+", " ").replace("%20", " ")
    return None


def extract_place_id(url: str) -> str | None:
    params = parse_qs(urlparse(url).query)
    if "place_id" in params:
        return params["place_id"][0]
    if "ftid" in params:
        return params["ftid"][0]
    m = re.search(r'!19s([A-Za-z0-9_-]{20,})', url)
    if m:
        return m.group(1)
    return None


# ── Places API Calls ──────────────────────────────────

def find_place_id(text: str) -> str | None:
    resp = requests.get(FIND_PLACE_URL, params={
        "input": text, "inputtype": "textquery",
        "fields": "place_id", "key": API_KEY
    })
    data = resp.json()
    candidates = data.get("candidates", [])
    return candidates[0]["place_id"] if candidates else None


def get_place_details(place_id: str) -> dict:
    resp = requests.get(PLACES_DETAIL_URL, params={
        "place_id": place_id, "fields": FIELDS,
        "key": API_KEY, "language": "en"
    })
    return resp.json()


# ── Normalization ─────────────────────────────────────

def normalize(api_data: dict, original_url: str) -> dict:
    result = api_data.get("result", {})
    if not result:
        return {"error": api_data.get("error_message", "Place not found")}

    out = {
        "nome": result.get("name", ""),
        "website": result.get("website", ""),
        "mapa": result.get("url", original_url),
        "regiao": "",
        "valor": "",
        "emoji": "",
        "descricao": {"en": "", "pt": ""},
        "telefone": result.get("formatted_phone_number", ""),
        "coordenadas": {},
        "google_rating": result.get("rating", ""),
        "google_ratings_total": result.get("user_ratings_total", 0)
    }

    # Region
    for comp in result.get("address_components", []):
        types = comp.get("types", [])
        if "sublocality_level_1" in types or "sublocality" in types:
            out["regiao"] = comp.get("long_name", ""); break
        elif "neighborhood" in types:
            out["regiao"] = comp.get("long_name", ""); break
        elif "administrative_area_level_2" in types:
            out["regiao"] = comp.get("long_name", ""); break

    # Price level
    price = result.get("price_level")
    if price is not None:
        out["valor"] = {0: "-", 1: "€", 2: "€€", 3: "€€€", 4: "€€€€"}.get(price, "")

    # Description
    summary = result.get("editorial_summary", {})
    if isinstance(summary, dict):
        out["descricao"]["en"] = summary.get("overview", "")

    # Emoji
    out["emoji"] = suggest_emoji(result.get("types", []))

    # Coordinates
    geo = result.get("geometry", {}).get("location", {})
    if geo:
        out["coordenadas"] = {"lat": geo.get("lat", ""), "lon": geo.get("lng", "")}

    return out


def suggest_emoji(types: list[str]) -> str:
    type_map = {
        "restaurant": "🍽️", "food": "🍽️", "cafe": "☕",
        "bar": "🍸", "night_club": "🪩",
        "museum": "🏛️", "tourist_attraction": "📸",
        "park": "🌳", "natural_feature": "🌳", "beach": "🏖️",
        "lodging": "🏨", "shopping_mall": "🛍️", "store": "🛍️",
        "bakery": "🥐", "church": "⛪", "place_of_worship": "⛪",
        "art_gallery": "🎨", "movie_theater": "🎬",
        "stadium": "🏟️", "aquarium": "🐠", "zoo": "🦁",
        "amusement_park": "🎢", "spa": "💆", "gym": "🏋️",
        "book_store": "📚", "clothing_store": "👕",
        "jewelry_store": "💎", "liquor_store": "🍷",
        "supermarket": "🛒", "airport": "✈️",
        "train_station": "🚆", "bus_station": "🚌",
        "subway_station": "🚇"
    }
    for t in types:
        if t in type_map:
            return type_map[t]
    return "📍"


# ── HTTP Server ───────────────────────────────────────

class PlacesHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length)
        data = json.loads(body)
        url = data.get("url", "")

        if not url:
            self._respond(400, {"error": "Missing 'url' field"})
            return

        try:
            resolved = resolve_short_url(url)
            place_id = extract_place_id(resolved)

            if not place_id:
                name = extract_place_name(resolved)
                if name:
                    place_id = find_place_id(name)

            if not place_id:
                self._respond(404, {
                    "error": "Could not extract place ID. "
                             "Use a direct Google Maps place URL."
                })
                return

            api_data = get_place_details(place_id)
            normalized = normalize(api_data, url)
            self._respond(200, normalized)

        except Exception as e:
            self._respond(500, {"error": str(e)})

    def _respond(self, status, body):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self._cors()
        self.end_headers()
        self.wfile.write(json.dumps(body, ensure_ascii=False).encode("utf-8"))

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def log_message(self, format, *args):
        print(f"[places-proxy] {args[0]} {args[1]} {args[2]}")


if __name__ == "__main__":
    port = 8765
    server = HTTPServer(("localhost", port), PlacesHandler)
    print(f"🗺️  Places API proxy: http://localhost:{port}")
    print(f"   Key: {API_KEY[:8]}...{API_KEY[-4:]}")
    print("   Press Ctrl+C to stop")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping...")
        server.server_close()
```

---

## Frontend Integration

### Import Button (localhost only)

In `_getEditHTML()` (inside `content.js`):

```javascript
const isLocalhost = (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
);

const importBtn = isLocalhost
    ? `<button id="editar-importar-${j}" class="edit-btn import-btn"
         type="button" onclick="_importFromMapsURL(${j})"
         title="Import from Google Maps">
        <i class="iconify color-icon edit" data-icon="mdi:map-search"></i>
       </button>`
    : "";
```

### Import Function

In `editar-destino.js`:

```javascript
async function _importFromMapsURL(j) {
    const url = getID(`editar-mapa-${j}`).value;
    if (!url || !url.includes("google.com/maps")) {
        _showToast("Paste a Google Maps URL first", "warning");
        return;
    }

    const btn = getID(`editar-importar-${j}`);
    btn.disabled = true;
    btn.innerHTML = '<i class="iconify" data-icon="svg-spinners:180-ring"></i>';

    try {
        const resp = await fetch("http://localhost:8765", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
        });
        const data = await resp.json();

        if (data.error) {
            _showToast("Import failed: " + data.error, "error");
            return;
        }

        if (data.nome) getID(`editar-nome-${j}`).value = data.nome;
        if (data.website) getID(`editar-website-${j}`).value = data.website;
        if (data.emoji) getID(`editar-emoji-${j}`).value = data.emoji;
        if (data.valor) getID(`editar-valor-select-${j}`).value = data.valor;
        if (data.regiao) getID(`editar-regiao-select-${j}`).value = data.regiao;
        if (data.descricao?.en) getID(`editar-descricao-en-${j}`).value = data.descricao.en;

        _showToast("Fields imported from Google Maps ✓", "success");
    } catch (e) {
        _showToast("Could not reach proxy (localhost:8765). Is it running?", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="iconify color-icon edit" data-icon="mdi:map-search"></i>';
    }
}
```

### Production Flip (Future)

One-line change when ready:

```javascript
const PROXY_URL = window.location.hostname === "localhost"
    ? "http://localhost:8765"
    : "https://us-central1-your-project.cloudfunctions.net/places-proxy";
```

---

## Emoji Mapping (Places API `types`)

```
Google type            → Emoji
─────────────────────────────
restaurant, food       → 🍽️
cafe                   → ☕
bar                    → 🍸
night_club             → 🪩
museum                 → 🏛️
tourist_attraction     → 📸
park, natural_feature  → 🌳
beach                  → 🏖️
lodging                → 🏨
shopping_mall, store   → 🛍️
bakery                 → 🥐
church, place_of_worship → ⛪
art_gallery            → 🎨
movie_theater          → 🎬
stadium                → 🏟️
aquarium               → 🐠
zoo                    → 🦁
amusement_park         → 🎢
spa                    → 💆
gym                    → 🏋️
book_store             → 📚
airport                → ✈️
train_station          → 🚆
bus_station            → 🚌
subway_station         → 🚇
(fallback)             → 📍
```

---

## Setup

```bash
# 1. Install dependencies
cd scripts
pip install -r requirements.txt

# 2. Get a Google Cloud API key
#    → https://console.cloud.google.com/apis/credentials
#    → Enable: Places API (and Geocoding API)

# 3. Set your key
cp .env.example .env
# Edit .env → paste your key

# 4. Start the proxy
python places-proxy-server.py
# → http://localhost:8765

# 5. Open the app on localhost, paste a Maps URL, click import
```

---

## Implementation Checklist

### Proxy Server

- [ ] Create `scripts/.env.example` (committed)
- [ ] Add `scripts/.env` to `.gitignore`
- [ ] Create `scripts/requirements.txt` (`requests`, `python-dotenv`)
- [ ] Create `scripts/places-proxy-server.py`:
  - [ ] `.env` loading + key validation
  - [ ] Short URL resolution
  - [ ] Place ID extraction (`!19s`, `place_id`, `ftid`)
  - [ ] Find Place From Text fallback
  - [ ] Place Details API call
  - [ ] `normalize()` — API response → destination format
  - [ ] `suggest_emoji()` — `types[]` → emoji
  - [ ] HTTP handler with CORS
- [ ] Test with real Maps URLs (restaurant, museum, bar, hotel)

### Frontend (localhost only)

- [ ] Add import button in `_getEditHTML()` gated by `localhost` check
- [ ] Add `_importFromMapsURL(j)` in `editar-destino.js`
- [ ] Wire up field population (name, website, emoji, region, price, description)
- [ ] Toast notifications for success / error / server-down states
- [ ] CSS for import button (if needed)

### Documentation

- [ ] Setup instructions (here + README)

---

## Production Migration

When ready to deploy:

1. **Create Cloud Function** (near-copy of the proxy server)
   - Set key via `firebase functions:config:set google_maps.api_key="..."`
   - Read from `process.env.GOOGLE_MAPS_API_KEY`

2. **Flip frontend URL** — `localhost:8765` → Cloud Function URL

3. **Restrict API key** in Google Cloud Console (HTTP referrer or IP)

Same architecture, no refactors needed.

---

## Limitations

- **Billing required**: Google requires a billing account for the API key, but the $200/month free tier covers ~8,000 place detail calls — you'll never exceed this for personal use.
- **No Instagram**: Not in Places API.
- **Description quality**: `editorial_summary.overview` is a short blurb; not always present for every place.
- **Price level**: Comes as 0–4 scale; mapped to €/€€/€€€ but may not match your personal value scale.
- **PT description**: Only English from the API. Portuguese description stays blank for manual fill (or pipe through a free translation API later).
