---
name: migration-system
description: 'Use when you need to create, run, debug, or understand Firestore data migrations. Covers the three-phase migration architecture, idempotent pattern, BatchManager, how to invoke migrations via HTTP, the dryRun/cleanup parameters, and guidance for creating new migrations following the established conventions. ALWAYS register runnable migrations (18+) in scripts/build/migrations-config.json.'
applyTo: 'functions/src/migrations/**; functions/src/index.ts; scripts/build/migrations-config.json'
---

# Migration System

TripViewer uses **Firebase Functions as migration runners**. Each migration is an HTTP-triggered Cloud Function that transforms Firestore data. Migrations are **idempotent** (safe to re-run) and support **dry-run preview** mode.

> **⚠️ Whenever you create or run a migration, remember to update `scripts/build/migrations-config.json`.** All migrations numbered 18+ must be registered there (`runnable[]`) so the deploy script can offer them post-deploy. Do not finish a migration task without touching the config.

---

## Quick Reference

```bash
# Run a migration on the emulator
curl "http://localhost:5001/trip-viewer-prd/us-central1/migratePhase1?dryRun=true"
curl "http://localhost:5001/trip-viewer-prd/us-central1/migratePhase2"
curl "http://localhost:5001/trip-viewer-prd/us-central1/migratePhase3?dryRun=true"

# Phase 2 with cleanup (deletes old Portuguese collections)
curl "http://localhost:5001/trip-viewer-prd/us-central1/migratePhase2?cleanup=true"
```

```bash
# Automated runner — runs selected migrations against a LIVE project's real
# Firestore via the local Functions emulator (no Cloud Function deploy, so no
# extensions / Blaze billing prompt). See "On Production" below.
npm run migrations -- --project dev
```

---

## Migration Inventory

| # | Function Name | What It Does |
|---|---|---|
| 1 | `migrateGastos` | Move expenses with PIN into `gastos/protected/{pin}/` subcollection (legacy) |
| 2 | `migrateHospedagemImagem` | Restructure accommodation images from string → object (legacy) |
| 3 | `migrateTimezones` | Add timezone fields (legacy) |
| 4 | `migrateTransporteVisualizacao` | Add transport view mode (legacy) |
| 5 | `migrateDestinationDescriptions` | Restructure destination descriptions (legacy) |
| 6 | `migratePessoas` | Rename `pessoas` → `travelers` (legacy) |
| 7 | `migrateTravelers` | Restructure traveler objects (legacy) |
| 8 | `migrateTripProtectedData` | Move sensitive fields to protected subcollections (legacy) |
| 9 | `migrateProtectedTranslation` | Translate protected document fields Pt→En (legacy) |
| 10 | `migrateMinimalUserData` | Clean up user documents (legacy) |
| 11 | `migrateMinimalUserTripModules` | Add modules to user trip summaries (legacy) |
| 12 | `migrateDestinationObject` | Restructure destination documents (legacy) |
| **13** | **`migratePhase1`** | **Translate field names/values Pt→En + restructure data (embeds → subcollections)** |
| **14** | **`migratePhase2`** | **Rename collections Pt→En + fix itinerary/destination values + optional cleanup** |
| **15** | **`migratePhase3`** | **Cleanup: embedded summaries → subcollections, permissions migration, legacy field removal** |
| **16** | **`migrateUserProfile`** | **Backfill user profile fields (`name`, `email`, `photoURL`) from Auth into every `users/{uid}` document** |
| **17** | **`migratePlacesApi`** | **Places API prep: grant `canUsePlacesAPI` to body-provided UIDs + add `placeAPI` object to every destination entry** |
| **18** | **`migrateTripDestinationMetadata`** | **Backfill trips: enrich `destinationRefs[i]` with denormalized destination metadata (`title`, `image`, `categories` “has entries” booleans, `version`)** |
| **19** | **`migrateDestinationRegions`** | **Destination entry region → regions: convert the legacy single `region` string into a `regions` array** |
| **20** | **`migrateExpenseFields`** | **Expense multi-person fields: add `link` + `people` to every expense entry in preTrip/duringTrip (public + protected)** |

**Migrations 1–17 are legacy / manual-only** — already applied in production (1–12) or kept for reference (13–17). They are NOT registered in the current `functions/src/index.ts`, so the deploy script cannot offer them.

**Migrations 18+ are registered in `scripts/build/migrations-config.json`** — the **auto-runnable** set that the deploy script (`scripts/build/deploy.py`) offers after every deployment (see "Post-Deploy Automated Flow" below). Every migration numbered 18 or higher must be registered there.

