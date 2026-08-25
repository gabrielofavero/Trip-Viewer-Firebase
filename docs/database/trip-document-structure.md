# Trip Firestore Document Structure (Non-Protected)

> **Collection path:** `trips/{tripId}`
>
> This document contains all **non-sensitive** trip data. Sensitive fields (`reservation` codes, `link` URLs on accommodations and transport legs) are stored empty here and mirrored in the protected subcollection at `trips/protected/{pin}/{tripId}`.

---

## Top-Level Document Fields

### `title` — `string`
Display title of the trip (e.g. `"Eurotrip Bibs & Gui"`).

### `currency` — `string`
3-letter currency code (e.g. `"BRL"`, `"EUR"`, `"USD"`).

### `start` / `end` — `DateObject`
Trip date boundaries.

```ts
interface DateObject {
  day:    number;   // 1–31
  month:  number;   // 1–12
  year:   number;
  hour:   number;   // 0–23
  minute: number;   // 0–59
  second?: number;  // 0–59 — may be absent in some legacy documents
}
```

### `pin` — `"sensitive-only"` | `"no-pin"`
- `"sensitive-only"` — trip has a PIN protecting reservation codes/links.
- `"no-pin"` — no sensitive data protection.

### `version` — `TripVersion`
```ts
{
  lastUpdated: string;  // ISO 8601 timestamp, e.g. "2026-02-04T02:16:29.222Z"
}
```

### `visibility` — `TripVisibility`
```ts
{
  light: boolean;  // visible in light theme
  dark:  boolean;  // visible in dark theme
}
```

### `colors` — `TripColors`
```ts
{
  light:  string;  // hex color for light theme (e.g. "#966313")
  dark:   string;  // hex color for dark theme
  active: boolean; // whether custom colors are active
}
```

### `sharing` — `TripSharing`
```ts
{
  owner:   string;    // Firebase Auth UID of the trip owner
  active:  boolean;   // whether sharing is enabled
  editors: string[];  // array of editor UIDs
}
```

### `modules` — `TripModules`
Feature toggles controlling which sections are visible in the trip viewer.

```ts
{
  destinations:   boolean;
  transportation: boolean;
  itinerary:      boolean;
  gallery:        boolean;
  summary:        boolean;
  accommodations: boolean;
  expenses:       boolean;
  lineup?:        boolean;  // Legacy — music festival lineup toggle
}
```

### `travelers` — `Traveler[]`
```ts
/** A traveler/person on a trip. The `id` may be missing in legacy documents. */
interface Traveler {
  id?:  string;   // random alphanumeric ID (e.g. "LerZT") — may be absent in older docs
  name: string;   // display name (e.g. "Bibs") — may be empty string
}
```

### `links` — `TripLinks`
External resource URLs, all stored as strings (empty string if not set).

```ts
{
  maps:        string;
  attachments: string;
  active:      boolean;  // whether links section is active
  drive:       string;
  pdf:         string;
  ppt:         string;
  sheet:       string;
  vaccine:     string;
}
```

### `gallery` — `TripGallery`
```ts
{
  categories:  string[];  // category labels
  descriptions: string[]; // image descriptions
  images:      string[];  // image URLs
  titles:      string[];  // image titles
}
```

### `destinationRefs` — `DestinationRef[]`
Slim references to destination documents. Since **August 2026** (migration 18 + trip save), each entry carries a **denormalized copy** of the destination's lightweight metadata so `view.html` can render the destinations section **without fetching each `destinations/{id}` document on load**. The destination document remains the source of truth; this copy is a cache refreshed on trip save and via migration 18.

```ts
interface DestinationRef {
  id:         string;   // Firestore document ID from the "destinations" collection
  title?:     string;   // cached destination title
  image?:     DestinationImage;      // cached destination hero image ({ background, active })
  categories?: DestinationCategories;  // cached per-category "has entries" booleans
  version?:   DestinationVersion;    // cached destination version ({ lastUpdated })
}

interface DestinationCategories {
  restaurants: boolean;  // true = category has ≥1 entry → box shown on view.html
  snacks:      boolean;
  nightlife:   boolean;
  tourism:     boolean;
  shopping:    boolean;
}
```

