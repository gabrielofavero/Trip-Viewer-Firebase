---
name: query-firestore
description: 'Use when you need to read the local Firestore emulator data in real time — list collections, query documents, fetch by ID, or filter with where clauses. Always use this skill before answering questions about the current state of the emulated database.'
---

# Query Firestore Emulator

Use this skill to inspect the current state of the local Firestore emulator. The emulator runs at `localhost:8085` and this tool connects to it via the Firebase Admin SDK.

## The Tool

```
node scripts/dev/query-firestore.js [options]
```

**Always use `--json` when you need to parse the output programmatically.** Use pretty mode (default) when showing results to the user.

## Common Operations

### List all collections (with doc counts and sub-collection info)
```
node scripts/dev/query-firestore.js --list-collections
```

### Query all documents in a collection
```
node scripts/dev/query-firestore.js --collection trips --json
```

### Get a single document by ID
```
node scripts/dev/query-firestore.js --collection trips --doc "trip-id-here" --json
```

### Filter with where clause
```
node scripts/dev/query-firestore.js --collection trips --where "owner,==,uid123" --json
```

Multiple where clauses are supported:
```
node scripts/dev/query-firestore.js --collection expenses --where "tripId,==,abc" --where "category,==,Food" --json
```

Supported operators: `==`, `!=`, `<`, `<=`, `>`, `>=`, `array-contains`, `in`, `not-in`, `array-contains-any`

### Limit results
```
node scripts/dev/query-firestore.js --collection trips --limit 10 --json
```

### Custom project or host
```
node scripts/dev/query-firestore.js --project trip-viewer-prd --collection trips --json
node scripts/dev/query-firestore.js --host localhost:8085 --collection trips --json
```

## Known Collections

Based on the app's structure, these are the main top-level collections:

| Collection     | Description                              |
| -------------- | ---------------------------------------- |
| `admin`        | Admin user IDs (doc: `admin`)            |
| `config`       | System configuration (doc: `system`)     |
| `destinations` | Destination documents                    |
| `expenses`     | Expense documents                        |
| `listings`     | Listing documents                        |
| `protected`    | Protected/placeholder data               |
| `trips`        | Trip documents                           |
| `users`        | User profiles (doc: auth UID)            |

Sub-collections may exist under documents in these collections (e.g., `trips/{tripId}/accommodations`, `trips/{tripId}/transportation`, `trips/{tripId}/itinerary`, etc.).

## Emulator Environment

- **Firestore emulator:** `localhost:8085`
- **Auth emulator:** `localhost:9099`
- **Functions emulator:** `localhost:5001`
- **Project:** `trip-viewer-prd` (single project — dev/tcc retired)

The tool uses `firebase-admin` from `functions/node_modules/firebase-admin` and sets `FIRESTORE_EMULATOR_HOST` automatically.

## Important Notes

- The emulator is in-memory by default. Data is lost on restart unless exported.
- Use `--json` when you need to process the output further (e.g., counting documents, extracting specific fields).
- When using `--where` with `in` or `array-contains-any`, pass the array as JSON: `--where "status,in,[\"active\",\"draft\"]"`
- The `--list-collections` flag also discovers sub-collections under the first document of each collection.
