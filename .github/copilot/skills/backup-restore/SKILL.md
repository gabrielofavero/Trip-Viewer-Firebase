---
name: backup-restore
description: 'Use when you need to understand, modify, or debug the backup/restore system — full account export/import, per-document export/import, legacy JSON normalization, PIN-protected data handling, or file format structure.'
applyTo: 'public/assets/ts/backup/**'
---

# Backup & Restore System

TripViewer has a complete data portability system: full account backup/restore, individual document export/import, and legacy format normalization. All operations handle the PIN-protected two-tier data model.

---

## Files

```
public/assets/ts/backup/
├── backup.ts              ← Full account export (all user data → JSON file)
├── restore.ts             ← Full account import (JSON file → Firestore)
├── export-documents.ts    ← Per-document export (select individual trips/destinations/listings)
├── import-documents.ts    ← Per-document import (JSON files → Firestore, with conflict detection)
└── normalize.ts           ← Legacy (Portuguese) JSON → English normalization
```

---

## Full Account Backup (`backup.ts`)

### Entry point: `backupOnClickAction()`

Triggered from the Settings panel. Flow:

```
1. prepareMissingData()
   └─ Fetches trip/destination/listing summaries from user subcollections

2. Check: any PIN-protected trips?
   ├─ YES → Prompt user: "Backup sensitive data too?"
   │         ├─ Yes → displayPinRequestBackup() → collect PINs via modal
   │         └─ No  → backupAccountData(includeProtected=false)
   └─ NO  → backupAccountData(includeProtected=false)

3. backupAccountData()
   └─ Fetches all user documents (trips, destinations, listings, expenses)
   └─ For PIN-protected trips: fetches from protected/* subcollections
   └─ Assembles JSON blob → triggers browser download
```

### Output format:
```json
{
    "version": "2.0",
    "exportedAt": "2026-07-28T...",
    "owner": "eySHdjIyK0MNAgiPU77xE0d1CTjp",
    "account": {
        "user": { /* user doc data */ },
        "trips": { "tripId1": { ... }, "tripId2": { ... } },
        "destinations": { "destId1": { ... } },
        "listings": { "listingId1": { ... } },
        "expenses": { "tripId1": { ... } },
        "protected": { "tripId1": { /* sensitive data */ } }
    }
}
```

---

## Full Account Restore (`restore.ts`)

### Entry point: `restoreOnClickAction()`

Triggered from Settings panel. Flow:

```
1. User clicks "Import Account" → file picker opens
2. File read → JSON.parse()
3. normalizeLegacyJson() — translate Portuguese field names if detected
4. Validation: isRestoreValid() — checks structure and owner
5. fixRestoreOwnership() — updates sharing.owner to current UID
6. restoreAccount() — writes all documents to Firestore
7. Toast notification: success or error
```

### Validation rules:
- Must have `account` property
- Must have at least one document collection
- Owner check: warns if backup owner differs from current user (auto-fixes)

### Ownership handling:
If the backup was created by a different user, `sharing.owner` is automatically updated to the current UID. A count is reported in the success message.

---

## Document Export (`export-documents.ts`)

Export individual documents (trips, destinations, listings) rather than the full account.

### Features:
- **Multi-select** UI — pick which documents to export
- **Category filter** — trips, destinations, or listings
- **PIN handling** — if exporting trips with protected data, prompts for PINs
- **Security warning** — warns that exported files contain plain-text sensitive data

### Output format (single document):
```json
{
    "trip": { /* trip document data */ },
    "expenses": { /* expenses data */ },
    "subcollections": {
        "accommodations": { ... },
        "transportation": { ... },
        "itinerary": { ... },
        "protected": { ... }
    }
}
```

---

## Document Import (`import-documents.ts`)

Import individual documents from JSON files.

### Features:
- **Conflict detection** — if a document with the same ID already exists, prompts the user
- **Destination handling** — if imported docs reference destinations that exist, offers "Import Main Only" or "Import All"
- **Multi-file support** — can import multiple files at once
- **Validation** — checks that files have `trip`, `destination`, or `listing` property

---

## Legacy JSON Normalization (`normalize.ts`)

### `normalizeLegacyJson(json)` → normalized JSON

Detects Portuguese field names (pre-migration format) and translates them to English:

```typescript
// Input (legacy Portuguese):
{ "viagens": { "abc": { "titulo": "Eurotrip", "moeda": "BRL" } } }

// Output (normalized English):
{ "trips": { "abc": { "title": "Eurotrip", "currency": "BRL" } },
  "_normalizationMeta": { "wasLegacy": true, "fieldsRenamed": 2 } }
```

### Detection heuristic:
- Checks for Portuguese collection names as top-level keys (`viagens`, `usuarios`, `gastos`, `destinos`, `listagens`)
- If found, applies the same FIELD_MAP as Phase 1 migration
- Adds `_normalizationMeta` with stats

---

## PIN-Protected Data in Backups

When a trip uses `pin: "sensitive-only"`:

1. **Backup:** User is prompted to enter the PIN. If provided, the protected subcollection data is fetched and included. If skipped, sensitive fields remain empty strings.

2. **Restore:** Protected data is written to `trips/protected/{pin}/{tripId}` and `expenses/protected/{pin}/{tripId}`. The `protected/{tripId}` lookup document is also created.

3. **Security warning:** Both backup and export show a warning that exported files contain plain-text sensitive data.

---

## File Download/Upload

### Download (backup/export)
```typescript
// Creates a Blob → creates an object URL → triggers <a> download
const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
// Triggers download via hidden <a> element
```

### Upload (restore/import)
```typescript
// Hidden <input type="file"> triggers FileReader
const reader = new FileReader();
reader.onload = (e) => {
    const json = JSON.parse(e.target.result);
    restoreAccountData(json);
};
reader.readAsText(file);
```

---

## UI Components Used

| Component | Used For |
|---|---|
| `displayPrompt()` | Confirmation dialogs (backup PINs, restore overwrite) |
| `displayMessage()` | Error messages, conflict notifications |
| `displayError()` | Critical failures |
| `openToast()` | Success/partial success notifications |
| `startLoadingScreen()` / `stopLoadingScreen()` | Blocking UI during long operations |

---

## Error Handling

- **Partial backup:** If some protected data can't be fetched (wrong PIN), the backup completes with a warning listing skipped items
- **Restore validation:** Invalid files are rejected before any writes occur
- **Network errors:** Caught and displayed via `displayError()`
- **Legacy format:** Automatically normalized — no user intervention needed
