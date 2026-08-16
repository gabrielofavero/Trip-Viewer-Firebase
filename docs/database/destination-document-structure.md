# Destination Firestore Document Structure

> **Collection path:** `destinations/{destId}`
>
> Destination documents store curated location guides — restaurants, bars, cafés, shops, and tourist attractions grouped by category. Each destination is a standalone document (no subcollections).

---

## Top-Level Document Fields

### `title` — `string`
Display title of the destination (e.g. `"Rio de Janeiro"`, `"São Paulo"`).

### `currency` — `string`
3-letter currency code (e.g. `"BRL"`, `"EUR"`, `"USD"`). Used for price display across all category entries.

### `myMaps` — `string`
Google My Maps URL for the destination. Empty string if not set.

### `image` — `DestinationImage`
```ts
{
  background: string;   // background/hero image URL
  active:     boolean;  // whether the image section is active
}
```

> **Note:** `image` may be absent in legacy documents created before July 2026. Migration 15 (Step 5) populates missing fields with `{ active: false, background: "" }`.

### `modules` — `DestinationModules`
Feature toggles controlling which category sections are visible in the destination viewer.

```ts
{
  restaurants: boolean;
  snacks:      boolean;
  nightlife:   boolean;
  tourism:     boolean;
  shopping:    boolean;
  map:         boolean;  // whether the My Maps link section is active
}
```

### `sharing` — `Sharing`
```ts
{
  owner:   string;    // Firebase Auth UID of the destination owner
  active:  boolean;   // always true
  editors: string[];  // always empty (destinations aren't independently shared)
}
```

### `version` — `Version`
```ts
{
  lastUpdated: string;  // ISO 8601 timestamp, e.g. "2026-01-05T15:44:30.804Z"
}
```

---

## Category Fields

Each category is a top-level field containing a map of entry ID → entry object. Empty categories are `{}`.

| Category | Field | Description |
|---|---|---|
| Restaurants | `restaurants` | Full-service dining |
| Snacks | `snacks` | Cafés, bakeries, brunch spots, fast food |
| Nightlife | `nightlife` | Bars, pubs, clubs |
| Tourism | `tourism` | Tourist attractions, landmarks, museums |
| Shopping | `shopping` | Shops, markets, malls |

### Entry Object (`DestinationEntry`)

Each entry is keyed by a random alphanumeric ID (e.g. `"raXEw"`, `"jBFnV"`).

```ts
interface DestinationEntry {
  isNew:       boolean;  // whether this entry is marked as "new" / recently added
  createdAt:   string;   // ISO 8601 timestamp of creation
  name:        string;   // display name (e.g. "Taste Lab", "Arp Bar")
  emoji:       string;   // emoji icon for the entry (e.g. "🍴", "🥙", "☕🧇")
  description: Description;  // multi-language description (see below)
  website:     string;   // official website URL, or empty string
  map:         string;   // Google Maps URL
  placeAPI:    PlaceAPI;  // normalized Places API data (see below)
  instagram:   string;   // Instagram profile URL, or empty string
  regions:     string[]; // one or more neighborhoods/areas within the destination (e.g. ["Ipanema", "Botafogo"])
  media:       string;   // TikTok or YouTube embed URL, or empty string
  price:       string;   // price indicator: "$", "$$", "$$$", "$$$$", or free-text
  rating:      string;   // numeric rating as string: "1"–"5", or empty string
  images:      EntryImage[];  // images attached to this place (see below)
}
```

> **Note:** The `placeAPI` field may be absent in entries created before August 2026. Always guard with `typeof entry.placeAPI?.id === 'string'` or optional chaining. Migration 17 backfills missing `placeAPI` with an empty template.
>
> **Note:** `regions` was added in August 2026 (Migration 19). Entries created before then stored a single `region` string; Migration 19 converts it to a one-element `regions` array and removes the legacy `region` field.

### `PlaceAPI` — Places API Data

Added August 2026. Stores a subset of the output of `scripts/export-maps-data/export-maps-data.py` (the app's destination format produced from Google Places API data) — only the actual place-data fields. The app-managed `media`/`isNew` are omitted, and `updatedAt` (instead of the script's `createdAt`) tracks the last Places API sync. Entries created before this date may lack the field; Migration 17 backfills with an empty template.

