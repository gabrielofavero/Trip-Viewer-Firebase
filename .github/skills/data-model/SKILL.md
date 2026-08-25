---
name: data-model
description: 'Use when you need to understand the Firestore data model — trip/expense document schemas, the PIN-based two-tier protected storage pattern, Firestore security rules, subcollection structure, or how collections relate to each other. Always consult this skill before modifying any data access code, writing migrations, or answering questions about the database schema.'
---

# Data Model & Firestore Schema

TripViewer uses Firebase Firestore with a **two-tier PIN-protected architecture**. Public fields live in the main document; sensitive fields (reservation codes, booking links) are stored in a parallel `protected/{pin}/{id}` subcollection.

---

## Collections Overview

| Collection | Doc ID | Purpose |
|---|---|---|
| `admin` | `admin` | List of admin UIDs (`{ admins: string[] }`) |
| `config` | `system` | Global config (`{ registrationOpen: boolean }`) |
| `users` | `{authUid}` | User profile (`name`, `email`, `photoURL`) with `destinationSummaries`, `tripSummaries`, `listingSummaries` subcollections |
| `trips` | `{tripId}` | Trip document (non-sensitive fields) |
| `trips/{tripId}/accommodations` | `{accId}` | Accommodation sub-documents |
| `trips/{tripId}/transportation` | `{legId}` | Transport leg sub-documents (+ `_settings` doc) |
| `trips/{tripId}/itinerary` | `{dayId}` | Itinerary day documents (ID = `YYYYMMDD` or `YYYYMMDD-xxx`) |
| `trips/protected/{pin}/{tripId}` | — | Protected sensitive data (reservation codes, links) |
| `expenses` | `{tripId}` | Expenses document (matches parent trip ID) |
| `expenses/protected/{pin}/{tripId}` | — | Protected expenses for PIN-enabled trips |
| `destinations` | `{destId}` | Destination documents (self-contained, no subcollections) |
| `users/{uid}/destinationSummaries` | `{destId}` | Lightweight destination summary for index cards |
| `listings` | `{listingId}` | Listing documents |
| `protected` | `{tripId}` | PIN lookup (`{ pin: string, sharing: { owner, active, editors } }`) |\n| `protected` | `_placeholder` | Placeholder document to ensure collection exists |
| `admin/permissions` | `{userId}` | Per-user permission flags (existence = granted) |

### Permissions (`admin/permissions/{type}/{uid}`)

Each permission is a subcollection under `admin/permissions` — **document existence = permission granted** (e.g. a doc at `admin/permissions/upload/{uid}` means that UID can upload). The app reads them via `getPermissions()` in `public/assets/ts/data/firebase/database.ts`.

| Permission | Purpose |
|---|---|
| `upload` | Can upload images to Storage |
| `unlimitedUploadSize` | Bypasses the image upload size limit |
| `canUsePlacesAPI` | Can use the Google Places API (added Aug 2026, migration 17) |

Granting = creating the doc (e.g. `{ _created: <server timestamp> }`) at `admin/permissions/{type}/{uid}`. `initLocalDb` grants `upload`, `unlimitedUploadSize` and `canUsePlacesAPI` to the initialized user.

---

## User Document (`users/{uid}`)

```ts
{
  name:     string   // display name — from Auth displayName
  email:    string   // email address — from Auth email
  photoURL: string   // avatar URL — from Auth photoURL
  trips:    []       // embedded arrays (legacy; kept empty, summaries live in subcollections)
  destinations: []
  listings: []
  // + subcollections: tripSummaries, destinationSummaries, listingSummaries
}
```

The profile fields (`name`, `email`, `photoURL`) were added in **August 2026** (Migration 16) and are sourced from the matching Firebase Auth user record (`displayName`, `email`, `photoURL`).

### Profile Field Read Order (DB-first, Auth fallback)

The app reads profile fields **from Firestore first**, and only falls back to the Auth user when a field is missing:

- `public/assets/ts/pages/home/support/data.ts` → `loadUserIndex()`:
  ```ts
  const userData = await getUserData(user.uid);
  const displayName = userData?.name || user.displayName || '';
  const email = userData?.email || user.email || '';
  const photo = userData?.photoURL || user.photoURL || '';
  ```
- `public/assets/ts/data/firebase/auth.ts` → `registerIfUserNotPresent()` writes `name`/`email`/`photoURL` (from the Auth user) when creating a new user document.
- Migration 16 backfills existing user documents from Auth so the DB copy is complete.

