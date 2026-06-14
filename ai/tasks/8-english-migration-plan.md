# 🇬🇧 E048: English Translation & Optimized Redesign — Implementation Plan

> **Created:** 2026-06-14
> **Based on:** `ai/analysis/new-database-proposal.md` (Option B)
> **Status:** Not started
> **Goal:** Migrate the entire Firestore database from Portuguese → English field names, enum values, and collection names, while restructuring to subcollections (Option B — Optimized Redesign). Then refactor all TypeScript set/read functions to match.

---

## Summary

This plan implements **Option B** from the database proposal: full English translation + structural optimization. The database is small (~2 MB, <100 docs), so migration is fast and low-risk. The plan is organized into **10 prompts** that an AI can execute sequentially.

### Key Deliverables

| # | What | Where |
|---|------|-------|
| 1 | New TypeScript schema interfaces | `public/assets/ts/models/` |
| 2 | Migration Cloud Functions (7 scripts) | `functions/src/migrations/` |
| 3 | Refactored database.ts with English paths | `public/assets/ts/data/firebase/database.ts` |
| 4 | Refactored services with subcollection reads | `public/assets/ts/data/services/` |
| 5 | Updated models with English types | `public/assets/ts/models/` |
| 6 | Updated state.ts with English names | `public/assets/ts/data/state.ts` |

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
   - `modules: { destinations: boolean, transportation: boolean, schedule: boolean, gallery: boolean, summary: boolean, accommodations: boolean, expenses: boolean }`
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

7. **`ScheduleDay`** — Document at `trips/{tripId}/schedule/{dayId}`:
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
export type ScheduleItemType = "destination" | "transportation" | "accommodation";
export type SchedulePeriod = "earlyMorning" | "morning" | "afternoon" | "night";
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
| `programacoes` | `schedule` |
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
| `valor` (schedule title) | `value` |
| `destinos` (schedule title boolean) | `showDestinations` |
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
| schedule `item.type` | `"destinos"` | `"destination"` |
| schedule `item.type` | `"transporte"` | `"transportation"` |
| schedule `item.type` | `"hospedagens"` | `"accommodation"` |
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

#### 3e. `functions/src/migrations/18-migrate-schedule-subcollection.ts`

**Purpose:** Move `schedule` array from trip doc into `viagens/{id}/schedule/*` subcollection.

**What it does:**
1. Read each document in `viagens` collection
2. For each trip doc, extract `schedule` array (was `programacoes`, renamed by Prompt 2)
3. For each schedule day, generate a unique ID (or use the date as ID: `day-{index}`), write to `viagens/{tripId}/schedule/{dayId}`
4. Remove `schedule` field from trip doc

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
- `viagens/{id}/schedule/*` → `trips/{id}/schedule/*`

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

The new schema also introduces subcollections for accommodations, transportation, schedule, and user summaries — the database layer needs functions to read/write these.

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
    SCHEDULE: "schedule",
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

/** Get all schedule days for a trip */
export async function getSchedule(tripId: string): Promise<ScheduleDay[]> {
    const snapshot = await firebase.firestore()
        .collection(`${COLLECTION.TRIPS}/${tripId}/${SUBCOLLECTION.SCHEDULE}`)
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
    schedule: ScheduleDay[],
    destinations: Destination[],
}> {
    const tripData = await get(`${COLLECTION.TRIPS}/${tripId}`) as Trip;
    if (!tripData) return null;

    const [accommodations, transportation, schedule, destinations] = await Promise.all([
        getAccommodations(tripId),
        getTransportation(tripId),
        getSchedule(tripId),
        tripData.destinationRefs?.length
            ? Promise.all(tripData.destinationRefs.map(ref =>
                get(`${COLLECTION.DESTINATIONS}/${ref.id}`, false)))
            : Promise.resolve([]),
    ]);

    return { ...tripData, accommodations, transportation, schedule, destinations };
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
   - `getAccommodations`, `getTransportation`, `getSchedule` for subcollections
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
   - `getTripSchedule(tripId)` → `getSchedule(tripId)`
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
import * as migration18 from "./migrations/18-migrate-schedule-subcollection";
import * as migration19 from "./migrations/19-migrate-collection-names";
import * as migration20 from "./migrations/20-migrate-cleanup";

export const migrateEnglishFields = migration13.migrate;
export const migrateUserSummaries = migration14.migrate;
export const migrateTripDestinations = migration15.migrate;
export const migrateAccommodationsSubcollection = migration16.migrate;
export const migrateTransportationSubcollection = migration17.migrate;
export const migrateScheduleSubcollection = migration18.migrate;
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
Prompt 10 (integration) ─── depends on all above ──────────────────┘
```

**Parallelization:** Prompts 6 and 8 can run in parallel after Prompt 1. Prompts 2–5 are sequential migrations. Prompt 10 is the final gate.

---

## Migration Run Order (Production)

When deploying to production, run migrations in this exact order:

```
1. Deploy Cloud Functions (all migrations +index.ts)
2. Run 13-migrate-english-fields       (with ?dryRun=true first)
3. Run 14-migrate-user-summaries       (with ?dryRun=true first)
4. Run 15-migrate-trip-destinations    (with ?dryRun=true first)
5. Run 16-migrate-accommodations-subcollection
6. Run 17-migrate-transportation-subcollection
7. Run 18-migrate-schedule-subcollection
8. Run 19-migrate-collection-names
9. Deploy updated Firestore security rules
10. Deploy updated client code (TS refactored pages)
11. Wait 30 days, validate
12. Run 20-migrate-cleanup (optional)
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