```ts
interface PlaceAPI {
  region:      string;  // neighborhood/area (e.g. "Ipanema", "Botafogo")
  name:        string;  // display name (e.g. "Taste Lab", "Arp Bar")
  website:     string;  // official website URL, or empty string
  rating:      string;  // numeric rating as string: "1"–"5", or empty string
  price:       string;  // price indicator: "$", "$$", "$$$", "$$$$", or "-"
  description: Description;  // multi-language description
  emoji:       string;  // emoji icon for the entry (e.g. "🍴", "🥙", "☕🧇")
  map:         string;  // Google Maps URL
  updatedAt:   string;  // ISO 8601 timestamp of the last Places API sync
  instagram:   string;  // Instagram profile URL, or empty string
  id:          string;  // Google Place ID used for Places API lookups, or empty string
}
```
```

> **Note:** The `placeAPI` field may be absent in entries created before August 2026. Always guard with optional chaining (e.g. `entry.placeAPI?.id`). Migration 17 backfills missing `placeAPI` with an empty template.

### `EntryImage` — Entry Images

Added August 2026. Each entry may hold up to 5 images (same shape as trip accommodation images). Entries created before this date may lack the field; Migration 15 (Phase 3) backfills with `[]`.

```ts
interface EntryImage {
  description: string;  // caption for the image, or empty string
  link:        string;  // image URL
}
```

### `Description` — Multi-Language

```ts
interface Description {
  pt?: string;  // Portuguese description
  en?: string;  // English description
  // other language codes may be added in the future
}
```

At minimum, `pt` is always present. English (`en`) is set when the user provides an English translation via the description modal.

---

## Complete Example

```json
{
  "title": "Rio de Janeiro",
  "currency": "BRL",
  "myMaps": "https://www.google.com/maps/d/viewer?mid=1I57N4Q2LvrLCwCz9wKFwIv3TqvFDBN4H&usp=sharing",
  "image": {
    "background": "https://example.com/rio-hero.jpg",
    "active": true
  },
  "modules": {
    "restaurants": true,
    "snacks": true,
    "nightlife": true,
    "tourism": true,
    "shopping": false,
    "map": true
  },
  "sharing": {
    "owner": "eySHdjIyK0MNAgiPU77xE0d1CTjp",
    "active": true,
    "editors": []
  },
  "version": {
    "lastUpdated": "2026-01-05T15:44:30.804Z"
  },
  "restaurants": {
    "raXEw": {
      "isNew": false,
      "createdAt": "2026-01-05T15:44:00.804Z",
      "name": "Taste Lab",
      "emoji": "🍴",
      "description": {
        "pt": "Espaço Gourmet com muitas opções de chefs premiados."
      },
      "website": "",
      "map": "https://maps.app.goo.gl/1P5phcxjkkTCjCJs8",
      "placeAPI": {
        "region": "",
        "name": "",
        "website": "",
        "rating": "",
        "price": "",
        "description": {
          "en": "",
          "pt": ""
        },
        "emoji": "",
        "map": "",
        "updatedAt": "",
        "instagram": "",
        "id": ""
      },
      "instagram": "",
      "regions": ["Cachambi"],
      "media": "https://www.tiktok.com/@erikagentille/video/7258423588607495429",
      "price": "$$$",
      "rating": "4",
      "images": [
        {
          "description": "Fachada do restaurante",
          "link": "https://example.com/taste-lab.jpg"
        }
      ]
    }
  },
  "snacks": {
    "2K9Gu": {
      "isNew": false,
      "createdAt": "2026-01-05T15:44:09.804Z",
      "name": "Kebab Shop",
      "emoji": "🍢",
      "description": {
        "pt": "Fast Food Árabe. Bom para refeições informais e delivery"
      },
      "website": "",
      "map": "https://maps.app.goo.gl/AE8n8eMBS354kjmo8",
      "placeAPI": {
        "region": "",
        "name": "",
        "website": "",
        "rating": "",
        "price": "",
        "description": {
          "en": "",
          "pt": ""
        },
        "emoji": "",
        "map": "",
        "updatedAt": "",
        "instagram": "",
        "id": ""
      },
      "instagram": "https://www.instagram.com/kebabshop.br/",
      "regions": ["Leblon"],
      "media": "https://www.tiktok.com/@caroolnigro/video/7330085048646946053",
      "price": "$",
      "rating": "3",
      "images": []
    }
  },
  "nightlife": {},
  "tourism": {},
  "shopping": {}
}
```

---

## Firestore Path Summary

```
destinations/
└── {destId}                        ← Destination document (self-contained, no subcollections)
```

---

## User Summary Subcollection

Each destination also has a lightweight summary document used by the index page (home screen cards). These live under the user document:

```
users/{uid}/destinationSummaries/{destId}
```

### Summary Document Fields

```ts
{
  title:    string;              // destination title
  currency: string;              // 3-letter currency code
  image:    DestinationImage;    // image object (same shape as main doc)
  version:  { lastUpdated: string };  // ISO 8601 timestamp
}
```

> **Note:** Summaries created before July 2026 may not have the `image` field. Migration 15 (Step 5) adds it with default values.

### Denormalized metadata on trip docs

Trip documents also cache a lightweight copy of destination metadata at `trips/{id}.destinationRefs[i]` (since **August 2026**, migration 18 + trip save) so `view.html` can render the destination section without fetching the destination document on load: `{ id, title, image, categories, version }`. The `categories` object holds per-category **“has entries”** booleans — **not** this document's editor-side `modules` toggles. See `docs/database/trip-document-structure.md` for the full `DestinationRef` shape.

---

## Key Differences: Destination vs Trip

| Aspect | Destination | Trip |
|---|---|---|
| Subcollections | None | `accommodations`, `transportation`, `itinerary` |
| Entry images | `images` per entry (up to 5, link/URL) | `images` per accommodation (up to 5, link/URL) |
| Protected data | None | PIN-protected reservation codes/links |
| Categories | Inline entries in the doc itself | Category toggles only (`modules`) |
| Images | Single `image` object (background only) | Single `image` object |
| Dates | None | `start` / `end` DateObjects |
| Travelers | None | `travelers` array |
| Links | Only `myMaps` (single URL) | `links` object with multiple URLs |
| Colors | None | `colors` object with theme support |
| Visibility | None | `visibility` object (light/dark mode) |
| PIN | None | `pin` field for sensitive data protection |