> **Why:** the Firestore user document is the source of truth for the UI; Auth is only a fallback for users whose doc predates Migration 16 or lacks a field.

---

## Trip Document (`trips/{tripId}`)

### Top-Level Fields

```
title            string              Display title
currency         string              3-letter code (BRL, EUR, USD)
start            DateObject          Trip start
end              DateObject          Trip end
pin              "sensitive-only" | "no-pin"
version          { lastUpdated: string }   ISO 8601
visibility       { light: bool, dark: bool }
colors           { light: hex, dark: hex, active: bool }
sharing          { owner: uid, active: bool, editors: uid[] }
modules          { destinations, transportation, itinerary, gallery, summary, accommodations, expenses: bool, lineup?: bool }
travelers        { id?: string, name: string }[]   // id may be missing in legacy docs
links            { maps, attachments, active, drive, pdf, ppt, sheet, vaccine: string }
gallery          { categories[], descriptions[], images[], titles[] }
destinationRefs  { id, title?, image?, categories?, version? }[]   Denormalized destination metadata (migration 18 + trip save) — see below
image            { dark, light, background: string, active: bool }
```

### DateObject

```ts
{ day: number, month: number, year: number, hour: number, minute: number, second: number }
```

### DestinationRef Metadata (denormalized, Aug 2026)

Since migration 18 and trip save, each `destinationRefs[i]` entry may carry a copy of the destination's lightweight metadata so `view.html` renders the destinations section **without fetching the destination documents**:

```ts
{
  id: string,
  title?: string,                       // destination title
  image?: { background: string, active: boolean },
  categories?: {                        // per-category "has entries" booleans
    restaurants: boolean,
    snacks: boolean,
    nightlife: boolean,
    tourism: boolean,
    shopping: boolean,
  },
  version?: { lastUpdated: string },
}
```

