---
name: migration-system
description: 'Use when you need to create, run, debug, or understand Firestore data migrations. Covers the three-phase migration architecture, idempotent pattern, BatchManager, how to invoke migrations via HTTP, the dryRun/cleanup parameters, and guidance for creating new migrations following the established conventions.'
applyTo: 'functions/src/migrations/**; functions/src/index.ts'
---

# Migration System

TripViewer uses **Firebase Functions as migration runners**. Each migration is an HTTP-triggered Cloud Function that transforms Firestore data. Migrations are **idempotent** (safe to re-run) and support **dry-run preview** mode.

---

## Quick Reference

```bash
# Run a migration on the emulator
curl "http://localhost:5001/trip-viewer-dev/us-central1/migratePhase1?dryRun=true"
curl "http://localhost:5001/trip-viewer-dev/us-central1/migratePhase2"
curl "http://localhost:5001/trip-viewer-dev/us-central1/migratePhase3?dryRun=true"

# Phase 2 with cleanup (deletes old Portuguese collections)
curl "http://localhost:5001/trip-viewer-dev/us-central1/migratePhase2?cleanup=true"
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

Migrations 1–12 are **legacy** (already applied in production). Migrations 13–15 are the **consolidation phases**; migrations 16–17 are the post-consolidation backfills (profile fields, then Places API prep). They are exported from `functions/src/index.ts` as `migratePhase1`, `migratePhase2`, `migratePhase3`, `migrateUserProfile`, and `migratePlacesApi`.

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
curl "http://localhost:5001/trip-viewer-dev/us-central1/migrateUserProfile?dryRun=true"
curl "http://localhost:5001/trip-viewer-dev/us-central1/migrateUserProfile"
```

---

## Migration 17: Places API prep (`migratePlacesApi`)

**File:** `functions/src/migrations/17-migrate-places-api.ts`

Prepares the database for the Places API integration (epic E045) with two independent, idempotent operations:

1. **`canUsePlacesAPI` permission:** creates `admin/permissions/canUsePlacesAPI/{uid}` docs for each UID passed in the **request body** (`{ "uids": [...] }`) — existence = granted. Accepts an array of UIDs, a comma-separated string, or the `?uids=` query param. If no UIDs are provided, this step is skipped entirely.
2. **`placeAPI` object:** adds a `placeAPI` object to every destination entry (restaurants, snacks, nightlife, tourism, shopping) that lacks it, using dot-path `update()` so only the missing nested field is written. The object is a subset of `scripts/export-maps-data/export-maps-data.py` output (the app's destination format): `{ region, name, website, rating, price, description, emoji, map, updatedAt, instagram, id }` — omits the app-managed `media`/`isNew` and uses `updatedAt` instead of the script's `createdAt`. Also removes any legacy `placeID` string field. Idempotency check: skips entries that already carry a `placeAPI` object.

### Run it:
```bash
# Dry run first (placeAPI backfill only — no UIDs)
curl "http://localhost:5001/trip-viewer-dev/us-central1/migratePlacesApi?dryRun=true"

# Apply + pre-grant the permission to specific UIDs
curl -X POST "http://localhost:5001/trip-viewer-dev/us-central1/migratePlacesApi" \
  -H "Content-Type: application/json" \
  -d '{"uids": ["eySHdjIyK0MNAgiPU77xE0d1CTjp"]}'

# Comma-separated string also works
curl -X POST "http://localhost:5001/trip-viewer-dev/us-central1/migratePlacesApi" \
  -H "Content-Type: application/json" \
  -d '{"uids": "uid1,uid2"}'
```

---

## How to Run Migrations

### On the Emulator (Local)

1. Start emulators: `npm run dev`
2. Build functions: `npm --prefix functions run build`
3. Run migration:
```bash
# Dry run first
curl "http://localhost:5001/trip-viewer-dev/us-central1/migratePhase1?dryRun=true"

# Apply
curl "http://localhost:5001/trip-viewer-dev/us-central1/migratePhase1"
curl "http://localhost:5001/trip-viewer-dev/us-central1/migratePhase2"
curl "http://localhost:5001/trip-viewer-dev/us-central1/migratePhase3"

# Phase 2 with cleanup
curl "http://localhost:5001/trip-viewer-dev/us-central1/migratePhase2?cleanup=true"
```

### On Production

Deploy functions first:
```bash
firebase deploy --only functions:migratePhase1,functions:migratePhase2,functions:migratePhase3
```
Then call the production URL (same pattern, different project).

---

## Creating a New Migration

### File naming convention
```
functions/src/migrations/{NN}-migrate-{short-description}.ts
```
Use the next available number (currently up to 17).

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
import * as newMigration from './migrations/16-migrate-new-feature';
export const migrateNewFeature = newMigration.migrateNewFeature;
```

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

## Legacy Migrations (1–12)

These are individual migrations that were applied incrementally before the consolidation. They are **not exported** from the current `index.ts` and are kept for reference only. The three-phase consolidation (13–15) supersedes them.

If you need to reference their logic, the files are in `functions/src/migrations/01–12-*.ts`.