---

## Migration Architecture

### Execution Pattern

Every migration follows this pattern:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const migrateX = functions.https.onRequest(async (req, res) => {
    const dryRun = req.query.dryRun === 'true';
    const cleanup = req.query.cleanup === 'true';  // Phase 2 only

    try {
        // 1. Scan source documents
        // 2. For each document, check if already migrated (idempotency)
        // 3. Build writes in a BatchManager
        // 4. If dryRun: only report, don't commit
        // 5. If not dryRun: commit all batches
        // 6. Return JSON report

        res.status(200).json({ success: true, ...report });
    } catch (error) {
        res.status(500).send(`Migration failed: ${error.message}`);
    }
});
```

### Idempotency Pattern

Every migration checks if the target already exists before writing:
```typescript
const newSnap = await newRef.get();
if (newSnap.exists) {
    // Already migrated — skip or delete old source
    continue;
}
// Not yet migrated — create new + delete old
```

This means migrations are **safe to re-run** — they only process documents that haven't been migrated yet.

### BatchManager

Migrations use a `BatchManager` helper (defined inline in each migration) to handle Firestore's 500-operation batch limit:

```typescript
class BatchManager {
    private batches: FirebaseFirestore.WriteBatch[] = [];
    private current: FirebaseFirestore.WriteBatch;
    private count = 0;

    constructor() {
        this.current = admin.firestore().batch();
        this.batches.push(this.current);
    }

    set(ref, data) {
        this.current.set(ref, data);
        this.count++;
        if (this.count >= 500) {
            this.current = admin.firestore().batch();
            this.batches.push(this.current);
            this.count = 0;
        }
    }

