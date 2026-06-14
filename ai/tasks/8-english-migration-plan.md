# 🇬🇧 E048: English Translation & Optimized Redesign — Implementation Plan

> **Created:** 2026-06-14
> **Based on:** `ai/analysis/new-database-proposal.md` (Option B)
> **Status:** Not started
> **Goal:** Migrate the entire Firestore database from Portuguese → English field names, enum values, and collection names, while restructuring to subcollections (Option B — Optimized Redesign). Then refactor all TypeScript set/read functions to match.

---

## Summary

This plan implements **Option B** from the database proposal: full English translation + structural optimization. The database is small (~2 MB, <100 docs), so migration is fast and low-risk. The plan is organized into **14 prompts** that an AI can execute sequentially.

### Key Deliverables

| # | What | Where |
|---|------|-------|
| 1 | New TypeScript schema interfaces | `public/assets/ts/models/` |
| 2 | Migration Cloud Functions (7 scripts) | `functions/src/migrations/` |
| 3 | Refactored database.ts with English paths | `public/assets/ts/data/firebase/database.ts` |
| 4 | Refactored services with subcollection reads | `public/assets/ts/data/services/` |
| 5 | Updated models with English types | `public/assets/ts/models/` |
| 6 | Updated state.ts with English names | `public/assets/ts/data/state.ts` |
| 7 | Renamed & translated JSON config files (4 renamed, 3 in-place) | `public/assets/json/` |
| 8 | Updated config.ts loaders & all JSON consumers (~15 files) | `public/assets/ts/` |
| 9 | Updated HTML element IDs + expense template | `public/*.html` |
| 10 | Renamed transport image directories | `public/assets/img/transportation/` |

---

## 📋 Prompt 1 — Define New TypeScript Schema Interfaces

### Context

The current TypeScript codebase in `public/assets/ts/` has no formal type definitions for the Firestore data shapes. Models like `trip.model.ts` export transformation functions but don't define the document interfaces. Before writing migration scripts or refactoring code, we need the new English schema as TypeScript interfaces — these become the source of truth that both the migration scripts and the client code target.

### Task

Create a new file `public/assets/ts/models/new-schema.ts` with complete TypeScript interfaces for **all entities** in the new English schema. Use the field mapping tables from `ai/analysis/new-database-proposal.md` as reference.

Create the following interfaces:

1. **`DateObject`** — `{ day: number, month: number, year: number, hour: number, minute: number, second: number }`

2. **`Trip`** — The main trip document at `trips/{id}`:
   - `title: string`
   - `start: DateObject`
   - `end: DateObject`
   - `currency: string`
   - `pin: "sensitive-only" | "no-pin"`
   - `version: { lastUpdated: string }`
   - `visibility: { light: boolean, dark: boolean }`
   - `colors: { light: string, dark: string, active: boolean }`
   - `sharing: { owner: string, active: boolean, editors: string[] }`
   - `modules: { destinations: boolean, transportation: boolean, itinerary: boolean, gallery: boolean, summary: boolean, accommodations: boolean, expenses: boolean }`
   - `travelers: Traveler[]`
   - `links: { maps: string, attachments: string, active: boolean, drive: string, pdf: string, ppt: string, sheet: string, vaccine: string }`
   - `gallery: { categories: string[], descriptions: string[], images: string[], titles: string[] }`
   - `destinationRefs: { id: string }[]`

3. **`Traveler`** — `{ id: string, name: string }`

4. **`Accommodation`** — Document at `trips/{tripId}/accommodations/{id}`:
   - `name: string`
   - `description: string`
   - `address: string`
   - `dates: { checkIn: DateObject, checkOut: DateObject }`
   - `breakfast: boolean`
   - `images: { description: string, link: string }[]`
   - `reservation: string`
   - `link: string`

5. **`TransportLeg`** — Document at `trips/{tripId}/transportation/{id}`:
   - `type: "flight" | "bus" | "car"`
   - `company: string`
   - `points: { origin: string, destination: string }`
   - `dates: { departure: DateObject, arrival: DateObject }`
   - `duration: string`
   - `direction: "outbound" | "return" | "during"`
   - `reservation: string`
   - `link: string`
   - `person: string`

6. **`TransportSettings`** — Document at `trips/{tripId}/transportation/_settings`:
   - `viewMode: "simple" | "leg"`

7. **`ItineraryDay`** — Document at `trips/{tripId}/itinerary/{dayId}`:
   - `title: { value: string, showDestinations: boolean, translate: boolean }`
   - `date: DateObject`
   - `destinationIds: string[]`
   - `earlyMorning: PeriodItem[]`
   - `morning: PeriodItem[]`
   - `afternoon: PeriodItem[]`
   - `night: PeriodItem[]`

8. **`PeriodItem`**:
   - `label: string`
   - `startTime: string` (HH:mm)
   - `endTime: string` (HH:mm)
   - `travelers: { id: string, name: string, isPresent: boolean }[]`
   - `item: { type: "destination" | "transportation" | "accommodation", id: string, category: string, location: string }`

9. **`Destination`** — Document at `destinations/{id}`:
   - `title: string`
   - `currency: string`
   - `version: { lastUpdated: string }`
   - `sharing: { owner: string, active: boolean }`
   - `modules: { nightlife: boolean, restaurants: boolean, shops: boolean, attractions: boolean, snacks: boolean, map: boolean }`
   - `myMaps: string`
   - `restaurants: Record<string, PlaceItem>`
   - `snacks: Record<string, PlaceItem>`
   - `shops: Record<string, PlaceItem>`
   - `nightlife: Record<string, PlaceItem>`
   - `attractions: Record<string, PlaceItem>`

10. **`PlaceItem`**:
    - `name: string`
    - `description: { pt: string, en: string }`
    - `rating: string`
    - `price: string`
    - `map: string`
    - `website: string`
    - `region: string`
    - `instagram: string`
    - `isNew: boolean`
    - `createdAt: string`
    - `media: string`
    - `emoji: string`

11. **`Expenses`** — Document at `expenses/{tripId}`:
    - `duringTrip: ExpenseEntry[]`
    - `preTrip: ExpenseEntry[]`
    - `budget: Record<string, any>`

12. **`ExpenseEntry`** — (define as `Record<string, any>` for now, refine later if needed)

13. **`UserProfile`** — Document at `users/{uid}`:
    - `visibility: "dynamic"`
    - `permissions: Record<string, any>`

14. **`TripSummary`** — Document at `users/{uid}/tripSummaries/{tripId}`:
    - `title: string, start: DateObject, end: DateObject, image: string, colors: object, version: object, pin: string, modules: object`

15. **`DestinationSummary`** — Document at `users/{uid}/destinationSummaries/{id}`:
    - `title: string, currency: string, version: object`

16. **`ListingSummary`** — Document at `users/{uid}/listingSummaries/{id}`:
    - `title: string, subtitle: string, description: string, image: string, colors: object, version: object`

17. **`Listing`** — (structure similar to current, with English field names)

18. **`ProtectedData`** — Document at `protected/{tripId}`:
    - `pin: string`

Also export these string literal union types:

```ts
export type CollectionName = "users" | "trips" | "destinations" | "listings" | "expenses" | "protected" | "config";
export type TransportType = "flight" | "bus" | "car";
export type Direction = "outbound" | "return" | "during";
export type TransportViewMode = "simple" | "leg";
export type PinType = "sensitive-only" | "no-pin";
export type ThemeMode = "light" | "dark" | "active";
export type UserVisibilityMode = "dynamic";
export type ItineraryItemType = "destination" | "transportation" | "accommodation";
export type ItineraryPeriod = "earlyMorning" | "morning" | "afternoon" | "night";
export type DestinationCategory = "restaurants" | "snacks" | "shops" | "nightlife" | "attractions";
```

