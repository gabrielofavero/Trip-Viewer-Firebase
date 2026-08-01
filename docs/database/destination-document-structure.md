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
  instagram:   string;   // Instagram profile URL, or empty string
  region:      string;   // neighborhood/area within the destination (e.g. "Ipanema", "Botafogo")
  media:       string;   // TikTok or YouTube embed URL, or empty string
  price:       string;   // price indicator: "$", "$$", "$$$", "$$$$", or free-text
  rating:      string;   // numeric rating as string: "1"–"5", or empty string
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
      "instagram": "",
      "region": "Cachambi",
      "media": "https://www.tiktok.com/@erikagentille/video/7258423588607495429",
      "price": "$$$",
      "rating": "4"
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
      "instagram": "https://www.instagram.com/kebabshop.br/",
      "region": "Leblon",
      "media": "https://www.tiktok.com/@caroolnigro/video/7330085048646946053",
      "price": "$",
      "rating": "3"
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

---

## Key Differences: Destination vs Trip

| Aspect | Destination | Trip |
|---|---|---|
| Subcollections | None | `accommodations`, `transportation`, `itinerary` |
| Protected data | None | PIN-protected reservation codes/links |
| Categories | Inline entries in the doc itself | Category toggles only (`modules`) |
| Images | Single `image` object (background only) | Single `image` object |
| Dates | None | `start` / `end` DateObjects |
| Travelers | None | `travelers` array |
| Links | Only `myMaps` (single URL) | `links` object with multiple URLs |
| Colors | None | `colors` object with theme support |
| Visibility | None | `visibility` object (light/dark mode) |
| PIN | None | `pin` field for sensitive data protection |