> **Note:** the `categories` booleans mean **“has entries”** (derived from the destination's category maps) — they are **not** the destination document's editor-side `modules` toggles. `view.html` shows a category box when its boolean is true (see `shouldShowDestinationCategory` in `pages/trip-detail/categories/destination.ts`). Older trip docs may lack these fields until migration 18 is run or the trip is re-saved.

### `image` — `TripImage`

```ts
{
  dark:       string;   // dark-theme image URL
  light:      string;   // light-theme image URL
  background: string;   // fallback/background image URL
  active:     boolean;  // whether the image section is active
}
```

---

## Subcollections

All subcollections live under `trips/{tripId}/`. They were migrated out of the trip document's embedded arrays during Phase 1 of the English migration.

### 1. `accommodations/{accId}` — `Accommodation`

Each accommodation is a separate document keyed by its random alphanumeric ID (preserved from the old embedded array).

```ts
interface Accommodation {
  name:        string;
  description: string;
  address:     string;
  dates: {
    checkIn:  DateObject;
    checkOut: DateObject;
  };
  breakfast:   boolean;
  images: {
    description: string;
    link:        string;  // image URL
  }[];
  reservation: string;  // EMPTY in non-protected doc (sensitive)
  link:        string;  // EMPTY in non-protected doc (sensitive)
  paymentStatus?: "" | "prepaid" | "pay_on_site";  // F065 — optional, back-compat
}
```

> **Payment status (F065):** `paymentStatus` is **optional** — a missing field is treated as "don't show" (back-compat, no migration strictly required). Values: `""` = don't show (default), `"prepaid"` = paid in advance, `"pay_on_site"` = pay at the destination. Migration 21 backfills `""` into existing accommodation docs; the edit page writes it on save and `view.html` renders a colored indicator (green = prepaid, amber = pay on site).

> **Sensitive fields:** `reservation` and `link` are always empty strings (`""`) in the non-protected document. Their real values are stored in the protected subcollection at `trips/protected/{pin}/{tripId}` under `hospedagens[accId]`.

---

### 2. `transportation/{legId}` — `TransportLeg`

Each transport leg is a separate document. One special document exists:

| Document ID | Purpose |
|---|---|
| `_settings` | Stores the global transportation view mode |
| `{legId}` | Individual transport leg (random 5-char ID) |

#### `_settings` document
```ts
{
  viewMode: "simple" | "leg";  // "simple" = list view, "leg" = map-style legs
}
```

#### Leg documents
```ts
interface TransportLeg {
  type:        "flight" | "bus" | "car" | "bullet_train";  // and potentially others
  company:     string;         // airline/bus company name (e.g. "latam", "klm", "eurostar")
  points: {
    origin:      string;       // departure city/station name
    destination: string;       // arrival city/station name
  };
  dates: {
    departure: DateObject;
    arrival:   DateObject;
  };
  duration:    string;         // "HH:MM" format (e.g. "14:35", "01:08")
  direction:   "departure" | "return" | "during";
  reservation: string;         // EMPTY in non-protected doc (sensitive)
  link:        string;         // EMPTY in non-protected doc (sensitive)
  person:      string;         // traveler name this leg belongs to
}
```

> **Sensitive fields:** `reservation` and `link` are always empty strings in the non-protected document. Their real values are stored in the protected subcollection under `transportes[legId]`.

---

### 3. `itinerary/{dayId}` — `ItineraryDay`

Each day of the itinerary is a separate document. The document ID is the date in `YYYYMMDD` format (e.g. `"20260307"` for March 7, 2026). If two entries share the same date, a random 3-char suffix is appended (e.g. `"20260307-x9k"`).

```ts
interface ItineraryDay {
  title: {
    value:            string;   // display title or destination ID
    showDestinations: boolean;
    translate:        boolean;
  };
  date:          DateObject;
  destinationIds: (string | { id: string; title: string })[];  // can be plain IDs or objects with id+title
  earlyMorning:  PeriodItem[];    // usually empty, sometimes has transport
  morning:       PeriodItem[];
  afternoon:     PeriodItem[];
  night:         PeriodItem[];
}
```

#### `PeriodItem` (an entry in any time period)
```ts
interface PeriodItem {
  label:     string;           // display label (e.g. "Dam Square", "Check In")
  start:     string;           // "HH:MM" or empty string
  end:       string;           // "HH:MM" or empty string
  travelers: PeriodTraveler[];
  item: {
    type:     "destination" | "transportation" | "accommodation" | "";  // type of referenced item (empty string when none)
    id:       string;          // document ID of the referenced item, or empty
    category: string;          // for destinations: "tourism" | "restaurants" | "shopping" | "nightlife" | "snacks"
    location: string;          // destination document ID this item belongs to, or empty
  };
}
```

#### `PeriodTraveler`
```ts
interface PeriodTraveler {
  id:        string;           // traveler ID or destination ID (for context)
  name:      string;           // traveler name or destination title (for context)
  isPresent: boolean;          // whether this traveler is present for this activity
}
```

> **Note on `travelers` in period items:** The first entry in the `travelers` array may be a destination context object (with `id` = destination ID, `title` = destination title) rather than an actual traveler. This provides UI context about which destination the activity belongs to.

---

## Protected Data Structure

When `pin` is `"sensitive-only"`, sensitive fields are stored in a parallel protected subcollection.

### Path: `trips/protected/{pin}/{tripId}`

```ts
{
  accommodations: {
    [accId: string]: {
      reservation: string;  // reservation code/number
      link:        string;  // booking link URL
    }
  };
  transportation: {
    [legId: string]: {
      reservation: string;  // reservation code/number
      link:        string;  // booking link URL
    }
  };
  pin: "sensitive-only";
}
```

> **Note:** Despite documentation previously referencing Portuguese field names (`hospedagens`, `transportes`, `reserva`), the actual protected subcollection uses **English** field names (`accommodations`, `transportation`, `reservation`), matching the Phase 1 English migration.

### Path: `expenses/protected/{pin}/{tripId}`

Expenses for PIN-protected trips are stored in the `expenses/protected/{pin}` subcollection. Each document contains the full expenses data (same shape as the non-protected `expenses/{tripId}` document).

A lookup document at `protected/{tripId}` stores:
```ts
{
  pin:     string;   // the PIN value
  sharing: {         // trip sharing metadata (owner, active, editors)
    owner:   string;
    active:  boolean;
    editors: string[];
  };
}
```

The `expenses/{tripId}` document itself is a separate top-level collection (not a subcollection of the trip). It stores:
```ts
{
  duringTrip: ExpenseEntry[];  // expenses during the trip
  preTrip:    ExpenseEntry[];  // pre-trip expenses
  budget:     Record<string, unknown>;
  version:    { lastUpdated: string };
}
```

---

## Complete Example (Minimal Non-Protected Trip Document)

```json
{
  "title": "Eurotrip Bibs & Gui",
  "currency": "BRL",
  "start": { "day": 6, "month": 3, "year": 2026, "hour": 0, "minute": 0, "second": 0 },
  "end":   { "day": 18, "month": 3, "year": 2026, "hour": 0, "minute": 0, "second": 0 },
  "pin": "sensitive-only",
  "version": { "lastUpdated": "2026-02-04T02:16:29.222Z" },
  "visibility": { "light": true, "dark": true },
  "colors": { "light": "#966313", "dark": "#966313", "active": true },
  "sharing": { "owner": "eySHdjIyK0MNAgiPU77xE0d1CTjp", "active": true, "editors": [] },
  "modules": {
    "destinations": true, "transportation": true, "itinerary": true,
    "gallery": false, "summary": true, "accommodations": true, "expenses": true
  },
  "travelers": [
    { "id": "LerZT", "name": "Bibs" },
    { "id": "vII26", "name": "Gui" }
  ],
  "links": {
    "maps": "", "attachments": "", "active": false,
    "drive": "", "pdf": "", "ppt": "", "sheet": "", "vaccine": ""
  },
  "gallery": { "categories": [], "descriptions": [], "images": [], "titles": [] },
  "destinationRefs": [
    { "id": "qXZaRbv9of3kVN1Bqc43" },
    { "id": "VY7WMSjrE1RMeCoEl4BR" },
    { "id": "sslfb6sym7NszJdHKav7" },
    { "id": "3VcMSqpuTBV3sK7Le8fU" }
  ],
  "image": {
    "dark": "",
    "light": "",
    "background": "https://example.com/hero.jpg",
    "active": true
  }
}
```

---

## Firestore Path Summary

```
trips/
├── {tripId}                        ← Trip document (non-protected, this doc)
│   ├── accommodations/
│   │   ├── {accId}                 ← Accommodation
│   │   └── ...
│   ├── transportation/
│   │   ├── _settings               ← TransportSettings (viewMode)
│   │   ├── {legId}                 ← TransportLeg
│   │   └── ...
│   └── itinerary/
│       ├── {YYYYMMDD}              ← ItineraryDay
│       └── ...
├── protected/
│   └── {pin}/
│       └── {tripId}                ← Protected sensitive data
│
expenses/
├── {tripId}                        ← Expenses document
└── protected/
    └── {pin}/
        └── {tripId}                ← Protected expenses (full document)

protected/
├── {tripId}                        ← PIN lookup ({ pin, sharing })
└── _placeholder                    ← Placeholder doc (ensures collection exists)
```

---

## Key Differences: Old (Embedded) vs New (Subcollection)

| Aspect | Old (pre-migration) | New (current) |
|---|---|---|
| Accommodations | `accommodations` array in trip doc | `accommodations/{id}` subcollection docs |
| Transportation legs | `transportation.data[]` array in trip doc | `transportation/{legId}` subcollection docs |
| Transportation settings | `transportation.viewMode` in trip doc | `transportation/_settings` doc |
| Itinerary days | `itinerary[]` array in trip doc | `itinerary/{dayId}` subcollection docs |
| Trip doc field names | Portuguese (`titulo`, `inicio`, `fim`, …) | English (`title`, `start`, `end`, …) |
| Top-level collections | `usuarios`, `viagens`, `destinos`, `listagens`, `gastos`, `protegido` | `users`, `trips`, `destinations`, `listings`, `expenses`, `protected` |
