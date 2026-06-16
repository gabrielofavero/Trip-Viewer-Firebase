# Database Migration Proposal: English Translation & Optimization

**Date:** 2026-06-14
**Status:** Proposal — awaiting decision
**Author:** Copilot (based on Firestore/Auth intensity analysis + current DB schema)

---

## Table of Contents

1. [Context & Scope](#context--scope)
2. [Current State Summary](#current-state-summary)
3. [Enum Value Translation](#enum-value-translation)
4. [TypeScript Impact](#typescript-impact)
5. [Option A: Simple Translation](#option-a-simple-translation)
6. [Option B: Optimized Redesign](#option-b-optimized-redesign)
7. [Comparison Matrix](#comparison-matrix)
8. [Recommendation](#recommendation)
9. [Migration Strategy](#migration-strategy)

---

## Context & Scope

### Database Size

The current Firestore database is **approximately 2 MB** total across all collections. This is very small — likely fewer than 100 documents total across all collections (a typical trip document with embedded destinations, accommodations, transportation, and itinerary runs ~50–200 KB).

**Implication:** Migration costs are proportionally low. Both Option A (rename-only) and Option B (restructure) can process the entire database in a **single migration run** of under a minute. The risk of hitting Firestore quotas during migration is near-zero. The 1 MiB per-document limit is not an immediate threat, but is a growth concern worth addressing now while the dataset is small.

### Translation Scope

The goal is a **full translation** — not just field names and collection names, but **every Portuguese string stored as data**:

| Category | Examples |
|----------|----------|
| **Field names** | `titulo` → `title`, `hospedagens` → `accommodations` |
| **Collection names** | `usuarios` → `users`, `viagens` → `trips`, `gastos` → `expenses` |
| **Enum/constant values** | `"ida"` → `"departure"`, `"voo"` → `"flight"`, `"claro"` → `"light"` |
| **Nested object keys** | `datas.checkin` → `dates.checkIn`, `pontos.partida` → `points.origin` |
| **Itinerary item types** | `"destinos"` → `"destination"`, `"hospedagens"` → `"accommodation"` |
| **User visibility modes** | `"dinamico"` → `"dynamic"` |

No Portuguese string should remain in the database after migration. See [Enum Value Translation](#enum-value-translation) for the complete dictionary.

---

## Current State Summary

All field names, collection names, document keys, and many **data values** are in **Portuguese**. The core collections are:

| Collection | Portuguese | English | Purpose |
|-----------|-----------|---------|---------|
| `usuarios` | usuários | users | User profiles & owned-object indexes |
| `viagens` | viagens | trips | Trip documents (the core entity) |
| `destinos` | destinos | destinations | Destination/place catalogs |
| `listagens` | listagens | listings | Public listing cards |
| `gastos` | gastos | expenses | Trip expense records |
| `protegido` | protegido | protected | PIN metadata for protected data |

### Current Field Mapping (Portuguese → English)

#### `viagens/{id}` (Trip Document)

| Portuguese | English | Type | Notes |
|-----------|---------|------|-------|
| `titulo` | `title` | string | |
| `versao` | `version` | object | `{ultimaAtualizacao}` |
| `visibilidade` | `visibility` | object | `{claro, escuro}` |
| `destinos` | `destinations` | array | `[{destinosID, destinos: {...}}]` |
| `inicio` | `start` | DateObject | `{day, month, year, hour, minute, second}` |
| `fim` | `end` | DateObject | `{day, month, year, hour, minute, second}` |
| `cores` | `colors` | object | `{claro, escuro, ativo}` |
| `compartilhamento` | `sharing` | object | `{dono, ativo, editores}` |
| `modulos` | `modules` | object | boolean flags per module |
| `moeda` | `currency` | string | ISO code |
| `pin` | `pin` | string | `"sensitive-only"` or `"no-pin"` |
| `pessoas` | `travelers` | array | `[{id, nome}]` |
| `hospedagens` | `accommodations` | array | See sub-fields below |
| `transportes` | `transportation` | object | `{visualizacao, dados}` |
| `programacoes` | `itinerary` | array | Day-by-day itinerary |
| `galeria` | `gallery` | object | `{categorias, descricoes, imagens, titulos}` |
| `links` | `links` | object | `{maps, attachments, drive, pdf, ppt, sheet, vacina, ativo}` |

#### Accommodation Sub-fields (`hospedagens[i]`)

| Portuguese | English | Type |
|-----------|---------|------|
| `nome` | `name` | string |
| `descricao` | `description` | string |
| `endereco` | `address` | string |
| `datas` | `dates` | object `{checkin, checkout}` |
| `cafe` | `breakfast` | boolean |
| `imagens` | `images` | array `[{descricao, link}]` |
| `reserva` | `reservation` | string |
| `link` | `link` | string |

#### Transportation Sub-fields (`transportes.dados[i]`)

| Portuguese | English | Type |
|-----------|---------|------|
| `transporte` | `type` | string (voo, onibus, carro) |
| `empresa` | `company` | string |
| `pontos` | `points` | object `{partida, chegada}` |
| `datas` | `dates` | object `{partida, chegada}` |
| `duracao` | `duration` | string |
| `idaVolta` | `direction` | string (ida, volta, durante) |
| `reserva` | `reservation` | string |
| `pessoa` | `person` | string (traveler ref) |
| `visualizacao` | `viewMode` | string |

#### Itinerary Sub-fields (`programacoes[i]`)

| Portuguese | English | Type |
|-----------|---------|------|
| `titulo` | `title` | object `{valor, destinos, traduzir}` |
| `data` | `date` | DateObject |
| `destinosIDs` | `destinationIds` | string[] |
| `madrugada` | `earlyMorning` | PeriodItem[] |
| `manha` | `morning` | PeriodItem[] |
| `tarde` | `afternoon` | PeriodItem[] |
| `noite` | `night` | PeriodItem[] |

#### PeriodItem Sub-fields (itinerary entries)

| Portuguese | English | Type |
|-----------|---------|------|
| `programacao` | `label` | string |
| `inicio` | `startTime` | string (HH:mm) |
| `fim` | `endTime` | string (HH:mm) |
| `pessoas` | `travelers` | array `[{id, nome, isPresent}]` |
| `item` | `item` | object `{tipo, id, categoria, local}` |

#### `destinos/{id}` (Destination Document)

| Portuguese | English | Type |
|-----------|---------|------|
| `titulo` | `title` | string |
| `moeda` | `currency` | string |
| `versao` | `version` | object |
| `compartilhamento` | `sharing` | object |
| `modulos` | `modules` | object |
| `myMaps` | `myMaps` | string |
| `restaurantes` | `restaurants` | object (keyed by ID) |
| `lanches` | `snacks` | object (keyed by ID) |
| `lojas` | `shops` | object (keyed by ID) |
| `saidas` | `nightlife` | object (keyed by ID) |
| `turismo` | `attractions` | object (keyed by ID) |

#### Category Item Fields (within destination categories)

| Portuguese | English | Type |
|-----------|---------|------|
| `nome` | `name` | string |
| `descricao` | `description` | object `{pt, en}` |
| `nota` | `rating` | string |
| `valor` | `price` | string |
| `mapa` | `map` | string (URL) |
| `website` | `website` | string |
| `regiao` | `region` | string |
| `novo` | `isNew` | boolean |
| `criadoEm` | `createdAt` | string (ISO) |
| `midia` | `media` | string (URL) |
| `emoji` | `emoji` | string |

#### `usuarios/{uid}` (User Document)

| Portuguese | English | Type |
|-----------|---------|------|
| `viagens` | `trips` | object `{id: {title, start, end, image, colors, version, pin, modules}}` |
| `destinos` | `destinations` | object `{id: {title, currency, version}}` |
| `listagens` | `listings` | object `{id: {title, subtitle, description, image, colors, version}}` |
| `visibilidade` | `visibility` | string |
| `permissoes` | `permissions` | object |

#### `gastos/{tripId}` (Expenses Document)

| Portuguese | English | Type |
|-----------|---------|------|
| `gastosDurante` | `duringTrip` | array of expense entries |
| `gastosPrevios` | `preTrip` | array of expense entries |
| `orcamento` | `budget` | object |

#### `protegido/{tripId}` → `protected/{tripId}`

| Portuguese | English | Type |
|-----------|---------|------|
| `pin` | `pin` | string |

---

## Enum Value Translation

These are **Portuguese string values stored as data** (not field names) that must be translated to English. Unlike field renames, these require updating both the migration script AND any client-side code that compares against these strings.

### Transportation Type (`transporte` → `type`)

| Portuguese | English |
|-----------|---------|
| `"voo"` | `"flight"` |
| `"onibus"` | `"bus"` |
| `"carro"` | `"car"` |

### Transportation Direction (`idaVolta` → `direction`)

| Portuguese | English |
|-----------|---------|
| `"ida"` | `"departure"` |
| `"volta"` | `"return"` |
| `"durante"` | `"during"` |

### Transportation View Mode (`visualizacao` → `viewMode`)

| Portuguese | English |
|-----------|---------|
| `"simple-view"` | `"simple"` |
| `"leg-view"` | `"leg"` |

### PIN Type (`pin`)

| Portuguese | English |
|-----------|---------|
| `"sensitive-only"` | `"sensitive-only"` *(already English)* |
| `"no-pin"` | `"no-pin"` *(already English)* |

### Visibility / Theme (`visibilidade`)

| Portuguese | English |
|-----------|---------|
| `"claro"` | `"light"` |
| `"escuro"` | `"dark"` |
| `"ativo"` | `"active"` |

### User Visibility Mode (`visibilidade` on user doc)

| Portuguese | English |
|-----------|---------|
| `"dinamico"` | `"dynamic"` |

### Itinerary Item Type (`item.tipo`)

| Portuguese | English |
|-----------|---------|
| `"destinos"` | `"destination"` |
| `"transporte"` | `"transportation"` |
| `"hospedagens"` | `"accommodation"` |

### Itinerary Period Names (keys in `programacoes[i]`)

| Portuguese | English |
|-----------|---------|
| `"madrugada"` | `"earlyMorning"` |
| `"manha"` | `"morning"` |
| `"tarde"` | `"afternoon"` |
| `"noite"` | `"night"` |

### Destination Category Names (keys in `destinos/{id}`)

| Portuguese | English |
|-----------|---------|
| `"restaurantes"` | `"restaurants"` |
| `"lanches"` | `"snacks"` |
| `"lojas"` | `"shops"` |
| `"saidas"` | `"nightlife"` |
| `"turismo"` | `"attractions"` |

### Destination Module Keys (`modulos` in destinations)

| Portuguese | English |
|-----------|---------|
| `"saidas"` | `"nightlife"` |
| `"restaurantes"` | `"restaurants"` |
| `"lojas"` | `"shops"` |
| `"turismo"` | `"attractions"` |
| `"lanches"` | `"snacks"` |
| `"mapa"` | `"map"` |

### Trip Module Keys (`modulos` in trips)

| Portuguese | English |
|-----------|---------|
| `"destinos"` | `"destinations"` |
| `"transportes"` | `"transportation"` |
| `"programacao"` | `"itinerary"` |
| `"galeria"` | `"gallery"` |
| `"resumo"` | `"summary"` |
| `"hospedagens"` | `"accommodations"` |
| `"gastos"` | `"expenses"` |

### Link Keys (`links`)

| Portuguese | English |
|-----------|---------|
| `"vacina"` | `"vaccine"` |
| `"ativo"` | `"active"` |

### Itinerary Title Object Keys

| Portuguese | English |
|-----------|---------|
| `"valor"` | `"value"` |
| `"destinos"` | `"showDestinations"` |
| `"traduzir"` | `"translate"` |

### Sharing Object Keys (`compartilhamento` → `sharing`)

| Portuguese | English |
|-----------|---------|
| `"dono"` | `"owner"` |
| `"ativo"` | `"active"` |
| `"editores"` | `"editors"` |

### Version Object Key

| Portuguese | English |
|-----------|---------|
| `"ultimaAtualizacao"` | `"lastUpdated"` |

### Dates Object Keys (`datas` → `dates`)

| Portuguese | English |
|-----------|---------|
| `"checkin"` | `"checkIn"` |
| `"checkout"` | `"checkOut"` |
| `"partida"` (departure) | `"departure"` |
| `"chegada"` (arrival) | `"arrival"` |

### Expense Entry Fields (within `gastos` → `expenses`)

| Portuguese | English |
|-----------|---------|
| `"gastosDurante"` | `"duringTrip"` |
| `"gastosPrevios"` | `"preTrip"` |
| `"orcamento"` | `"budget"` |

> **Note on company names:** Values like `"tap"`, `"britishAirways"`, `"aerLingus"` are proper nouns/kebab-case identifiers and are already English-compatible. The field name `empresa` → `company` is what gets translated; the values stay as-is.

---

## TypeScript Impact

### Current TS Codebase

The client-side code lives in `public/assets/ts/` (~124 `.ts` files). Key areas affected by the migration:

| Layer | Path | Impact |
|-------|------|--------|
| **Firestore data** | `data/firebase/database.ts`, `auth.ts`, `storage.ts` | All field names in read/write paths |
| **Services** | `data/services/trip.service.ts`, `destination.service.ts`, `expense.service.ts`, `auth.service.ts` | All method return types, parameter types |
| **State** | `data/state.ts` | `FIRESTORE_DATA` type shape, `DESTINATIONS`, `TRAVELERS` |
| **Models** | `models/trip.model.ts`, `destination.model.ts`, `traveler.model.ts`, `expense.model.ts`, `itinerary.model.ts` | Core type definitions for all entities |
| **Pages** | `pages/home/`, `pages/trip-detail/`, `pages/destination/`, `pages/edit-trip/`, `pages/edit-destination/`, `pages/edit-listing/`, `pages/expenses/`, `pages/itinerary/` | All UI field access patterns |
| **UI** | `ui/fields.ts`, `ui/embed.ts`, `ui/dynamic-select.ts`, etc. | Field name references in form builders |
| **Backup** | `backup/backup.ts`, `restore.ts` | Read/write paths for backup/restore |
| **Utils** | `utils/dates.ts`, `utils/pin.ts`, `utils/set.ts` | Date object shapes, PIN handling |

### Migration Strategy for TS Files

**Option A (simple translation):** Every `.ts` file that touches Firestore data needs find-and-replace of field name strings. This is mechanical but touches ~40+ files. A shared type definition file can ease the transition — define the new field names once and import them everywhere.

**Option B (optimized redesign):** The TS models are rewritten from scratch with the new schema. Since we're already fully TypeScript (`.ts` → compiled to `.js` in `dist/`), we can define the new English interfaces and refactor directly — no legacy JS to carry forward.

### Recommended TS Approach

Since the codebase is already 100% TypeScript (`public/assets/ts/` compiled to `dist/`), the DB migration should:

1. **Define the new schema as TypeScript interfaces first** — create `models/new-schema.ts` with all interfaces (`Trip`, `Destination`, `Accommodation`, `TransportLeg`, `ItineraryDay`, `ExpenseEntry`, `UserProfile`, etc.) using English names and English enum literals.
2. **Write the migration to target the TS interfaces** — the Cloud Function migration script becomes the reference implementation of the schema.
3. **Refactor TS services/models to the new interfaces** — the existing TS files in `public/assets/ts/` are updated to match.
4. **Refactor all TS files to the new schema** — update field access, enum comparisons, and type annotations across all layers (services, models, pages, UI, utils, backup).

This avoids writing TypeScript types for the old Portuguese schema — we go straight to English types.

---

## Option A: Simple Translation

### Concept

Do a **1:1 field-name and enum-value translation** across all documents. No structural changes, no denormalization, no new collections. Each Portuguese field is renamed to its English equivalent via a Firestore migration script.

### Changes

- Rename all field names from Portuguese → English (see mapping tables above)
- Rename all **enum values** from Portuguese → English (see [Enum Value Translation](#enum-value-translation))
- Rename collection paths:
  - `usuarios/{uid}` → `users/{uid}`
  - `viagens/{id}` → `trips/{id}`
  - `destinos/{id}` → `destinations/{id}`
  - `listagens/{id}` → `listings/{id}`
  - `gastos/{id}` → `expenses/{id}`
  - `protegido/{id}` → `protected/{id}`
- Rename subcollection paths:
  - `viagens/protected/{pin}/{id}` → `trips/protected/{pin}/{id}`
  - `gastos/protected/{pin}/{id}` → `expenses/protected/{pin}/{id}`
- Update ~40+ TypeScript files in `public/assets/ts/` (see [TypeScript Impact](#typescript-impact))
- Update all `.ts` source files to use English field names and enum values
- Update Firestore security rules to match new collection names, field paths, and enum values
- Rename `DESTINOS_ATIVOS` cache variable → `activeDestinations`
- Rename all model/service variable references

### Pros

| Pro | Detail |
|-----|--------|
| 🟢 **Lowest risk** | No data restructuring — just rename fields. Less chance of data loss or corruption. |
| 🟢 **Predictable effort** | Each field is a known quantity. Easy to estimate (~2–3 days of migration script + ~1 week of code updates). |
| 🟢 **Backward compatible during rollout** | Can use a dual-read pattern: try English field first, fall back to Portuguese. |
| 🟢 **Minimal Firestore cost** | One write per document to rename fields. Exact same document count. |
| 🟢 **Easier code review** | Each change is mechanical: find `titulo` → replace with `title`. |
| 🟢 **No Firestore rule logic changes** | Rules just change field names, not structure. |

### Cons

| Con | Detail |
|-----|--------|
| 🔴 **Preserves all current inefficiencies** | N+1 destination reads, large user document, unbounded parallel backup reads, sequential protected reads — ALL remain. |
| 🔴 **Deferred technical debt** | The structural problems identified in `firestore-auth-intensity.md` are punted to a future migration. Each future migration adds complexity and risk. |
| 🔴 **Double migration cost** | If we do Option B later, we pay the translation cost + the redesign cost separately. |
| 🟡 **User document still unbounded** | The `users/{uid}` document continues to embed all trip/destination/listing summaries inline, growing toward the 1 MiB Firestore limit. |
| 🟡 **Code churn with no perf gain** | Every file touching Firestore needs updating, but read/write patterns don't improve. |

### Migration Script Complexity

**Medium.** The migration script needs to:
1. Read each document
2. Create a new document with translated field names in the new collection
3. Copy the old document data field-by-field with renaming
4. Delete the old document (or keep for a grace period)
5. Handle nested objects recursively (accommodations, transportation, itinerary, expenses)

Batch writes (max 500 ops/batch) can handle ~250 documents per batch (1 delete + 1 create each).

---

## Option B: Optimized Redesign

### Concept

Redesign the data model from the ground up with **English naming + structural optimizations** that directly address the issues identified in `firestore-auth-intensity.md`. This is a **new schema** — not just a rename.

### Core Principles

1. **Flat is fast** — Denormalize where it eliminates reads
2. **Read amplification is the enemy** — No N+1 patterns in core paths
3. **Documents have boundaries** — Use subcollections for unbounded data
4. **Parallel by default** — Design for `Promise.all()`, not sequential `await`

---

### Proposed Schema

#### Collection: `users/{uid}`

```ts
{
  // Core identity — slim, stable, never grows
  visibility: "dynamic",            // was "visibilidade": "dinamico"
  permissions: { ... },             // was "permissoes"

  // Move previously-embedded summaries to subcollections (see below)
  // NO trip/destination/listing summaries embedded here anymore
}
```

**Change from current:** The `trips`, `destinations`, `listings` summary objects are **removed** from the user document. They now live in subcollections. This fixes the **unbounded user document growth** issue (🟡 Medium #6).

**New subcollections:**

```
users/{uid}/tripSummaries/{tripId}     → { title, start, end, image, colors, version, pin, modules }
users/{uid}/destinationSummaries/{id}  → { title, currency, version }
users/{uid}/listingSummaries/{id}      → { title, subtitle, description, image, colors, version }
```

**Why:** Each summary is a separate small document. Queries can be limited/paginated. No risk of hitting the 1 MiB document limit. A user with 200 trips pays only for what they view.

---

#### Collection: `trips/{id}`

```ts
{
  // ── Core ──
  title: string,                     // was "titulo"
  start: DateObject,                 // was "inicio"  {day, month, year, hour, minute, second}
  end: DateObject,                   // was "fim"
  currency: string,                  // was "moeda"
  pin: "sensitive-only" | "no-pin",

  // ── Metadata ──
  version: { lastUpdated: string },  // was "versao.ultimaAtualizacao"
  visibility: { light: boolean, dark: boolean },
  colors: { light: string, dark: string, active: boolean },
  sharing: {
    owner: string,                   // was "dono"
    active: boolean,                 // was "ativo"
    editors: string[],
  },
  modules: {
    destinations: boolean,
    transportation: boolean,
    itinerary: boolean,
    gallery: boolean,
    summary: boolean,
    accommodations: boolean,
    expenses: boolean,
  },

  // ── Embedded (small, bounded data) ──
  travelers: [{                      // was "pessoas"
    id: string,
    name: string,                    // was "nome"
  }],

  links: {
    maps: string,
    attachments: string,
    active: boolean,
    drive: string,
    pdf: string,
    ppt: string,
    sheet: string,
    vaccine: string,                 // was "vacina"
  },

  gallery: {
    categories: string[],
    descriptions: string[],
    images: string[],
    titles: string[],
  },

  // ── Destination References (lightweight, resolved in parallel) ──
  destinationRefs: [{                // was "destinos"
    id: string,                      // was "destinosID"
    // Destination data NO LONGER embedded — fetched in parallel
  }],
}
```

**Change from current:** The `destinos` array no longer embeds the full destination object. It stores only `{id}` references. The destination data is fetched in parallel via `Promise.all()` — fixing the 🔴 Critical N+1 issue.

---

#### Collection: `trips/{id}/accommodations` (NEW subcollection)

**Previously:** `hospedagens` was an array embedded in the trip document.

**Why change:** Accommodations can be numerous (10+ per trip for long trips). Moving to a subcollection:
- Allows reading only what's needed (lazy loading)
- Each accommodation can be updated independently without rewriting the entire trip
- Accommodation images can be large (array of URLs + descriptions)

```ts
// Document: trips/{tripId}/accommodations/{accommodationId}
{
  name: string,                      // was "nome"
  description: string,               // was "descricao"
  address: string,                   // was "endereco"
  dates: {
    checkIn: DateObject,             // was "checkin"
    checkOut: DateObject,            // was "checkout"
  },
  breakfast: boolean,                // was "cafe"
  images: [{
    description: string,             // was "descricao"
    link: string,
  }],
  reservation: string,               // was "reserva" (empty in public, filled in protected)
  link: string,                      // (empty in public, filled in protected)
}
```

---

#### Collection: `trips/{id}/transportation` (NEW subcollection)

**Previously:** `transportes` was an object with `{visualizacao, dados:[...]}` embedded in the trip document.

```ts
// Document: trips/{tripId}/transportation/{transportId}
{
  type: string,                      // was "transporte" (flight, bus, car)
  company: string,                   // was "empresa"
  points: {
    origin: string,                  // was "partida"
    destination: string,             // was "chegada"
  },
  dates: {
    departure: DateObject,           // was "partida"
    arrival: DateObject,             // was "chegada"
  },
  duration: string,                  // was "duracao"
  direction: string,                 // was "idaVolta" (departure, return, during)
  reservation: string,               // was "reserva"
  link: string,
  person: string,                    // was "pessoa"
}
```

**Transportation settings (per-trip):** stored as a single doc:
```ts
// Document: trips/{tripId}/transportation/_settings
{
  viewMode: "simple" | "leg",        // was "visualizacao"
}
```

---

#### Collection: `trips/{id}/itinerary` (NEW subcollection)

**Previously:** `programacoes` was an array embedded in the trip document.

```ts
// Document: trips/{tripId}/itinerary/{dayId}
{
  title: {
    value: string,                   // was "valor"
    showDestinations: boolean,       // was "destinos"
    translate: boolean,              // was "traduzir"
  },
  date: DateObject,                  // was "data"
  destinationIds: string[],          // was "destinosIDs"
  earlyMorning: [{                   // was "madrugada"
    label: string,                   // was "programacao"
    startTime: string,               // was "inicio"
    endTime: string,                 // was "fim"
    travelers: [{
      id: string,
      name: string,
      isPresent: boolean,
    }],
    item: {
      type: string,                  // "destination" | "transportation" | "accommodation"
      id: string,
      category: string,
      location: string,
    },
  }],
  morning: PeriodItem[],             // was "manha"
  afternoon: PeriodItem[],           // was "tarde"
  night: PeriodItem[],               // was "noite"
}
```

---

#### Collection: `destinations/{id}`

```ts
{
  title: string,                     // was "titulo"
  currency: string,                  // was "moeda"
  version: { lastUpdated: string },
  sharing: {
    owner: string,
    active: boolean,
  },
  modules: {
    nightlife: boolean,              // was "saidas"
    restaurants: boolean,
    shops: boolean,
    attractions: boolean,            // was "turismo"
    snacks: boolean,                 // was "lanches"
    map: boolean,                    // was "mapa"
  },
  myMaps: string,

  // Categories — already keyed by ID (good pattern, kept)
  restaurants: Record<string, PlaceItem>,
  snacks: Record<string, PlaceItem>,
  shops: Record<string, PlaceItem>,
  nightlife: Record<string, PlaceItem>,
  attractions: Record<string, PlaceItem>,
}
```

**PlaceItem:**
```ts
{
  name: string,                      // was "nome"
  description: {                     // was "descricao"
    pt: string,
    en: string,
  },
  rating: string,                    // was "nota"
  price: string,                     // was "valor"
  map: string,                       // was "mapa"
  website: string,
  region: string,                    // was "regiao"
  instagram: string,
  isNew: boolean,                    // was "novo"
  createdAt: string,                 // was "criadoEm"
  media: string,                     // was "midia"
  emoji: string,
}
```

**Note on destination categories:** The current pattern (object keyed by random ID, e.g., `restaurants: { "FP6oe": {...}, "85VIl": {...} }`) is **kept** because migration 12 already established this structure. It's a reasonable pattern — O(1) access by ID, and the document size is bounded by what a user realistically adds to one destination.

---

#### Collection: `expenses/{tripId}`

```ts
{
  duringTrip: ExpenseEntry[],        // was "gastosDurante"
  preTrip: ExpenseEntry[],           // was "gastosPrevios"
  budget: object,                    // was "orcamento"
}
```

(ExpenseEntry structure remains the same — just field name translations within each entry.)

---

#### Collection: `protected/{tripId}` (was `protegido`)

```ts
{
  pin: string,
}
```

**Protected subcollections:**
```
trips/protected/{pin}/{tripId}       → sensitive accommodation + transportation data
expenses/protected/{pin}/{tripId}    → protected expense data
```
(These remain structurally similar, just with translated field names.)

---

#### Collection: `listings/{id}`

(Structure similar to current, with translated field names.)

---

#### New: `config/system`

```ts
{
  registrationOpen: boolean,
  // ... other system config
}
```

(No structural change, only field name translations.)

---

### Key Optimizations Summary

| # | Issue (from intensity analysis) | Severity | How Option B Fixes It |
|---|--------------------------------|----------|----------------------|
| 1 | Sequential N+1 destination reads | 🔴 Critical | Destination refs are just `{id}` in trip doc. Destinations fetched via `Promise.all()` in parallel. |
| 2 | Unbounded parallel backup reads | 🔴 Critical | Trips/accommodations/transportation are subcollections. Backup reads can be chunked with natural boundaries (collection groups). |
| 3 | Sequential protected reads on delete | 🟠 High | Protected subcollections can be queried in parallel via collection group queries instead of sequential `get()` calls. |
| 4 | Restore massive batch + sequential reads | 🟠 High | Subcollection structure means restores are naturally chunked. Each subcollection is a separate batch. |
| 5 | Redundant `onAuthStateChanged` listeners | 🟠 High | Consolidated auth module (code-level fix, not DB schema — but migration is the right time to refactor). |
| 6 | Large user document (unbounded growth) | 🟡 Medium | User doc is slim. Summaries are in `users/{uid}/tripSummaries`, `destinationSummaries`, `listingSummaries` subcollections. |
| 7 | View page hits N+1 chain | 🟡 Medium | Fixed by #1 above. |
| 8 | Edit trip — 3 sequential reads | 🟡 Medium | Trip, protected data, and expenses can be fetched in parallel (code refactor during migration). |
| 9 | No offline persistence | 🟡 Medium | Code-level fix (enablePersistence), included in migration scope. |
| 10 | `getUserData` race condition | 🟡 Medium | Promise deduplication (code fix during migration). |
| 11 | localStorage as cache for expenses | 🟢 Low | Use `postMessage` API (code fix during migration). |
| 12 | In-memory destination cache | 🟢 Low | With parallel fetches + offline persistence, cache becomes less critical. |

---

### Pros

| Pro | Detail |
|-----|--------|
| 🟢 **Fixes all identified performance issues** | Every 🔴 and 🟠 issue from the intensity analysis is addressed structurally. |
| 🟢 **Future-proof** | Document size limits won't be an issue. Subcollections scale indefinitely. |
| 🟢 **Better offline support** | Subcollections allow fine-grained caching. Firestore persistence caches individual small docs efficiently. |
| 🟢 **Improved read efficiency** | 10 destinations = 1 trip read + 10 parallel destination reads (50–200ms total) vs. 11 sequential reads (0.5–2s). |
| 🟢 **Cheaper Firestore bills** | Fewer reads per page view. Parallel reads count the same as sequential, but the data is leaner (no embedded destinations in trip doc). |
| 🟢 **Better developer experience** | English field names are universally understood. New contributors don't need a Portuguese glossary. |
| 🟢 **Cleaner backup/restore** | Subcollections can be backed up and restored independently with natural chunking. |

### Cons

| Con | Detail |
|-----|--------|
| 🔴 **High implementation effort** | ~3–4 weeks of migration script + code refactoring. Every page, service, and model needs updating. |
| 🔴 **Complex migration script** | Must handle nested data (accommodations within trips → subcollection docs), data integrity validation, and rollback capability. |
| 🔴 **More Firestore writes during migration** | Creating subcollections means more documents overall. May incur one-time migration cost. |
| 🔴 **Firestore rule rewrite** | Security rules need to match the new subcollection structure. More rules, more complexity. |
| 🟡 **More documents to manage** | ~5× more documents (accommodations, transportation, itinerary, summaries become individual docs). Trade-off: more docs but smaller reads. |
| 🟡 **Requires collection group queries** | To get "all accommodations for all trips," need collection group queries (requires composite indexes). |
| 🟡 **Larger blast radius on bugs** | More surface area for migration errors. Thorough testing required. |
| 🟡 **Rollback is harder** | Going back to the old schema means re-embedding data that was split into subcollections. |

---

## Comparison Matrix

| Dimension | Option A (Simple Translation) | Option B (Optimized Redesign) |
|-----------|------------------------------|------------------------------|
| **Field names** | English | English |
| **Enum values** | English | English |
| **Collection names** | English | English |
| **Document structure** | Unchanged | Restructured with subcollections |
| **Trip destination data** | Embedded (N+1 reads) | References (parallel reads) |
| **Accommodations** | Array in trip doc | Subcollection: `trips/{id}/accommodations` |
| **Transportation** | Object in trip doc | Subcollection: `trips/{id}/transportation` |
| **Itinerary** | Array in trip doc | Subcollection: `trips/{id}/itinerary` |
| **User document** | Unbounded (all summaries inline) | Slim + subcollections for summaries |
| **Document count** | Same as today (~N) | ~5× more (~5N) — but DB is only ~2MB, so ~10MB post-migration |
| **Avg. read per view page** | 1 trip + N destinations = N+1 | 1 trip + N destinations + 1 accoms + 1 transport + 1 itinerary = N+4 (but all parallel) |
| **Perf improvement** | 0% | ~80–90% reduction in latency for trip detail pages |
| **Migration effort** | ~1.5 weeks | ~3 weeks (small DB simplifies migration) |
| **Risk level** | Low | Medium (reduced — small DB = fast migration, easy validation) |
| **Addresses intensity issues** | 0 of 12 | 11 of 12 (#9 is code-only) |
| **Firestore cost impact** | Neutral | Lower reads per page load; more docs but negligible at 2MB scale |
| **Rollback complexity** | Easy (keep old docs) | Moderate (keep old collections 30 days) |
| **TS integration** | Update ~40 files (mechanical) | Define new TS interfaces first, refactor to match (cleaner end state) |

> **Visual diagrams:** See [`dev/docs/database/option-a-simple-translation.drawio`](../dev/docs/database/option-a-simple-translation.drawio) and [`dev/docs/database/option-b-optimized-redesign.drawio`](../dev/docs/database/option-b-optimized-redesign.drawio) for side-by-side schema comparisons. Open in [draw.io](https://app.diagrams.net/) or the VS Code Draw.io extension.

---

## Recommendation

### Recommended: **Option B — Optimized Redesign**

**Rationale (updated with small-DB context):**

1. **Small DB dramatically reduces risk and effort.** At ~2 MB total, the entire database can be migrated in under a minute. Validation is trivial — you can manually inspect every document post-migration. The previous ~4.5 week estimate drops to **~3 weeks** because migration scripts are simpler and testing is faster. The "medium-high risk" from the initial assessment is downgraded to **medium** — the blast radius is tiny.

2. **The performance issues are real and user-facing.** The N+1 destination read pattern blocks the UI for 0.5–2 seconds on the most-visited page (trip detail). This affects every visitor opening a shared trip link — not just the owner.

3. **Doing Option A first doubles the migration cost.** If we do the simple translation now, a future structural optimization requires a second full migration. Every `.ts` file, every security rule — rewritten twice. At 2 MB, there's no reason to defer the structural fixes.

4. **The subcollection pattern is Firestore's recommended approach.** Firebase documentation explicitly recommends subcollections over deeply nested arrays. Accommodations, transportation, and itinerary data fit this pattern perfectly. At 2 MB, the "more documents" concern is academic — even a 5× increase is only ~10 MB total.

5. **TypeScript alignment.** The planned TypeScript migration means we'll write type definitions for the data model. It's far better to write them for the optimized English schema than to write Portuguese-field types now and migrate them later. Define the TS interfaces first, let them drive the migration script, and refactor the TS services to match.

6. **Full translation includes enum values.** Both options require translating stored Portuguese enum strings (`"ida"` → `"departure"`, `"voo"` → `"flight"`, `"claro"` → `"light"`, etc.). This is the same effort either way. By doing it as part of the restructuring, we only touch each document once.

### Mitigation Strategy for Option B Risks

| Risk | Mitigation |
|------|-----------|
| Complex migration | At 2 MB, the migration processes in seconds. Build as a single Cloud Function (pattern already established with 12 migrations). Manual validation of every document is feasible. |
| More documents | ~5× increase from a 2 MB base = ~10 MB. Negligible at Firestore pricing ($0.18/100K reads). |
| Rollback difficulty | Keep old collections untouched for 30 days. With small DB, re-running the migration in reverse is also feasible. |
| Firestore rule complexity | Use collection group wildcards and helper functions to keep rules DRY. |

### Implementation Phases (Option B — adjusted for small DB)

| Phase | Duration | Scope |
|-------|----------|-------|
| **Phase 1: TS schema definition** | 2 days | Define new TypeScript interfaces in `public/assets/ts/models/` for all entities with English names and enum literals. This becomes the source of truth. |
| **Phase 2: Migration script** | 3 days | Cloud Function that reads old schema, transforms (renames fields + translates enums + restructures subcollections), writes to new schema. With 2 MB of data, dry-run validation is trivial. |
| **Phase 3: Data layer refactor** | 4 days | Update `database.ts`, services, models, pages, UI, utils to use new field names and subcollection paths. Parallelize reads. All `.ts` source files. |
| **Phase 4: UI layer refactor** | 4 days | Update all page controllers and templates to use new field names. |
| **Phase 5: Firestore rules + testing** | 3 days | Rewrite security rules for new schema. Integration tests with real data (small DB = fast test cycles). |

**Total estimated: ~3 weeks**

### If Option B is Too Aggressive

Consider a **hybrid approach**:
- Do Option A (simple translation) but apply the **two highest-impact structural changes**:
  1. **Fix the N+1 destination reads** — change `destinos` to store only `{id}` references (fetched in parallel). This alone is an 80% perf improvement.
  2. **Split user document summaries** to subcollections — prevents the 1 MiB scaling cliff.
- Defer accommodations/transportation/itinerary subcollection split to a later migration.

This hybrid gives you ~70% of the benefit at ~50% of the cost.

---

## Migration Strategy (Detailed)

### For Option B

All migrations follow the pattern established in `functions/src/migrations/`. Given the small DB (~2 MB), a single consolidated migration function is feasible, or a series of small, idempotent steps:

1. **13-migrate-english-fields.ts** — Renames all field names AND enum values in place within existing collections. This is the "full translation" pass: field keys + stored Portuguese strings all become English.
2. **14-migrate-user-summaries.ts** — Splits user document summaries into `users/{uid}/tripSummaries`, `destinationSummaries`, `listingSummaries`.
3. **15-migrate-trip-destinations.ts** — Strips embedded destination data from trip docs, keeps only `{id}` refs.
4. **16-migrate-accommodations-subcollection.ts** — Moves `accommodations` array into `trips/{id}/accommodations/*` subcollection.
5. **17-migrate-transportation-subcollection.ts** — Moves `transportation.dados` array into `trips/{id}/transportation/*` subcollection.
6. **18-migrate-itinerary-subcollection.ts** — Moves `itinerary` array into `trips/{id}/itinerary/*` subcollection.
7. **19-migrate-collection-names.ts** — Renames top-level collections (`usuarios` → `users`, `viagens` → `trips`, etc.).
8. **20-migrate-cleanup.ts** — Removes old fields/collections after validation period.

Each migration is idempotent (safe to run multiple times) and includes dry-run mode. At 2 MB, each step completes in seconds.

### Dual-Read Transition Pattern

During the code transition, use a helper that tries the new field name first, falling back to the old one:

```ts
function getField(doc, newKey, oldKey) {
  return doc[newKey] ?? doc[oldKey];
}
```

For enum values, a similar pattern applies:

```ts
function translateDirection(value: string): "departure" | "return" | "during" {
  const map = { "ida": "departure", "volta": "return", "durante": "during" };
  return map[value] ?? value;
}
```

This allows deploying code changes before the migration fully completes.

---

## Appendix: Full Field Translation Dictionary

See the [Current Field Mapping](#current-field-mapping-viagensid-trip-document) section above for the complete Portuguese → English mapping. This dictionary can be used as the source of truth for both Option A and Option B.
