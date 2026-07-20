# Expenses Firestore Document Structure

> **Collection path:** `expenses/{tripId}`
>
> The expenses document lives in a **top-level collection** (not a subcollection of the trip). It shares the same document ID as its parent trip. When a PIN is active, the document is stored under `expenses/protected/{pin}/{tripId}` instead.

---

## Top-Level Document Fields

### `duringTrip` — `ExpenseEntry[]`
Expenses incurred during the trip. An empty array if none.

### `preTrip` — `ExpenseEntry[]`
Pre-trip expenses (flights, hotels booked in advance, etc.). An empty array if none.

### `currency` — `string`
3-letter currency code of the parent trip (e.g. `"BRL"`, `"EUR"`). Set at save time from the trip document.

### `travelers` — `Record<string, string>`
Map of traveler ID → traveler name. Used to resolve `person` references in expense entries.

```ts
// Example:
{
  "VWdmt": "Elaine",
  "WdRww": "Milton",
  "yGaA3": "Gabriel",
  "HZFoO": "Marianna"
}
```

### `sharing` — `Sharing`
```ts
{
  owner:   string;    // Firebase Auth UID of the trip owner
  active:  boolean;   // always true
  editors: string[];  // usually empty (expenses aren't independently shared)
}
```

### `version` — `Version`
```ts
{
  lastUpdated: string;  // ISO 8601 timestamp, e.g. "2026-02-17T19:43:05.760Z"
}
```

### `budget` — `Record<string, unknown>` *(optional — may be absent)*
Budget configuration. Not always present. Defined in the TypeScript interface but rarely populated.

---

## ExpenseEntry Structure

Each entry in `duringTrip` or `preTrip` arrays:

```ts
interface ExpenseEntry {
  name:     string;   // description of the expense (e.g. "BH - Lisboa - Barcelona")
  type:     string;   // category translation key (see table below)
  price:    number;   // amount in the stated currency
  currency: string;   // 3-letter currency code (e.g. "BRL", "EUR")
  person:   string;   // traveler ID from the travelers map, or "" if unassigned
}
```

### `type` Values (Translation Keys)

| Key | Meaning |
|---|---|
| `trip.transportation.type.flights` | Flight tickets |
| `trip.transportation.type.bus` | Bus tickets |
| `trip.accommodation.title` | Accommodation / hotel |
| `labels.entrertainment` | Entertainment / attractions |
| `trip.expenses.daily` | Daily spending / miscellaneous |
| *(custom / free text)* | Any user-defined category |

> **Note:** The `type` field stores a **translation key** (dotted path), not a plain label. The UI resolves it via the i18n system. Users may also type free-text categories.

---

## Protected vs Non-Protected Storage

The expenses document's storage location depends on the trip's PIN preference:

| PIN preference | Document path | Notes |
|---|---|---|
| `"no-pin"` | `expenses/{tripId}` | Publicly readable by anyone with trip access |
| `"sensitive-only"` | `expenses/protected/{pin}/{tripId}` | Requires PIN to read |
| `"all-data"` | `expenses/protected/{pin}/{tripId}` | Requires PIN to read (entire expenses doc is protected) |

There is also a lightweight lookup document at `protected/{tripId}`:
```ts
{
  pin: string;  // the PIN value, used to locate the protected expenses doc
}
```

When the PIN is removed or changed, the old protected document is deleted and the data moves to the appropriate new location.

---

## Complete Example

```json
{
  "duringTrip": [],
  "currency": "BRL",
  "preTrip": [
    {
      "name": "BH - Lisboa - Barcelona",
      "currency": "BRL",
      "type": "trip.transportation.type.flights",
      "price": 12427.20,
      "person": ""
    },
    {
      "name": "Upgrade Voo Lisboa",
      "currency": "BRL",
      "type": "trip.transportation.type.flights",
      "price": 3500.00,
      "person": ""
    },
    {
      "name": "Barcelona - Londres",
      "currency": "BRL",
      "type": "trip.transportation.type.flights",
      "price": 2039.17,
      "person": ""
    },
    {
      "name": "Londres - Dublin",
      "currency": "BRL",
      "type": "trip.transportation.type.flights",
      "price": 3511.87,
      "person": ""
    },
    {
      "name": "Dublin - BH",
      "currency": "BRL",
      "type": "trip.transportation.type.flights",
      "price": 12409.26,
      "person": ""
    },
    {
      "name": "Guinness Storehouse",
      "currency": "BRL",
      "type": "labels.entrertainment",
      "price": 574.41,
      "person": ""
    },
    {
      "name": "Park Güell",
      "currency": "BRL",
      "type": "labels.entrertainment",
      "price": 464.84,
      "person": ""
    },
    {
      "name": "Hotel Monte Belvedere by Shiadu",
      "currency": "BRL",
      "type": "trip.accommodation.title",
      "price": 4971.74,
      "person": ""
    },
    {
      "name": "Hotel Royal Passeig de Gracia",
      "currency": "BRL",
      "type": "trip.accommodation.title",
      "price": 8863.72,
      "person": ""
    },
    {
      "name": "The Resident Covent Garden",
      "currency": "BRL",
      "type": "trip.accommodation.title",
      "price": 16553.72,
      "person": ""
    },
    {
      "name": "The Morrison Dublin",
      "currency": "BRL",
      "type": "trip.accommodation.title",
      "price": 9510.72,
      "person": ""
    },
    {
      "name": "Gastos dia-a-dia + presentes",
      "currency": "BRL",
      "type": "trip.expenses.daily",
      "price": 34000.00,
      "person": ""
    }
  ],
  "travelers": {
    "VWdmt": "Elaine",
    "WdRww": "Milton",
    "yGaA3": "Gabriel",
    "HZFoO": "Marianna"
  },
  "sharing": {
    "editors": [],
    "owner": "eySHdjIyK0MNAgiPU77xE0d1CTjp",
    "active": true
  },
  "version": {
    "lastUpdated": "2026-02-17T19:43:05.760Z"
  }
}
```

---

## Firestore Path Summary

```
expenses/
├── {tripId}                        ← Expenses document (when pin = "no-pin")
└── protected/
    └── {pin}/
        └── {tripId}                ← Expenses document (when pin = "sensitive-only" or "all-data")

protected/
└── {tripId}                        ← PIN lookup: { pin: "1234" }
```

---

## Relationship to Trip Document

- The `expenses/{tripId}` document ID **matches** the trip document ID in `trips/{tripId}`.
- The trip's `modules.expenses` boolean controls whether the expenses section is visible in the trip viewer.
- The trip's `pin` field determines whether expenses are stored publicly or behind a PIN.
- The `travelers` map in the expenses doc is a snapshot of the trip's travelers at save time — used to resolve `person` references in expense entries.
- The `currency` field mirrors the trip's `currency` field at save time.

---

## Key Differences: Old (Portuguese) vs New (English)

| Aspect | Old (pre-migration) | New (current) |
|---|---|---|
| Collection name | `gastos` | `expenses` |
| During-trip array | `gastosDurante` | `duringTrip` |
| Pre-trip array | `gastosPrevios` | `preTrip` |
| Budget field | `orcamento` | `budget` |
| Traveler field on entry | `pessoa` | `person` |
| Price field on entry | `valor` | `price` |
| Currency field on entry | `moeda` | `currency` |
| Entry name | `nome` | `name` |
| Entry type | `tipo` | `type` |
| PIN storage | `pin` field embedded in `gastos` doc | `pin` in `protected/{tripId}` + doc under `expenses/protected/{pin}/` |