> **Important:** `categories` means **“has entries”** (derived from the destination's category maps) — **not** the destination document's editor-side `modules` toggles (those are only read by `edit-destination`). `view.html` shows a category box when its boolean is `true` (`shouldShowDestinationCategory` in `pages/trip-detail/categories/destination.ts`). Legacy refs are just `{ id }` — guard with optional chaining.

### Subcollection: `accommodations/{accId}`

```ts
{
  name, description, address: string
  dates: { checkIn: DateObject, checkOut: DateObject }
  breakfast: boolean
  images: { description: string, link: string }[]
  reservation: ""   // EMPTY — real value in protected subcollection
  link: ""           // EMPTY — real value in protected subcollection
  paymentStatus?: "" | "prepaid" | "pay_on_site"   // F065 — ""/missing = don't show (default)
}
```

- `paymentStatus` is optional (back-compat): a missing field renders nothing on view.html.
  - `""` (default / back-compat) → don't show any payment info
  - `"prepaid"` → show "Prepaid" indicator
  - `"pay_on_site"` → show "Pay on destination" indicator

### Subcollection: `transportation/{legId}`

```ts
{
  type: "flight" | "bus" | "car" | "bullet_train" | ...
  company: string
  points: { origin: string, destination: string }
  dates: { departure: DateObject, arrival: DateObject }
  duration: "HH:MM"
  direction: "departure" | "return" | "during"
  reservation: ""   // EMPTY — real value in protected subcollection
  link: ""           // EMPTY — real value in protected subcollection
  person: string     // traveler name
}
```

Also has a `_settings` document: `{ viewMode: "simple" | "leg" }`.

### Subcollection: `itinerary/{dayId}`

```ts
{
  title: { value: string, showDestinations: bool, translate: bool }
  date: DateObject
  destinationIds: (string | { id: string; title: string })[]  // can be plain IDs or objects
  earlyMorning, morning, afternoon, night: PeriodItem[]
}
// PeriodItem:
{ label: string, start: "HH:MM", end: "HH:MM",
  travelers: { id, name: string, isPresent: bool }[],
  item: { type: "destination"|"transportation"|"accommodation"|"", id, category, location: string }
}
```

---

## Expenses Document (`expenses/{tripId}`)

```ts
{
  duringTrip: ExpenseEntry[]
  preTrip:    ExpenseEntry[]
  currency:   string               // 3-letter code, set from parent trip
  travelers:  Record<string, string>  // travelerId → travelerName
  sharing:    { owner: uid, active: true, editors: [] }
  version:    { lastUpdated: string }
  budget?:    Record<string, unknown>  // optional, rarely populated
}
// ExpenseEntry:
{ name: string, type: string, price: number, currency: string, person: string }
```

The `type` field stores **i18n translation keys** (e.g., `trip.transportation.type.flights`, `labels.entrertainment`, `trip.expenses.daily`), not raw labels.

---

## Destination Document (`destinations/{destId}`)

Destination documents are self-contained — no subcollections. They store curated location guides with category-grouped entries.

Full reference: `docs/database/destination-document-structure.md`

### Top-Level Fields

```ts
{
  title:    string              // display name (e.g. "Rio de Janeiro")
  currency: string              // 3-letter code (BRL, EUR, USD)
  myMaps:   string              // Google My Maps URL, or ""
  image:    { background: string, active: bool }
  modules:  { restaurants, snacks, nightlife, tourism, shopping, map: bool }
  sharing:  { owner: uid, active: true, editors: [] }
  version:  { lastUpdated: string }
  // + five category fields (see below)
}
```

### Category Fields

Each category is a map of `entryId → DestinationEntry`:

| Category | Field | Typical entries |
|---|---|---|
| Restaurants | `restaurants` | Full-service dining |
| Snacks | `snacks` | Cafés, bakeries, brunch, fast food |
| Nightlife | `nightlife` | Bars, pubs, clubs |
| Tourism | `tourism` | Attractions, landmarks, museums |
| Shopping | `shopping` | Shops, markets, malls |

Empty categories are `{}`.

### DestinationEntry

```ts
{
  isNew:       boolean    // marked as recently added
  createdAt:   string     // ISO 8601
  name:        string     // display name
  emoji:       string     // emoji icon (e.g. "🍴", "☕🧇")
  description: { pt?: string, en?: string }  // multi-language
  website:     string     // official URL or ""
  map:         string     // Google Maps URL
  placeAPI:    PlaceAPI   // normalized Places API data (added Aug 2026)
  instagram:   string     // Instagram profile URL or ""
  regions:     string[]   // one or more neighborhoods/areas (e.g. ["Ipanema", "Botafogo"])
  media:       string     // TikTok/YouTube embed URL or ""
  price:       string     // "$", "$$", "$$$", "$$$$", or free-text
  rating:      string     // "1"–"5", or ""
  images:      { description: string, link: string }[]  // up to 5 images per entry (added Aug 2026)
}
```

> **Note:** The `images` field may be absent in entries created before August 2026. Always guard with optional chaining or `Array.isArray(entry.images)`. Migration 15 (Phase 3) backfills missing `images` with `[]`.

> **Note:** The `placeAPI` object may be absent in entries created before August 2026. Always guard with optional chaining (e.g. `entry.placeAPI?.id`). Migration 17 backfills missing `placeAPI` with an empty template (subset of `scripts/export-maps-data/export-maps-data.py` output: `region`, `name`, `website`, `rating`, `price`, `description`, `emoji`, `map`, `updatedAt`, `instagram`, `id` — omits the app-managed `media`/`isNew` and uses `updatedAt` instead of the script's `createdAt`).

### `image` Field

New as of July 2026. Background image only (no per-theme logos):

```ts
{ background: string, active: boolean }
```

May be absent in legacy documents. Migration 15 (Step 5) backfills with `{ active: false, background: "" }`.

### User Summary Subcollection

Each destination has a lightweight summary at `users/{uid}/destinationSummaries/{destId}`:

```ts
{ title: string, currency: string, image: DestinationImage, version: { lastUpdated: string } }
```

These summaries power the index page destination cards. The `image` field was added July 2026.

---

## PIN-Based Protected Storage

The two-tier system works as follows:

| Trip PIN mode | Sensitive fields live at | Expenses live at |
|---|---|---|
| `"no-pin"` | N/A (no protected data) | `expenses/{tripId}` |
| `"sensitive-only"` | `trips/protected/{pin}/{tripId}` | `expenses/protected/{pin}/{tripId}` |

> **Note:** There is no `"all-data"` pin mode in current data. Only `"no-pin"` and `"sensitive-only"` exist.

Protected trip document structure:
```ts
// trips/protected/{pin}/{tripId}
{
  accommodations: { [accId]: { reservation: string, link: string } }
  transportation: { [legId]: { reservation: string, link: string } }
  pin: "sensitive-only"
}
```

A lookup document at `protected/{tripId}` stores `{ pin: string, sharing: { owner, active, editors } }` for locating the protected path.

---

## Firestore Security Rules Summary

| Rule | Effect |
|---|---|
| `canReadDoc()` | Owner OR admin OR sharing active |
| `canCreateDoc()` | Admin OR owner (from `request.resource.data.sharing.owner`) |
| `canUpdateDoc()` | Admin OR (owner AND same owner in before & after) |
| `isRegistrationOpen()` | Checks `config/system.registrationOpen` |
| Protected `/{pin}/{id}` reads | `allow read: if true` (anyone with the PIN) |
| Protected writes | Same as non-protected (`canCreateDoc`, `canUpdateDoc`) |

---

## How to Query Emulator Data

Use the **query-firestore** skill/tool:

```bash
# List all collections
node scripts/dev/query-firestore.js --list-collections

# Get a trip document
node scripts/dev/query-firestore.js --collection trips --json

# Get a trip with subcollections
node scripts/dev/query-firestore.js --collection trips --doc "tripId" --json

# Query expenses for a trip
node scripts/dev/query-firestore.js --collection expenses --doc "tripId" --json
```

---

## TypeScript Model Files

The canonical TypeScript interfaces are in `public/assets/ts/models/`:
- `trip.model.ts` — `Trip`, `Accommodation`, `TransportLeg`, `ItineraryDay`, etc.
- `expense.model.ts` — `ExpensesDoc`, `ExpenseEntry`
- `traveler.model.ts` — `Traveler`
- `destination.model.ts` — `Destination`, `DestinationEntry`
- `new-schema.ts` — Post-migration English field names

Service layer in `public/assets/ts/data/services/` wraps Firestore CRUD:
- `trip.service.ts`, `expense.service.ts`, `destination.service.ts`, `auth.service.ts`

### Database Documentation

Detailed document structure references in `docs/database/`:
- `trip-document-structure.md` — Trip document, subcollections, protected data
- `expenses-document-structure.md` — Expenses document structure
- `destination-document-structure.md` — Destination document, entry fields, summary subcollection

---

## Key Constraints to Remember

1. **PIN is stored in the path**, not the document — `protected/{pin}/{tripId}` means the PIN is part of the URL, making it readable by anyone who knows the PIN.
2. **Sensitive fields are always `""` in non-protected docs** — the real values only exist in the protected subcollection.
3. **Expenses document ID matches the trip ID** — they share the same key.
4. **Itinerary day IDs use `YYYYMMDD` format** — with random 3-char suffix for days with multiple entries.
5. **Legacy docs may have Portuguese field names** — but post-migration protected subcollections use English (`accommodations`, `transportation`, `reservation`). Some older docs may still use Portuguese names; verify with the query-firestore tool.
6. **DateObject.second may be missing** in some `end` dates of legacy documents — treat as optional when reading.
7. **Traveler.id may be absent** in legacy documents — the `validateTravelersObject()` function in `traveler.model.ts` backfills missing IDs at runtime.
8. **Itinerary destinationIds can be objects** — not just plain string IDs; some docs store `{ id: string, title: string }` entries.
9. **Destination `image` field may be absent** in documents created before July 2026. Always guard with optional chaining (`dest.image?.active`). Migration 15 backfills missing fields.
10. **Destination summaries live under `users/{uid}/destinationSummaries/{destId}`** — not embedded in the user doc. The index page reads these, not the full destination documents.
11. **Destination entry `images` may be absent** in entries created before August 2026 — guard with optional chaining (`entry.images?.length`). Migration 15 (Phase 3) backfills `images: []` on all destination entries across all categories.
12. **User profile fields (`name`, `email`, `photoURL`) may be absent** in user documents created before August 2026. The app reads them from Firestore and falls back to the Auth user record when missing (`userData?.name || user.displayName || ''`). Migration 16 backfills them from Auth.
13. **Trip `destinationRefs` may carry denormalized destination metadata** (`title`, `image`, `categories`, `version`) since Aug 2026 (migration 18 / trip save). The `categories` booleans mean **“has entries”** and drive which boxes render on view.html — they are **not** the destination's editor-side `modules` toggles. Guard with optional chaining (`ref.categories?.restaurants`); legacy refs are just `{ id }`.