### Expected Output

- `public/assets/ts/models/new-schema.ts` with all interfaces and type aliases
- All interfaces use JSDoc comments referencing the old Portuguese field name (e.g., `/** was "titulo" */`)
- TypeScript compiles without errors: `npx tsc --noEmit`

### Validation

```bash
npx tsc --noEmit
```

---

## 📋 Prompt 2 — Migration Script: Field Name & Enum Value Translation (In-Place)

### Context

The existing migration pattern is in `functions/src/migrations/`. Each migration is a Cloud Function (HTTP trigger) that reads documents, transforms them, and writes back via batched writes. Migration 12 (`12-migrate-destination-object.ts`) is the most recent and shows the current pattern: import `firebase-functions` and `firebase-admin`, export an `https.onRequest` handler, use `admin.firestore().batch()`.

This first migration does the "full translation pass" — renames all Portuguese field names to English and translates all Portuguese enum/string values to English **within the existing collections** (no structural changes yet). This establishes the English baseline that subsequent structural migrations build on.

### Task

Create `functions/src/migrations/13-migrate-english-fields.ts`.

The migration function must:

1. Iterate over **all collections**: `usuarios`, `viagens`, `destinos`, `listagens`, `gastos`, `protegido`, `config`
2. For each document in each collection, recursively transform all field names from Portuguese → English
3. Also translate all **enum/string values** stored as data (not just keys)
4. Use batched writes (`admin.firestore().batch()`)
5. Be idempotent (safe to run multiple times — skip already-English fields)
6. Include dry-run mode (query param `?dryRun=true` logs changes without writing)

The migration must handle these transformations:

#### Field Name Translations (recursive, all collections)

Use the complete dictionary from `ai/analysis/new-database-proposal.md` sections "Current Field Mapping". Key renames include:

| Portuguese | English |
|-----------|---------|
| `titulo` | `title` |
| `versao` | `version` |
| `visibilidade` | `visibility` |
| `destinos` | `destinations` or `destinationRefs` |
| `inicio` | `start` |
| `fim` | `end` |
| `cores` | `colors` |
| `compartilhamento` | `sharing` |
| `modulos` | `modules` |
| `moeda` | `currency` |
| `pessoas` | `travelers` |
| `hospedagens` | `accommodations` |
| `transportes` | `transportation` |
| `programacoes` | `itinerary` |
| `galeria` | `gallery` |
| `nome` | `name` |
| `descricao` | `description` |
| `endereco` | `address` |
| `datas` | `dates` |
| `checkin` | `checkIn` |
| `checkout` | `checkOut` |
| `cafe` | `breakfast` |
| `imagens` | `images` |
| `reserva` | `reservation` |
| `empresa` | `company` |
| `pontos` | `points` |
| `partida` (departure point) | `origin` |
| `chegada` (arrival point) | `destination` |
| `partida` (departure date) | `departure` |
| `chegada` (arrival date) | `arrival` |
| `duracao` | `duration` |
| `idaVolta` | `direction` |
| `pessoa` | `person` |
| `visualizacao` | `viewMode` |
| `destinosIDs` | `destinationIds` |
| `madrugada` | `earlyMorning` |
| `manha` | `morning` |
| `tarde` | `afternoon` |
| `noite` | `night` |
| `programacao` | `label` |
| `tipo` | `type` |
| `transporte` (type) | `type` |
| `restaurantes` | `restaurants` |
| `lanches` | `snacks` |
| `lojas` | `shops` |
| `saidas` | `nightlife` |
| `turismo` | `attractions` |
| `nota` | `rating` |
| `valor` | `price` |
| `mapa` | `map` |
| `regiao` | `region` |
| `novo` | `isNew` |
| `criadoEm` | `createdAt` |
| `midia` | `media` |
| `permissoes` | `permissions` |
| `gastosDurante` | `duringTrip` |
| `gastosPrevios` | `preTrip` |
| `orcamento` | `budget` |
| `ultimaAtualizacao` | `lastUpdated` |
| `dono` | `owner` |
| `ativo` | `active` |
| `editores` | `editors` |
| `vacina` | `vaccine` |
| `valor` (itinerary title) | `value` |
| `destinos` (itinerary title boolean) | `showDestinations` |
| `traduzir` | `translate` |

#### Enum/Value Translations

For field **values** (not keys), translate:

| Field | Portuguese Value | English Value |
|-------|-----------------|---------------|
| `transportation.type` | `"voo"` | `"flight"` |
| `transportation.type` | `"onibus"` | `"bus"` |
| `transportation.type` | `"carro"` | `"car"` |
| `transportation.direction` | `"ida"` | `"outbound"` |
| `transportation.direction` | `"volta"` | `"return"` |
| `transportation.direction` | `"durante"` | `"during"` |
| `transportation.viewMode` | `"simple-view"` | `"simple"` |
| `transportation.viewMode` | `"leg-view"` | `"leg"` |
| `visibility.light` / `visibility.dark` / `colors.active` | `"claro"` | `"light"` |
| | `"escuro"` | `"dark"` |
| | `"ativo"` | `"active"` |
| itinerary `item.type` | `"destinos"` | `"destination"` |
| itinerary `item.type` | `"transporte"` | `"transportation"` |
| itinerary `item.type` | `"hospedagens"` | `"accommodation"` |
| user `visibility` | `"dinamico"` | `"dynamic"` |
| module keys | `"saidas"` | `"nightlife"` |
| module keys | `"mapa"` | `"map"` |

### Approach: Recursive Transform

Write a `transformObject(obj, fieldMap, valueMap)` helper:

```ts
function transformObject(obj: any, fieldMap: Record<string, string>, valueMap: Record<string, Record<string, string>>): any {
    if (Array.isArray(obj)) return obj.map(item => transformObject(item, fieldMap, valueMap));
    if (obj === null || typeof obj !== "object") {
        // Check if it's a value that needs translation
        return transformValue(obj, valueMap);
    }
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
        const newKey = fieldMap[key] || key;
        result[newKey] = transformObject(value, fieldMap, valueMap);
    }
    return result;
}
```

### Collection-Specific Field Maps

Each collection has a different subset of fields. To avoid rewriting all documents in one massive loop, process collection by collection:

1. `viagens` → trip field map
2. `destinos` → destination field map
3. `usuarios` → user field map
4. `gastos` → expenses field map
5. `listagens` → listing field map
6. `protegido` → protected field map
7. `config` → config field map

Also handle **subcollections**:
- `viagens/protected/{pin}/{id}` → same trip protected translations
- `gastos/protected/{pin}/{id}` → same expense protected translations

### Expected Output

- `functions/src/migrations/13-migrate-english-fields.ts`
- Follows the pattern of `12-migrate-destination-object.ts` (HTTP trigger, batch writes)
- Reports: total documents processed, total fields renamed, total values translated
- Dry-run mode logs all changes without committing

### Validation

```bash
cd functions && npm run build && npx firebase emulators:start --only functions
# Then curl the migration endpoint with ?dryRun=true first
```

---

## 📋 Prompt 3 — Migration Scripts: Structural Restructuring (5 scripts)

### Context

After Prompt 2, all field names and values are in English but the data structure is still the old one (embedded arrays in trip docs, summaries embedded in user doc). These 5 migrations restructure the data to match the Option B schema from `new-schema.ts`.

Each migration follows the established pattern: HTTP trigger, `admin.firestore().batch()`, idempotent, dry-run support.

### Task

Create these 5 migration files:

#### 3a. `functions/src/migrations/14-migrate-user-summaries.ts`

**Purpose:** Split user document summaries into subcollections.