    async commitAll() {
        for (const batch of this.batches) {
            await batch.commit();
        }
    }
}
```

---

## Phase 1: Translate & Restructure (`migratePhase1`)

**File:** `functions/src/migrations/13-migrate-phase1-translate-restructure.ts`

### Operations (on Portuguese-named collections):
1. **Translate field names:** ~100+ field mappings (e.g., `titulo` → `title`, `compartilhamento` → `sharing`)
2. **Translate field values:** (e.g., `voo` → `flight`, `ida` → `departure`)
3. **Context-sensitive translations:** Some fields map differently based on parent context (e.g., `pontos.partida` → `origin` but only when inside `pontos`)
4. **Split user summaries:** Move embedded `trips`/`destinations`/`listings` arrays from user doc into `tripSummaries`/`destinationSummaries`/`listingSummaries` subcollections
5. **Strip destination data from destinationRefs:** Remove embedded destination objects, keep only `{ id: string }`
6. **Move accommodations → subcollection:** `viagens/{id}.hospedagens[]` → `viagens/{id}/accommodations/{accId}` documents
7. **Move transportation → subcollection:** `viagens/{id}.transportes[]` → `viagens/{id}/transportation/{legId}` documents
8. **Move itinerary → subcollection:** `viagens/{id}.programacoes[]` → `viagens/{id}/itinerary/{dayId}` documents

### Key translation maps (in the file):
- `FIELD_MAP` — ~100+ Portuguese → English field names
- `VALUE_MAP` — ~40+ Portuguese → English string values
- `CONTEXT_FIELD_MAP` — Context-dependent field name translations

---

## Phase 2: Rename & Finalize (`migratePhase2`)

**File:** `functions/src/migrations/14-migrate-phase2-rename-finalize.ts`

### Operations:
1. **Rename subcollections under parent docs:** `usuarios/*/tripSummaries` → `users/*/tripSummaries`, etc.
2. **Rename protected subcollections:** `viagens/protected/{pin}/*` → `trips/protected/{pin}/*`, `gastos/protected/{pin}/*` → `expenses/protected/{pin}/*`
3. **Rename top-level collections:** `usuarios→users`, `viagens→trips`, `gastos→expenses`, `destinos→destinations`, `listagens→listings`, `protegido→protected`
4. **Fix itinerary `tipo` values:** `transporte→transportation`, `hospedagens→accommodation`, `destinos→destination`
5. **Fix destination categories:** Rename category subcollections (e.g., `restaurantes→restaurants`)
6. **Optional cleanup** (`?cleanup=true`): Delete old Portuguese-named collections and subcollections

### Parameters:
- `?dryRun=true` — Preview what would change without committing
- `?cleanup=true` — Delete old Portuguese collections after successful migration

### Collection rename map:
```
usuarios → users
viagens   → trips
destinos  → destinations
listagens → listings
gastos    → expenses
protegido → protected
```

---

## Phase 3: Hotfixes & Cleanup (`migratePhase3`)

**File:** `functions/src/migrations/15-migrate-phase3-improvements.ts`

### Operations:

1. **Embedded summaries → subcollections:** Moves `trips`/`destinations`/`listings` objects from user doc into subcollections. Clears embedded arrays to `[]`.

2. **Permissions migration:** Moves `users/{uid}.permissions.{upload, unlimitedUploadSize}` into `admin/permissions/{type}/{uid}` documents. Cleans up old array-based `admin/permissions` doc.

3. **Legacy field removal:** Strips `name`, `photo`, `visibility`, `permissions`, `permissions_legacy`, `trips`, `destinations`, `listings` from user docs using `FieldValue.delete()`.

4. **Destination image field:** Adds `image: { active: false, background: "" }` to destination documents and destination summaries that lack it.

5. **Destination entry images field:** Adds `images: []` to every destination entry (restaurants, snacks, nightlife, tourism, shopping) that lacks it. Uses dot-path `update()` so only the missing nested field is written.

---

## Migration 16: User Profile Fields (`migrateUserProfile`)

**File:** `functions/src/migrations/16-migrate-user-profile-fields.ts`

Backfills every `users/{uid}` document with the profile fields `name`, `email` and `photoURL`, sourced from the matching Firebase Auth user record (`displayName`, `email`, `photoURL`).

### Operations:
1. Scan all `users/{uid}` documents.
2. **Idempotency check:** skip any user whose doc already has all three fields (absent / `null` / `''` all count as "missing").
3. Fetch the Auth record via `admin.auth().getUser(uid)` to source the values.
4. Build an `update()` patch containing **only the missing fields** — existing profile values are never overwritten.
5. `?dryRun=true` logs what would change without committing.

### Run it:
```bash
curl "http://localhost:5001/trip-viewer-prd/us-central1/migrateUserProfile?dryRun=true"
curl "http://localhost:5001/trip-viewer-prd/us-central1/migrateUserProfile"
```

---

## Migration 17: Places API prep (`migratePlacesApi`)

**File:** `functions/src/migrations/17-migrate-places-api.ts`

Prepares the database for the Places API integration (epic E045) with two independent, idempotent operations:

1. **`canUsePlacesAPI` permission:** creates `admin/permissions/canUsePlacesAPI/{uid}` docs for each UID passed in the **request body** (`{ "uids": [...] }`) — existence = granted. Accepts an array of UIDs, a comma-separated string, or the `?uids=` query param. If no UIDs are provided, this step is skipped entirely.

   **Single-user convenience:** POST `{ "uid": "..." }` (or `?uid=`) instead creates the permission **and adds the user** — pushes the UID into `admin/admin.admins` (idempotent `arrayUnion`) and creates `users/{uid}` if missing (profile fields pulled from Auth when available).
2. **`placeAPI` object:** adds a `placeAPI` object to every destination entry (restaurants, snacks, nightlife, tourism, shopping) that lacks it, using dot-path `update()` so only the missing nested field is written. The object is a subset of `scripts/export-maps-data/export-maps-data.py` output (the app's destination format): `{ region, name, website, rating, price, description, emoji, map, updatedAt, instagram, id }` — omits the app-managed `media`/`isNew` and uses `updatedAt` instead of the script's `createdAt`. Also removes any legacy `placeID` string field. Idempotency check: skips entries that already carry a `placeAPI` object.

### Run it:
```bash
# Dry run first (placeAPI backfill only — no UIDs)
curl "http://localhost:5001/trip-viewer-prd/us-central1/migratePlacesApi?dryRun=true"

# Apply + pre-grant the permission to specific UIDs
curl -X POST "http://localhost:5001/trip-viewer-prd/us-central1/migratePlacesApi" \
  -H "Content-Type: application/json" \
  -d '{"uids": ["eySHdjIyK0MNAgiPU77xE0d1CTjp"]}'

# Comma-separated string also works
curl -X POST "http://localhost:5001/trip-viewer-prd/us-central1/migratePlacesApi" \
  -H "Content-Type: application/json" \
  -d '{"uids": "uid1,uid2"}'

# Single-user grant: permission + add the user (admin/admin.admins + users/{uid})
curl -X POST "http://localhost:5001/trip-viewer-prd/us-central1/migratePlacesApi" \
  -H "Content-Type: application/json" \
  -d '{"uid": "gVrXZ68LVac9Ot02slN6zqD3sP3X"}'
```

---

## Migration 18: Trip destination metadata backfill (`migrateTripDestinationMetadata`)

**File:** `functions/src/migrations/18-migrate-trip-destination-metadata.ts`

Backfills every `trips/{id}.destinationRefs[i]` entry with a denormalized copy of the destination's lightweight metadata so `view.html` can render the destinations section **without fetching each `destinations/{id}` document on load** (first step of the “reduce Firestore calls on view load” effort, epic E027).

### Operations:
1. Scans all `trips` documents.
2. For each ref, fetches the destination document (cached across trips) and writes:
   - `title` — destination title
   - `image` — destination hero image (`{ background, active }`)
   - `categories` — per-category **“has entries”** booleans (`restaurants`, `snacks`, `nightlife`, `tourism`, `shopping`) that drive which category boxes render on view.html
   - `version` — destination version
3. **Idempotency check:** skips refs that already carry a `categories` object (re-runs are no-ops). Missing destination docs leave the ref unchanged.
4. Writes the enriched array back to `destinationRefs` (normalizes legacy trips that only had a `destinations` refs array).

> **Note:** the same metadata is also written on every trip save (`getDestinationsArray()` in `edit-trip`). Migration 18 only backfills existing trips.

### Run it:
```bash
curl "http://localhost:5001/trip-viewer-prd/us-central1/migrateTripDestinationMetadata?dryRun=true"
curl "http://localhost:5001/trip-viewer-prd/us-central1/migrateTripDestinationMetadata"
```

---

## Migration 19: Destination region → regions (`migrateDestinationRegions`)

**File:** `functions/src/migrations/19-migrate-destination-regions.ts`

Converts the legacy single-string `region` field on every destination entry into a `regions` array (one or more neighborhoods/areas), enabling multi-region support on destination items.

### Operations:
1. Scans all `destinations` documents.
2. For each category (`restaurants`, `snacks`, `nightlife`, `tourism`, `shopping`) and entry:
   - `region: "Ipanema"` → `regions: ["Ipanema"]`
   - `region: ""` (or missing) → `regions: []`
3. **Idempotency check:** entries already carrying a `regions` array are skipped; a stale legacy `region` string is removed when present.
4. Deletes the legacy `region` field via `FieldValue.delete()`.

### Run it:
```bash
curl "http://localhost:5001/trip-viewer-prd/us-central1/migrateDestinationRegions?dryRun=true"
curl "http://localhost:5001/trip-viewer-prd/us-central1/migrateDestinationRegions"
```

---

## How to Run Migrations

### On the Emulator (Local)

1. Start emulators: `npm run dev`
2. Build functions: `npm --prefix functions run build`
3. Run migration:
```bash
# Dry run first
curl "http://localhost:5001/trip-viewer-prd/us-central1/migratePhase1?dryRun=true"

# Apply
curl "http://localhost:5001/trip-viewer-prd/us-central1/migratePhase1"
curl "http://localhost:5001/trip-viewer-prd/us-central1/migratePhase2"
curl "http://localhost:5001/trip-viewer-prd/us-central1/migratePhase3"

# Phase 2 with cleanup
curl "http://localhost:5001/trip-viewer-prd/us-central1/migratePhase2?cleanup=true"
```

(The examples above are legacy 13–15 migrations. Registered migrations 18+ follow the same pattern, e.g. `migrateExpenseFields`.)

### On Production — Post-Deploy Automated Flow (local emulator, no function deploy)

Deploying Cloud Functions to production requires the Blaze plan (this project has
Firebase Extensions), so TripViewer **never deploys migration functions**. Instead
migrations run through the **local Functions emulator against the project's REAL
Firestore** — the same mechanism as the old manual `npm run functions` + Postman
flow, fully automated.

`npm run deploy` (`scripts/build/deploy.py`) flow:

1. Deploy hosting + Firestore rules only (`firebase deploy --only hosting,firestore:rules`).
2. After each project deploys, the script asks **"Run migrations on <project>? [y/N]"**.
3. If you accept, it delegates to `scripts/build/run-migrations.py --project <project>`,
   which lists the **pending** migrations for that environment.
4. Select one or more (comma-separated numbers or IDs; `r` = re-run completed;
   `0` = skip). For each selected migration you are prompted for its declared
   inputs (query `params` / `body` fields from `scripts/build/migrations-config.json`)
   — e.g. `dryRun` — with an `i` = ignore option.
5. The runner (`scripts/build/run-migrations.py`):
   - Generates a **temporary `functions/src/index.ts`** exposing ONLY the selected
     migrations (never `initLocalDb`), backs up the original, and builds `functions/`.
   - Starts the Functions emulator alone
     (`firebase emulators:start --only functions --project <project>`). No Firestore
     emulator is started, so the admin SDK connects to the **real** project Firestore.
   - Invokes each migration over
     `POST http://localhost:5001/<project>/us-central1/<function>` and prints the
     JSON report.
   - A **successful non-dry-run** run is marked `completed` for that environment in
     `scripts/build/migrations-state.json` — so it is **not offered automatically on
     the next deploy** (re-run stays available via the `r` option).
   - **Restores the original `functions/src/index.ts`** (revert everything) and shuts
     the emulator down — even on error.

Standalone (equivalent to the old manual flow, no deploy needed):
```bash
npm run migrations -- --project dev               # interactive selection
npm run migrations -- --project dev --ids 18,19   # non-interactive (skip menu)
```

Config/state files:
- `scripts/build/migrations-config.json` — which migrations are auto-runnable, their function names/labels, and the `params`/`body` inputs to prompt for.
- `scripts/build/migrations-state.json` — per-environment `completed` map (`{ "<id>": { "at": "<iso>" } }`).

> **Note:** migrations run through the emulator against the live project, so they
> execute with your local Firebase CLI credentials — no functions are deployed and
> no billing prompt appears. The Functions port (5001) must be free: stop `npm run dev`
> first or run `npm run kill-ports`.

---

## Creating a New Migration

### File naming convention
```
functions/src/migrations/{NN}-migrate-{short-description}.ts
```
Use the next available number (currently up to 20).

### Template

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const migrateNewFeature = functions.https.onRequest(async (req, res) => {
    const dryRun = req.query.dryRun === 'true';

    const report = { processed: 0, migrated: 0, skipped: 0, errors: [] as string[] };

    try {
        const db = admin.firestore();
        const snapshot = await db.collection('targetCollection').get();

        for (const doc of snapshot.docs) {
            report.processed++;
            const data = doc.data();

            // Idempotency check — skip if already migrated
            if (data._migrated_newFeature) {
                report.skipped++;
                continue;
            }

            if (!dryRun) {
                await doc.ref.update({
                    newField: transform(data.oldField),
                    _migrated_newFeature: true,  // migration marker
                });
            }
            report.migrated++;
        }

        res.status(200).json({ success: true, dryRun, ...report });
    } catch (error) {
        res.status(500).send(`Migration failed: ${error.message}`);
    }
});
```

### Register in index.ts
```typescript
import * as newMigration from './migrations/21-migrate-new-feature';
export const migrateNewFeature = newMigration.migrateNewFeature;
```

### Register in scripts/build/migrations-config.json (required for 18+)

**Every migration numbered 18+ must also be added to `scripts/build/migrations-config.json`**
(`runnable[]`) — this is what makes it auto-runnable by the deploy script. Add its
`id`, `function`, `label`, and the `params`/`body` inputs to prompt for (e.g. `dryRun`),
then the deploy flow offers it post-deploy and tracks per-env completion in
`scripts/build/migrations-state.json`.

**Checklist for a new migration:**
- [ ] create `functions/src/migrations/{NN}-migrate-{...}.ts`
- [ ] export the function from `functions/src/index.ts`
- [ ] register it in `scripts/build/migrations-config.json` (`runnable[]`)
- [ ] build / type-check, then test on the emulator first

### Best practices
- Always support `?dryRun=true` (log/report what would change, never commit)
- Always include an idempotency check so re-runs are no-ops. Two patterns in use:
  - **Marker field:** write `_migrated_<name>: true` and skip docs that have it (Migrations 13–15 style).
  - **Field-presence check:** skip docs that already have the target fields (Migration 16 style — preferable for additive backfills, since it needs no extra field and survives partial runs).
- Never overwrite existing values in a backfill — build an `update()` patch containing only the missing fields.
- Use `BatchManager` if processing more than 500 documents (Firestore 500-op batch limit)
- Return a JSON report with counts (`{ success, dryRun, report }`)
- Log progress for long-running migrations
- Test on emulator first, then deploy

---

## Legacy / Manual-Only Migrations (1–17)

Migrations **1–12** were applied incrementally before the consolidation; **13–17** are the consolidation phases and early backfills. None of 1–17 are exported from the current `functions/src/index.ts` and none are registered in `scripts/build/migrations-config.json`, so they are **manual-only** and kept for reference only.

If you need to reference their logic, the files are in `functions/src/migrations/01–17-*.ts`.