**What it does:**
1. Read each document in `usuarios` collection
2. For each user doc, extract `trips`, `destinations`, `listings` objects
3. For each trip entry in `trips` → write to `usuarios/{uid}/tripSummaries/{tripId}` with `{ title, start, end, image, colors, version, pin, modules }`
4. For each destination entry → write to `usuarios/{uid}/destinationSummaries/{id}` with `{ title, currency, version }`
5. For each listing entry → write to `usuarios/{uid}/listingSummaries/{id}` with `{ title, subtitle, description, image, colors, version }`
6. Remove the `trips`, `destinations`, `listings` fields from the user document (after confirming subcollections written successfully)
7. Update `usuarios/{uid}/trips` from object `{id: {...}}` → array of IDs `[id1, id2, ...]` (for backward compat during transition)

**Note:** Before this migration, Prompt 2 already translated field names. So the user doc already has `trips` (not `viagens`), `destinations` (not `destinos`), `listings` (not `listagens`).

#### 3b. `functions/src/migrations/15-migrate-trip-destinations.ts`

**Purpose:** Strip embedded destination data from trip docs, keep only `{id}` refs.

**What it does:**
1. Read each document in `viagens` collection
2. For each trip doc, read `destinations` array (currently `[{destinosID, destinos: {...full destination...}}]`)
3. Replace with `destinationRefs: [{id: entry.destinosID}]` (the `destinosID` was renamed to `destinationsID` by Prompt 2... actually, let's use `id` as per the new schema)
4. Write back the slim trip doc

**Important:** The destination data that was embedded is NOT lost — it still lives in `destinos/{id}`. This migration just stops duplicating it in trip docs.

#### 3c. `functions/src/migrations/16-migrate-accommodations-subcollection.ts`

**Purpose:** Move `accommodations` array from trip doc into `viagens/{id}/accommodations/*` subcollection.

**What it does:**
1. Read each document in `viagens` collection
2. For each trip doc, extract `accommodations` array (was `hospedagens`, renamed by Prompt 2)
3. For each accommodation in the array, generate a unique ID (use `_getRandomID` helper from migration 12), write to `viagens/{tripId}/accommodations/{accId}`
4. Remove `accommodations` field from trip doc
5. Use batch writes — but note: batch has 500 op limit. For trips with many accommodations, may need multiple batches.

#### 3d. `functions/src/migrations/17-migrate-transportation-subcollection.ts`

**Purpose:** Move `transportation.data` array from trip doc into `viagens/{id}/transportation/*` subcollection.

**What it does:**
1. Read each document in `viagens` collection
2. For each trip doc, read `transportation` object (was `transportes`, renamed by Prompt 2)
3. Extract `transportation.viewMode` → write to `viagens/{tripId}/transportation/_settings` as `{ viewMode }`
4. Extract `transportation.data` array → for each leg, generate ID, write to `viagens/{tripId}/transportation/{legId}`
5. Remove `transportation` field from trip doc

#### 3e. `functions/src/migrations/18-migrate-itinerary-subcollection.ts`

**Purpose:** Move `itinerary` array from trip doc into `viagens/{id}/itinerary/*` subcollection.

**What it does:**
1. Read each document in `viagens` collection
2. For each trip doc, extract `itinerary` array (was `programacoes`, renamed by Prompt 2)
3. For each itinerary day, generate a date-based ID using YYYYMMDD format (falls back to `day-{index}` if date is missing), write to `viagens/{tripId}/itinerary/{dayId}`
4. Remove `itinerary` field from trip doc

### Common Requirements (all 5 scripts)

- Each migration is its own Cloud Function, export as `migrate14`, `migrate15`, etc.
- All support `?dryRun=true` query parameter
- All are idempotent (check if new structure already exists before writing)
- All log count of documents processed, created, updated, deleted
- Follow the import pattern from `12-migrate-destination-object.ts`:
  ```ts
  import * as functions from "firebase-functions";
  import * as admin from "firebase-admin";
  admin.initializeApp();
  export const migrate = functions.https.onRequest(async (req, res) => { ... });
  ```

### Expected Output

- 5 new migration files in `functions/src/migrations/`
- `functions/src/index.ts` updated to export all new migrations (or add a combined export)

### Validation

```bash
cd functions && npm run build
# Deploy to emulator and test each migration individually with ?dryRun=true
```

---

## 📋 Prompt 4 — Migration Script: Collection Renames

### Context

After the structural migrations (Prompts 2–3), all data is in English fields and restructured into subcollections. The final DB migration step is renaming the top-level collections from Portuguese to English.

Firestore cannot rename collections directly. The approach is: copy each document to the new collection, verify, then delete from the old collection.

### Task

Create `functions/src/migrations/19-migrate-collection-names.ts`.

**Collection rename map:**

| Old Collection | New Collection |
|---------------|---------------|
| `usuarios` | `users` |
| `viagens` | `trips` |
| `destinos` | `destinations` |
| `listagens` | `listings` |
| `gastos` | `expenses` |
| `protegido` | `protected` |

**Also rename subcollections:**
- `viagens/protected/{pin}/{id}` → `trips/protected/{pin}/{id}`
- `gastos/protected/{pin}/{id}` → `expenses/protected/{pin}/{id}`
- `usuarios/{uid}/tripSummaries/*` → `users/{uid}/tripSummaries/*`
- `usuarios/{uid}/destinationSummaries/*` → `users/{uid}/destinationSummaries/*`
- `usuarios/{uid}/listingSummaries/*` → `users/{uid}/listingSummaries/*`
- `viagens/{id}/accommodations/*` → `trips/{id}/accommodations/*`
- `viagens/{id}/transportation/*` → `trips/{id}/transportation/*`
- `viagens/{id}/itinerary/*` → `trips/{id}/itinerary/*`

**Approach:**
1. For each collection in the rename map:
   - Read all documents from old collection
   - Write each document to the new collection (same document ID, same data)
   - After verifying the write, delete from old collection
2. Process subcollections last (they require collection group queries or iterating parent docs)
3. Use batch writes, respecting the 500-operation limit
4. Support `?dryRun=true`

**Important:** This should be the LAST migration run, after all other migrations are complete and validated. Include a safety check that verifies the old collections still exist before proceeding.

### Expected Output

- `functions/src/migrations/19-migrate-collection-names.ts`

### Validation

```bash
cd functions && npm run build
# Test on emulator with dry-run first
# After real run, verify old collections are empty, new collections have all data
```

---

## 📋 Prompt 5 — Migration Script: Cleanup & Validation

### Context

After all migrations have run successfully and been validated over a grace period (30 days), run a cleanup migration to remove old collections and any leftover Portuguese fields.

### Task

Create `functions/src/migrations/20-migrate-cleanup.ts`.

**What it does:**
1. Delete all documents from old Portuguese collections (`usuarios`, `viagens`, `destinos`, `listagens`, `gastos`, `protegido`) — only if the corresponding new collections exist and have documents
2. Delete old subcollections under Portuguese-named parents
3. Log a summary of what was deleted
4. Support `?dryRun=true`

This migration is optional and should only be run after confirming everything works with the new schema.

### Expected Output

- `functions/src/migrations/20-migrate-cleanup.ts`

### Validation

```bash
cd functions && npm run build
```

---

## 📋 Prompt 6 — Refactor `database.ts`: Generic CRUD + Collection Paths

### Context

The current `public/assets/ts/data/firebase/database.ts` contains all Firestore read/write functions. Many functions reference Portuguese collection names (`"viagens"`, `"usuarios"`, `"destinos"`, etc.) and Portuguese field names. After the DB migration (Prompts 2–5), the database uses English names, so this file must be updated.

The new schema also introduces subcollections for accommodations, transportation, itinerary, and user summaries — the database layer needs functions to read/write these.

### Task

Refactor `public/assets/ts/data/firebase/database.ts`:

#### Step 1: Add Collection Name Constants

At the top of the file, export constants for all collection paths:

```ts
export const COLLECTION = {
    USERS: "users",
    TRIPS: "trips",
    DESTINATIONS: "destinations",
    LISTINGS: "listings",
    EXPENSES: "expenses",
    PROTECTED: "protected",
    CONFIG: "config",
} as const;

export const SUBCOLLECTION = {
    TRIP_SUMMARIES: "tripSummaries",
    DESTINATION_SUMMARIES: "destinationSummaries",
    LISTING_SUMMARIES: "listingSummaries",
    ACCOMMODATIONS: "accommodations",
    TRANSPORTATION: "transportation",
    ITINERARY: "itinerary",
    PROTECTED_TRIPS: "protected",   // under trips/
    PROTECTED_EXPENSES: "protected", // under expenses/
} as const;
```

#### Step 2: Update Generic CRUD Functions

Update `get()`, `create()`, `deepCreate()`, `update()`, `override()`, `deleteDocument()` — these are already path-based and mostly generic. Ensure they work with the new collection paths (they should already, since they accept a path string — but verify any hardcoded references).

#### Step 3: Update Business Logic Functions

Replace all Portuguese collection/field references in these functions:

| Function | Old Reference | New Reference |
|----------|--------------|---------------|
| `getSingleData(type)` | `type[0]` URL param (v, d, l) | Keep path logic, use `COLLECTION` constants |
| `getSingleData(type)` | Compares `["viagens", "listagens"]` | → `[COLLECTION.TRIPS, COLLECTION.LISTINGS]` |
| `getTripDataWithDestinations()` | Uses `destinos` field, `destinosID` | → Use `destinationRefs` field, `id` |
| `getTripDataWithDestinations()` | Sequential `for` loop | → **Refactor to `Promise.all()`** (parallel reads) |
| `deleteUserObjectDB()` | `usuarios/{uid}` | → `users/{uid}` |
| `deleteUserObjectDB()` | Reads `userData[type]` as array | → Now reads from subcollection summaries |
| `deleteAccount()` | `usuarios/{uid}` | → `users/{uid}` |
| `deleteAccountDocuments()` | `usuarios/{uid}` paths | → `users/{uid}` paths |
| `deleteAccountDocuments()` | `viagens`, `destinos`, `listagens`, `gastos`, `protegido` | → `COLLECTION.TRIPS`, etc. |
| `addToUserArray()` | `usuarios/{uid}` | → `users/{uid}` |
| `newUserObjectDB()` | Creates with Portuguese collection | → Use `COLLECTION` constants |
| `getPermissoes()` | `usuarios/{uid}` → `permissoes` | → `users/{uid}` → `permissions` |
| `getDestination()` | `destinos/{id}` | → `destinations/{id}` |
| `createBatchOps()` | Generic path-based — verify | No changes needed (path-based) |

#### Step 4: Add New Subcollection Functions

Add these new functions for the subcollection pattern:

```ts
/** Get all accommodations for a trip */
export async function getAccommodations(tripId: string): Promise<Accommodation[]> {
    const snapshot = await firebase.firestore()
        .collection(`${COLLECTION.TRIPS}/${tripId}/${SUBCOLLECTION.ACCOMMODATIONS}`)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/** Get all transportation legs for a trip */
export async function getTransportation(tripId: string): Promise<{ legs: TransportLeg[], settings: TransportSettings }> {
    const colRef = firebase.firestore()
        .collection(`${COLLECTION.TRIPS}/${tripId}/${SUBCOLLECTION.TRANSPORTATION}`);
    const snapshot = await colRef.get();
    const legs: TransportLeg[] = [];
    let settings: TransportSettings = { viewMode: "simple" };
    snapshot.forEach(doc => {
        if (doc.id === "_settings") {
            settings = doc.data() as TransportSettings;
        } else {
            legs.push({ id: doc.id, ...doc.data() } as TransportLeg);
        }
    });
    return { legs, settings };
}

/** Get all itinerary days for a trip */
export async function getItinerary(tripId: string): Promise<ItineraryDay[]> {
    const snapshot = await firebase.firestore()
        .collection(`${COLLECTION.TRIPS}/${tripId}/${SUBCOLLECTION.ITINERARY}`)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/** Get trip summaries for a user (paginated) */
export async function getUserTripSummaries(uid: string): Promise<TripSummary[]> {
    const snapshot = await firebase.firestore()
        .collection(`${COLLECTION.USERS}/${uid}/${SUBCOLLECTION.TRIP_SUMMARIES}`)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/** Get destination summaries for a user */
export async function getUserDestinationSummaries(uid: string): Promise<DestinationSummary[]> {
    const snapshot = await firebase.firestore()
        .collection(`${COLLECTION.USERS}/${uid}/${SUBCOLLECTION.DESTINATION_SUMMARIES}`)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/** Get listing summaries for a user */
export async function getUserListingSummaries(uid: string): Promise<ListingSummary[]> {
    const snapshot = await firebase.firestore()
        .collection(`${COLLECTION.USERS}/${uid}/${SUBCOLLECTION.LISTING_SUMMARIES}`)
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/** Get a trip with all subcollections resolved in parallel */
export async function getTripComplete(tripId: string): Promise<Trip & {
    accommodations: Accommodation[],
    transportation: { legs: TransportLeg[], settings: TransportSettings },
    itinerary: ItineraryDay[],
    destinations: Destination[],
}> {
    const tripData = await get(`${COLLECTION.TRIPS}/${tripId}`) as Trip;
    if (!tripData) return null;

    const [accommodations, transportation, itinerary, destinations] = await Promise.all([
        getAccommodations(tripId),
        getTransportation(tripId),
        getItinerary(tripId),
        tripData.destinationRefs?.length
            ? Promise.all(tripData.destinationRefs.map(ref =>
                get(`${COLLECTION.DESTINATIONS}/${ref.id}`, false)))
            : Promise.resolve([]),
    ]);

    return { ...tripData, accommodations, transportation, itinerary, destinations };
}
```

#### Step 5: Update `DESTINOS_ATIVOS` Cache

Rename `DESTINOS_ATIVOS` → `activeDestinations` wherever imported, or add a compatibility alias.

### Expected Output

- Updated `public/assets/ts/data/firebase/database.ts` with:
  - Collection name constants
  - All Portuguese references replaced with English
  - `getTripDataWithDestinations()` refactored to use `Promise.all()`
  - New subcollection read functions
  - `getTripComplete()` for parallel trip loading

### Validation

```bash
npx tsc --noEmit
# Check that no Portuguese collection/field strings remain in the file:
grep -n "viagens\|usuarios\|destinos\|listagens\|gastos\|protegido\|hospedagens\|transportes\|programacoes" public/assets/ts/data/firebase/database.ts
```

---

## 📋 Prompt 7 — Refactor Service Layer

### Context

The service files in `public/assets/ts/data/services/` wrap the database functions and are used by pages. They currently re-export old function names and use Portuguese collection references. These need to use the new English API from the refactored `database.ts`.

### Task

Update all 4 service files:

#### 7a. `trip.service.ts`

1. Import new functions from `database.ts`:
   - `getTripComplete` instead of `getTripDataWithDestinations`
   - `getAccommodations`, `getTransportation`, `getItinerary` for subcollections
2. Update `getTrip()`:
   ```ts
   export async function getTrip(tripId?: string) {
       if (!tripId) {
           tripId = getURLParam("v"); // "v" is the param for trip ID
       }
       if (!tripId) return null;
       return await getTripComplete(tripId);
   }
   ```
3. Update `getTripRaw()` to use `COLLECTION.TRIPS`
4. Add new service functions:
   - `getTripAccommodations(tripId)` → `getAccommodations(tripId)`
   - `getTripTransportation(tripId)` → `getTransportation(tripId)`
   - `getTripItinerary(tripId)` → `getItinerary(tripId)`
5. Remove re-exports of deprecated functions like `getTripDataWithDestinations` (keep a deprecated alias if needed during transition)

#### 7b. `destination.service.ts`

1. Update all `"destinos"` references → `COLLECTION.DESTINATIONS`
2. Update `createDestination()`:
   - After creating destination, instead of `addToUserArray(type, id)`, create a summary doc in `users/{uid}/destinationSummaries/{id}`
3. Update `deleteDestination()` to also delete the summary doc

#### 7c. `expense.service.ts`

1. Update all `"gastos"` references → `COLLECTION.EXPENSES`
2. Update protected expense paths: `"gastos/protected/{pin}/{tripId}"` → `"expenses/protected/{pin}/{tripId}"`

#### 7d. `auth.service.ts`

1. Update `getUserData` reference from `"usuarios"` → `COLLECTION.USERS`
2. Update `getPermissoes` → `getPermissions` (rename function call)
3. Add functions to read user summaries from subcollections:
   - `getUserTrips(uid)` → reads `users/{uid}/tripSummaries`
   - `getUserDestinations(uid)` → reads `users/{uid}/destinationSummaries`
   - `getUserListings(uid)` → reads `users/{uid}/listingSummaries`

### Expected Output

- 4 updated service files with English collection references
- New subcollection-aware service functions
- All TypeScript errors resolved

### Validation

```bash
npx tsc --noEmit
```

---

## 📋 Prompt 8 — Update Model Files

### Context

The model files in `public/assets/ts/models/` export pure transformation functions. They currently reference Portuguese field names (`firestoreData.inicio`, `item.descricao`, `FIRESTORE_DESTINATIONS_DATA.moeda`, etc.). These need updating to English field names.

### Task

Update all model files to use English field names:

#### 8a. `trip.model.ts`

| Old | New |
|-----|-----|
| `firestoreData.inicio` | `firestoreData.start` |
| `firestoreData.fim` | `firestoreData.end` |
| Any Portuguese field references | English equivalents |

Also import and use types from `new-schema.ts`:
```ts
import { Trip, DateObject } from './new-schema.js';

export function computeTripDuration(start: DateObject, end: DateObject): number { ... }
export function loadInicioFim(firestoreData: Trip): { ... }  // rename function? or keep name
```

#### 8b. `destination.model.ts`

| Old | New |
|-----|-----|
| `item.valor` | `item.price` |
| `item.descricao` | `item.description` |
| `FIRESTORE_DESTINATIONS_DATA.moeda` | `activeDestinationData.currency` |

Update `getNotaTranslation` → `getRatingTranslation` (optional rename, at minimum update internal refs)
Update `getPriceValue` → update `item.valor` → `item.price`
Update `getDescriptionValue` → update `item.descricao` → `item.description`

#### 8c. `expense.model.ts`

Check for any Portuguese field references and update.

#### 8d. `itinerary.model.ts`

Check for any Portuguese field references and update.

#### 8e. `traveler.model.ts`

| Old | New |
|-----|-----|
| `pessoas` | `travelers` |
| `nome` | `name` |

### Expected Output

- 5 updated model files with English field references
- JSDoc `@param` types updated to reference `new-schema.ts` interfaces
- All TypeScript errors resolved

### Validation

```bash
npx tsc --noEmit
```

---

## 📋 Prompt 9 — Update State & Config

### Context

`public/assets/ts/data/state.ts` holds global mutable state with Portuguese-named variables. `app/config.js` (or `.ts`) may have Portuguese references. These need English names.

### Task

#### 9a. Update `state.ts`

Rename these exports:

| Old Name | New Name |
|----------|----------|
| `FIRESTORE_DATA` | `appState` or keep (it's an internal name, not Portuguese) |
| `DESTINATIONS` | `activeDestinations` |
| `TRAVELERS` | (keep — already English) |
| `FIRESTORE_DESTINATIONS_DATA` | `activeDestinationData` |
| `FIRESTORE_NEW_DATA` | `pendingTripData` |
| `FIRESTORE_DESTINATIONS_NEW_DATA` | `pendingDestinationData` |
| `setDestinations()` | `setActiveDestinations()` |
| `setTravelersFn()` | `setTravelers()` |
| `setFirestoreDestinationsData()` | `setActiveDestinationData()` |
| `setFirestoreNewData()` | `setPendingTripData()` |
| `setFirestoreDestinationsNewData()` | `setPendingDestinationData()` |

**Important:** These renames will break imports across many files. For now, keep the old names as deprecated re-exports:

```ts
/** @deprecated Use `activeDestinations` */
export const DESTINATIONS = activeDestinations;
```

Then update all internal usages in `database.ts` and services first. A follow-up prompt can update all page files.

#### 9b. Update `app/config.ts`

Check for Portuguese field references in the config module (e.g., `moeda` → `currency` references) and update.

### Expected Output

- Updated `state.ts` with new English names + deprecated re-exports
- Updated `config.ts` with English field references

### Validation

```bash
npx tsc --noEmit
# Verify deprecated exports still work for pages not yet updated
```

---

## 📋 Prompt 10 — Integration: Wire Up `index.ts` + Build Validation

### Context

Now that all migrations are written and the TypeScript data layer is refactored, we need to:

1. Wire up all new Cloud Functions in `functions/src/index.ts`
2. Run a full build (`npm run build`) and fix any remaining errors
3. Ensure the migration scripts can be invoked in order

### Task

#### 10a. Update `functions/src/index.ts`

Add exports for all new migrations:

```ts
// Existing
import * as migration12 from "./migrations/12-migrate-destination-object";
export const migrate = migration12.migrate;

// New — English migration series
import * as migration13 from "./migrations/13-migrate-english-fields";
import * as migration14 from "./migrations/14-migrate-user-summaries";
import * as migration15 from "./migrations/15-migrate-trip-destinations";
import * as migration16 from "./migrations/16-migrate-accommodations-subcollection";
import * as migration17 from "./migrations/17-migrate-transportation-subcollection";
import * as migration18 from "./migrations/18-migrate-itinerary-subcollection";
import * as migration19 from "./migrations/19-migrate-collection-names";
import * as migration20 from "./migrations/20-migrate-cleanup";

export const migrateEnglishFields = migration13.migrate;
export const migrateUserSummaries = migration14.migrate;
export const migrateTripDestinations = migration15.migrate;
export const migrateAccommodationsSubcollection = migration16.migrate;
export const migrateTransportationSubcollection = migration17.migrate;
export const migrateItinerarySubcollection = migration18.migrate;
export const migrateCollectionNames = migration19.migrate;
export const migrateCleanup = migration20.migrate;
```

#### 10b. Run Full Build & Fix Errors

```bash
npm run build
```

Fix any TypeScript errors that surface from the refactored files.

#### 10c. Build Cloud Functions

```bash
cd functions && npm run build
```

Fix any TypeScript errors in the migration scripts.

### Expected Output

- Updated `functions/src/index.ts`
- Clean build for both `npm run build` (client) and `cd functions && npm run build` (Cloud Functions)
- No TypeScript errors

### Validation

```bash
# From project root:
npm run build

# From functions directory:
cd functions && npm run build
```

---

## 📋 Prompt 11 — Rename & Translate JSON Config Files (Keys + Values)

### Context

The original migration plan focused exclusively on the Firestore database, but the project also relies on **8 JSON configuration files** that act as a static data layer. These files contain Portuguese key names, enum values, and transport-type strings that are deeply referenced throughout the TypeScript codebase. They serve as *mapping tables* between the database values and the UI — if the DB switches to English but these JSON maps still use Portuguese keys, the entire UI layer breaks.

The files fall into three categories:

| Category | Files | Impact |
|----------|-------|--------|
| **DB value mappers** — keys used as lookups for Firestore field values | `transportes.json`, `destinos.json`, `itinerary.json`, `moedas.json`, `cores.json` | **CRITICAL** — mismatch = runtime errors |
| **UI icon/config maps** — keys that drive UI rendering | `icons.json`, `templates/gastos.json` | **HIGH** — broken icons & templates |
| **No change needed** | `version.json`, `languages/pt.json`, `languages/en.json` | None |

### Task

#### 11a. Rename JSON Files

Rename files to English while keeping them in the same directory:

| Old Filename | New Filename |
|-------------|-------------|
| `public/assets/json/transportes.json` | `public/assets/json/transportation.json` |
| `public/assets/json/moedas.json` | `public/assets/json/currencies.json` |
| `public/assets/json/cores.json` | `public/assets/json/colors.json` |
| `public/assets/json/destinos.json` | `public/assets/json/destinations-config.json` |

> **Note:** `destinos.json` is renamed to `destinations-config.json` (not `destinations.json`) to avoid confusion with the Firestore `destinations` collection.

#### 11b. Translate `transportation.json` (was `transportes.json`)

This is the highest-impact file — it maps transport company IDs to display names, icons, images, and websites.

**Top-level key renames:**

| Old Key | New Key |
|---------|---------|
| `empresas` | `companies` |
| `icones` | `icons` |
| `imagens` | `images` |
| `sites` | `websites` |
| `tipos` | `types` |
| `titulos` | `titles` |

**Transport type key renames (recursive in `companies`, `icons`, `images`, `websites`, `types`, `titles`):**

| Old Key | New Key |
|---------|---------|
| `carro` | `car` |
| `onibus` | `bus` |
| `voo` | `flight` |
| `trem-bala` | `bulletTrain` |
| `bicicleta` | `bicycle` |
| `bondinho` | `cableCar` |
| `helicoptero` | `helicopter` |
| `locomotiva` | `locomotive` |
| `metro` | `subway` |
| `moto` | `motorcycle` |
| `navio` | `ship` |
| `outro` | `other` |

**Theme key renames (inside `images.*.`):**

| Old Key | New Key |
|---------|---------|
| `claro` | `light` |
| `escuro` | `dark` |

**Transport type array values (the `types` array):**

Each string value in the `types` array must be translated:
- `"voo"` → `"flight"`, `"carro"` → `"car"`, `"onibus"` → `"bus"`, etc.

**Image paths:** The file paths inside `images` point to directories like `assets/img/transportes/carro/`, `assets/img/transportes/onibus/`, `assets/img/transportes/voo/`, `assets/img/transportes/trem-bala/`. These must be updated to match the new English directory names, AND the actual directories on disk must be renamed:

| Old Path | New Path |
|----------|----------|
| `assets/img/transportes/carro/` | `assets/img/transportation/car/` |
| `assets/img/transportes/onibus/` | `assets/img/transportation/bus/` |
| `assets/img/transportes/voo/` | `assets/img/transportation/flight/` |
| `assets/img/transportes/trem-bala/` | `assets/img/transportation/bulletTrain/` |

> **⚠️ Important:** Also rename the `public/assets/img/transportes/` directory itself to `public/assets/img/transportation/`.

**Title translation key updates (the `titles` object values):**

The existing title keys like `"trip.transportation.type.flight"` should be checked — the icon keys in `transportes.json` map to iconify strings (e.g., `"fa-solid:plane"`), not translation keys. The `titles` object maps transport types to translation keys — these should be verified against the language packs.

#### 11c. Translate `currencies.json` (was `moedas.json`)

| Old Key | New Key |
|---------|---------|
| `simbolos` | `symbols` |
| `escala` | `scale` |

The values (currency codes like `BRL`, `USD`) remain unchanged — they are ISO standards.

#### 11d. Translate `colors.json` (was `cores.json`)

| Old Key | New Key |
|---------|---------|
| `claro` | `light` |
| `escuro` | `dark` |
| `opcoes` | `options` |

Inside each option object:

| Old Key | New Key |
|---------|---------|
| `cor` | `color` |
| `hex` | `hex` (keep — already English) |

#### 11e. Translate `destinations-config.json` (was `destinos.json`)

This file has a dual role: it maps Portuguese category names ↔ English (via `translation` + `original` objects), AND it provides icons and category lists. After the DB migration, the source-of-truth category names will be English, so the Portuguese→English mapping can be simplified.

**Category key renames in `categorias.geral`, `categorias.passeios`, `categorias.ids`:**

Each string value in these arrays must be translated:

| Old Value | New Value |
|-----------|-----------|
| `restaurantes` | `restaurants` |
| `lanches` | `snacks` |
| `saidas` | `nightlife` |
| `turismo` | `tourism` |
| `lojas` | `shopping` |
| `mapa` | `map` |

**Icon key renames:**

| Old Key | New Key |
|---------|---------|
| `comida` | `food` |
| `lanches` | `snacks` |
| `lojas` | `shopping` |
| `mapa` | `map` |
| `turismo` | `tourism` |
| `saidas` | `nightlife` |
| `restaurantes` | `restaurants` |
| `lineup` | `lineup` (keep — already English) |
| `tourismAndShopping` | `tourismAndShopping` (keep) |

**`translation` object — SIMPLIFY:**

The `translation` object currently maps Portuguese→English. After migration, the code will use English keys directly, so this becomes a no-op mapping. Replace with a **reverse-only** approach:

```json
"translation": {
    "restaurants": "Restaurants",
    "snacks": "Snacks",
    "nightlife": "Nightlife",
    "tourism": "Tourism",
    "shopping": "Shopping",
    "map": "Map",
    "myMaps": "Map",
    "lineup": "Lineup",
    "tourismAndShopping": "Tourism & Shopping",
    "food": "Food"
}
```

**`original` object — DEPRECATE:**

The `original` object currently maps English→Portuguese. After the migration, the code won't need reverse lookups. Mark it as deprecated and keep it for backward compatibility during the transition period:

```json
"_deprecated_original": {
    "restaurants": "restaurantes",
    ...
}
```

#### 11f. Translate `itinerary.json`

| Old Key/Value | New Key/Value |
|---------------|---------------|
| `timeofday` | `timeOfDay` |
| `"madrugada"` | `"earlyMorning"` |
| `"manha"` | `"morning"` |
| `"tarde"` | `"afternoon"` |
| `"noite"` | `"night"` |

#### 11g. Translate `icons.json`

| Old Key | New Key |
|---------|---------|
| `gastosDurante` | `duringTrip` |
| `gastosPrevios` | `preTrip` |
| `gastosViajantes` | `expensesTravelers` |

#### 11h. Translate `templates/gastos.json`

| Old Key | New Key |
|---------|---------|
| `gastosPrevios` | `preTrip` |
| `gastosDurante` | `duringTrip` |
| `moeda` | `currency` |
| `pin.ativo` | `pin.active` |
| `pin.valor` | `pin.value` |

In each expense entry object:

| Old Key | New Key |
|---------|---------|
| `nome` | `name` |
| `tipo` | `type` |
| `valor` | `amount` |
| `moeda` | `currency` |

Expense type values within entries:

| Old Value | New Value |
|-----------|-----------|
| `"Transporte"` | `"Transportation"` |
| `"Hospedagens"` | `"Accommodations"` |
| `"Shows"` | `"Shows"` (already English, keep) |

### Expected Output

- 4 renamed JSON files + 3 in-place updated files
- `public/assets/img/transportes/` directory renamed to `public/assets/img/transportation/`
- All subdirectories (`carro/`, `onibus/`, `voo/`, `trem-bala/`) renamed to English (`car/`, `bus/`, `flight/`, `bulletTrain/`)
- All Portuguese keys and values translated to English
- Original files kept as copies with `.bak` extension during transition

### Validation

```bash
# Verify all JSON files are valid
for f in public/assets/json/*.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('$f: OK')"; done

# Verify old Portuguese keys no longer appear in new files
grep -r "empresas\|icones\|imagens.*transporte\|tipos.*transporte\|titulos.*transporte\|gastosPrevios\|gastosDurante\|claro.*svg\|escuro.*svg\|simbolos\|escala.*BRL\|madrugada\|manha\|tarde\|noite" public/assets/json/
```

---

## 📋 Prompt 12 — Update `config.ts` Loaders & All JSON Consumers

### Context

Prompt 11 renamed JSON files and translated their internal keys. Now every TypeScript file that loads or reads these JSON files must be updated. This is the largest surface-area change because the JSON keys are accessed via dot notation throughout ~15+ TypeScript files.

### Task

#### 12a. Update `public/assets/ts/app/config.ts`

Update all file paths and cache keys:

```ts
export async function loadColors() {
    return loadJSON('/assets/json/colors.json');  // was "cores.json"
}

export async function loadDestinations() {
    return loadJSON('/assets/json/destinations-config.json');  // was "destinos.json"
}

export async function loadCurrencies() {
    return loadJSON('/assets/json/currencies.json');  // was "moedas.json"
}

export async function loadTransportations() {
    return loadJSON('/assets/json/transportation.json');  // was "transportes.json"
}
```

Update the sync getter cache keys to match:

```ts
export function getColors() {
    return _cache['/assets/json/colors.json'];
}
export function getDestinations() {
    return _cache['/assets/json/destinations-config.json'];
}
export function getCurrencies() {
    return _cache['/assets/json/currencies.json'];
}
export function getTransportations() {
    return _cache['/assets/json/transportation.json'];
}
```

#### 12b. Update `transportation-module.ts` (HIGHEST IMPACT)

File: `public/assets/ts/pages/trip-detail/categories/transportation-module.ts`

This file is the primary consumer of `transportes.json`. It accesses nested keys deeply:

| Old Access Pattern | New Access Pattern |
|-------------------|-------------------|
| `transportes?.empresas?.[tipo]?.[titulo]` | `transportation?.companies?.[type]?.[title]` |
| `transportes?.imagens?.[tipo]?.[titulo]` | `transportation?.images?.[type]?.[title]` |
| `empresa.imagens.claro` | `company.images.light` |
| `empresa.imagens.escuro` | `company.images.dark` |

Also update the transport type comparison logic. The `tipo` variable that comes from Firestore data will now be in English (`"flight"`, `"bus"`, `"car"`) after Prompt 2's migration, so the lookups into `transportation.json` will naturally match the new English keys.

Search the file for all occurrences and update:
- `getTransportations()` calls → same function name (unchanged), but the returned object has English keys
- All `.empresas` → `.companies`
- All `.imagens` → `.images`
- All `.icones` → `.icons`
- All `.claro` → `.light`
- All `.escuro` → `.dark`

#### 12c. Update `destination.ts` and `edit-destination/` files

Files:
- `public/assets/ts/pages/destination/destination.ts`
- `public/assets/ts/pages/destination/categories.ts`
- `public/assets/ts/pages/edit-destination/categories/description.ts`
- `public/assets/ts/pages/edit-destination/categories/price.ts`

These files access `destinos.json` (now `destinations-config.json`) properties:

| Old Access Pattern | New Access Pattern |
|-------------------|-------------------|
| `destinos.categorias.geral` | `destinationsConfig.categories.general` |
| `destinos.categorias.passeios` | `destinationsConfig.categories.tours` |
| `destinos.categorias.ids` | `destinationsConfig.categories.ids` |
| `destinos.translation[categoria]` | `destinationsConfig.translation[category]` |
| `destinos.original` | Remove — use `_deprecated_original` during transition |

Also update the category key names referenced as strings in loops:

```ts
// Old:
for (const categoria of destinos.categorias.passeios) { ... }
// New:
for (const category of destinationsConfig.categories.tours) { ... }
```

#### 12d. Update `inner-itinerary.ts`

File: `public/assets/ts/pages/edit-trip/categories/itinerary-module/inner-itinerary/inner-itinerary.ts`

| Old Access Pattern | New Access Pattern |
|-------------------|-------------------|
| `getDestinations().categorias.passeios` | `getDestinations().categories.tours` |

#### 12e. Update `dom.ts`

File: `public/assets/ts/utils/dom.ts`

| Old Access Pattern | New Access Pattern |
|-------------------|-------------------|
| `getCurrencies().escala[currencyValue]` | `getCurrencies().scale[currencyValue]` |
| `getCurrencies().escala["BRL"]` | `getCurrencies().scale["BRL"]` |

#### 12f. Update `colors.ts`

File: `public/assets/ts/theme/colors.ts`

| Old Access Pattern | New Access Pattern |
|-------------------|-------------------|
| `getColors().opcoes` | `getColors().options` |
| `getColors().opcoes[i].cor` | `getColors().options[i].color` |
| `getColors().opcoes[i].hex` | `getColors().options[i].hex` (unchanged) |

#### 12g. Update `expense.model.ts`

File: `public/assets/ts/models/expense.model.ts`

| Old Access Pattern | New Access Pattern |
|-------------------|-------------------|
| `getCurrencies().opcoes` | `getCurrencies().options` |
| Ensure `preTrip`/`duringTrip` references match new `icons.json` keys |

#### 12h. Update `messages.ts`

File: `public/assets/ts/utils/messages.ts`

| Old Access Pattern | New Access Pattern |
|-------------------|-------------------|
| `properties.icones` | `properties.icons` |
| `getIconsBox(icones)` | `getIconsBox(icons)` |

#### 12i. Update `edit-trip` Transport & Accommodation Modules

Files:
- `public/assets/ts/pages/edit-trip/categories/transportation.ts`
- Any other file that reads `transportes.json` properties

Search for all references to the old JSON key names and update.

#### 12j. Update itinerary model & pages

The `itinerary.json` `timeofday` → `timeOfDay` rename affects any code that reads it. Search for `timeofday` references and update to `timeOfDay`.

### Expected Output

- `config.ts` updated with new file paths and cache keys
- All ~15 TypeScript files updated with English JSON key access patterns
- Zero occurrences of old Portuguese JSON keys in the TypeScript codebase

### Validation

```bash
npx tsc --noEmit

# Search for any remaining old key access patterns:
grep -rn "\.empresas\|\.icones\|\.imagens\|\.tipos\|\.titulos\|\.claro\|\.escuro\|\.opcoes\|\.cor\b\|\.escala\|\.simbolos\|\.categorias\.geral\|\.categorias\.passeios\|timeofday\|gastosPrevios\|gastosDurante" public/assets/ts/
```

---

## 📋 Prompt 13 — Update HTML Element IDs & Expense Template

### Context

The HTML files contain DOM element IDs that use Portuguese names (`gastosPrevios`, `gastosDurante`, `gastosViajantes`). These IDs are referenced in TypeScript code via `getID()` / `getElementById()` calls. The expense template JSON (`templates/gastos.json`) was already translated in Prompt 11, but the HTML and TS code that references its structure also needs updating.

### Task

#### 13a. Update `public/expenses.html`

Rename all Portuguese element IDs:

| Old ID | New ID |
|--------|--------|
| `radio-gastosPrevios` | `radio-preTrip` |
| `radio-gastosDurante` | `radio-duringTrip` |
| `radio-gastosViajantes` | `radio-expensesTravelers` |
| `resumo-gastosPrevios` | `summary-preTrip` |
| `resumo-gastosPrevios-titulo` | `summary-preTrip-title` |
| `resumo-gastosPrevios-tabela` | `summary-preTrip-table` |
| `resumo-gastosDurante` | `summary-duringTrip` |
| `resumo-gastosDurante-titulo` | `summary-duringTrip-title` |
| `resumo-gastosDurante-tabela` | `summary-duringTrip-table` |
| `gastosPrevios` | `preTrip` |
| `gastosPrevios-container` | `preTrip-container` |
| `gastosPrevios-titulo` | `preTrip-title` |
| `gastosPrevios-total` | `preTrip-total` |
| `gastosPrevios-grafico` | `preTrip-chart` |
| `gastosDurante` | `duringTrip` |
| `gastosDurante-container` | `duringTrip-container` |
| `gastosDurante-titulo` | `duringTrip-title` |
| `gastosDurante-total` | `duringTrip-total` |
| `gastosDurante-grafico` | `duringTrip-chart` |
| `gastosViajantes` | `expensesTravelers` (if exists) |

Also update any `name="tabs-gastos"` → `name="tabs-expenses"`.

#### 13b. Update `public/edit/trip.html`

| Old ID | New ID |
|--------|--------|
| `programacao-gastosPrevios` | `itinerary-preTrip` |

#### 13c. Update All TypeScript Files Referencing These HTML IDs

Search for all `getID("gastosPrevios...")`, `getID("gastosDurante...")`, `getID("gastosViajantes...")` calls and update to the new English IDs.

Key files to update:
- `public/assets/ts/pages/edit-trip/categories/expenses.ts` — accesses `gastosPrevios`, `gastosDurante` IDs
- `public/assets/ts/pages/expenses/` — all files in this directory
- `public/assets/ts/models/expense.model.ts` — references `gastosPrevios`, `gastosDurante`
- Any other file with `getID("gastos...")` calls

Search command to find all affected lines:
```bash
grep -rn "gastosPrevios\|gastosDurante\|gastosViajantes" public/assets/ts/ public/ --include="*.ts" --include="*.html"
```

#### 13d. Update Firestore Write Paths for Expenses

The `templates/gastos.json` template is used to create new expense documents. After Prompt 2 and 4, the Firestore expense documents will use English field names (`preTrip`, `duringTrip`, `currency`). Verify that the code that reads from/writes to expense documents uses these new field names consistently with the updated template.

### Expected Output

- `expenses.html` with all English element IDs
- `edit/trip.html` with English element IDs
- All TS files updated to use new HTML IDs
- Zero occurrences of `gastosPrevios`, `gastosDurante`, `gastosViajantes` in HTML IDs and TS code

### Validation

```bash
npx tsc --noEmit

# Verify no old Portuguese HTML IDs remain:
grep -rn "gastosPrevios\|gastosDurante\|gastosViajantes" public/ --include="*.html"

# Verify no old ID references remain in TS:
grep -rn '"gastosPrevios"\|"gastosDurante"\|"gastosViajantes"' public/assets/ts/
```

---

## 📋 Prompt 14 — Update POC Sample Data (Documentation)

### Context

`pocs/responses examples/Firestore/FIRESTORE_DATA.json` is a sample Firestore document used for testing and reference. It contains Portuguese field names throughout. While not critical to runtime, updating it ensures documentation consistency with the new English schema.

### Task

1. Translate all field names in `FIRESTORE_DATA.json` to match the new English schema
2. Translate all Portuguese enum values (`"claro"` → `"light"`, `"escuro"` → `"dark"`, etc.)
3. Update the embedded destination data to reflect the new structure
4. Add a comment at the top noting this reflects the post-migration schema

### Expected Output

- Updated `FIRESTORE_DATA.json` with English field names and values

### Validation

Manual review — compare against `new-schema.ts` interfaces.

---

## Execution Order & Dependencies

```
Prompt 1 (TS Schema) ─────────────────────────────────────────────┐
    │                                                              │
    ▼                                                              │
Prompt 2 (Migration: English Fields) ─── must run first ──────────┤
    │                                                              │
    ▼                                                              │
Prompt 3 (Migration: Structural ×5) ─── depends on Prompt 2 ──────┤
    │                                                              │
    ▼                                                              │
Prompt 4 (Migration: Collection Names) ─── depends on Prompt 3 ────┤
    │                                                              │
    ▼                                                              │
Prompt 5 (Migration: Cleanup) ─── optional, run after validation ──┤
                                                                   │
Prompt 6 (database.ts refactor) ─── can start after Prompt 1 ──────┤
    │                                                              │
    ▼                                                              │
Prompt 7 (services refactor) ─── depends on Prompt 6 ──────────────┤
    │                                                              │
    ▼                                                              │
Prompt 8 (models update) ─── depends on Prompt 1 ──────────────────┤
    │                                                              │
    ▼                                                              │
Prompt 9 (state/config) ─── depends on Prompt 6 ───────────────────┤
    │                                                              │
    ▼                                                              │
Prompt 10 (integration) ─── depends on all above ──────────────────┤
    │                                                              │
    ├──────────────────────────────────────────────────────────────┤
    │  JSON Config Layer (new prompts)                             │
    │                                                              │
    ▼                                                              │
Prompt 11 (JSON files: rename + translate keys) ─── can start after│
    │                                               Prompt 1 ──────┤
    ▼                                                              │
Prompt 12 (config.ts + all JSON consumers) ─── depends on 11 ──────┤
    │                                                              │
    ▼                                                              │
Prompt 13 (HTML IDs + expense template) ─── depends on 11, 12 ─────┤
    │                                                              │
    ▼                                                              │
Prompt 14 (POC sample data) ─── docs only, anytime ────────────────┤
```

**Parallelization:**
- Prompts 6, 8, and 11 can start after Prompt 1
- Prompts 2–5 are sequential migrations
- Prompts 11→12→13 are sequential for the JSON layer
- Prompt 14 is documentation-only, can be done anytime
- Prompt 10 is the final integration gate for all above

---

## Migration Run Order (Production)

When deploying to production, run migrations in this exact order:

```
 1. Deploy Cloud Functions (all migrations + index.ts)
 2. Run 13-migrate-english-fields       (with ?dryRun=true first)
 3. Run 14-migrate-user-summaries       (with ?dryRun=true first)
 4. Run 15-migrate-trip-destinations    (with ?dryRun=true first)
 5. Run 16-migrate-accommodations-subcollection
 6. Run 17-migrate-transportation-subcollection
 7. Run 18-migrate-itinerary-subcollection
 8. Run 19-migrate-collection-names
 9. Move/rename JSON files (Prompt 11) + rename transport img dirs
10. Deploy updated Firestore security rules
11. Deploy updated client code (TS + HTML + JSON refactored)
12. Wait 30 days, validate
13. Run 20-migrate-cleanup (optional)
14. Remove .bak JSON files and deprecated re-exports
```

---

## Appendix: Dual-Read Transition Helper

During the transition period when both old and new data may exist, use this helper in the client:

```ts
// In database.ts, add:
import { COLLECTION } from './database.js';

const COLLECTION_ALIASES: Record<string, string> = {
    [COLLECTION.USERS]: "usuarios",
    [COLLECTION.TRIPS]: "viagens",
    [COLLECTION.DESTINATIONS]: "destinos",
    [COLLECTION.LISTINGS]: "listagens",
    [COLLECTION.EXPENSES]: "gastos",
    [COLLECTION.PROTECTED]: "protegido",
};

export async function getWithFallback(newPath: string): Promise<any> {
    // Try new collection path first
    let data = await get(newPath, false, true); // hideWarn=true
    if (data) return data;

    // Fall back to old Portuguese path
    for (const [newName, oldName] of Object.entries(COLLECTION_ALIASES)) {
        if (newPath.startsWith(newName)) {
            const oldPath = newPath.replace(newName, oldName);
            return await get(oldPath, false, true);
        }
    }
    return null;
}
```

Remove this helper after the migration is complete and all clients have been updated.
