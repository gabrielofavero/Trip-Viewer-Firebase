---
name: firebase-emulators
description: 'Use when you need to start, stop, inspect, or troubleshoot the local Firebase emulators; seed the emulated database; export/import emulator state; or understand the local development environment. Covers the Firestore (8085), Auth (9099), Functions (5001), and Hosting (5000) emulators.'
applyTo: 'firebase.json; .firebaserc; functions/src/dev/**; scripts/dev/query-firestore.js'
---

# Firebase Emulators

TripViewer uses the Firebase Emulator Suite for local development. All emulators run in `singleProjectMode` with data persisted to `.emulator-data/`.

---

## Quick Reference

```bash
npm run dev              # Full dev: emulators + watch + auto-open browser
npm run dev:livereload   # Same but with live reload enabled
npm run backup           # Export emulator state: firebase emulators:export ./.emulator-data
npm run kill-ports       # Force-kill processes on all emulator ports
npm run functions        # Build + start only Functions emulator
```

---

## Emulator Ports & URLs

| Service | Port | URL / Access |
|---|---|---|
| **Firestore** | 8085 | REST: `http://localhost:8085` |
| **Auth** | 9099 | `http://localhost:9099` |
| **Functions** | 5001 | `http://localhost:5001` |
| **Hosting** | 5000 | `http://localhost:5000` |
| **Emulator UI** | 4000 | `http://localhost:4000` |

Run `npm run kill-ports` if any port is already occupied.

---

## Starting Emulators

### Full Dev Environment
```bash
npm run dev
```
Starts concurrently:
- Functions TypeScript compiler in watch mode (`tsc --watch`)
- Frontend build watch (`node scripts/build/build.js --watch --no-livereload`)
- All emulators (`firebase emulators:start --import=./.emulator-data --export-on-exit=./.emulator-data`)
- Browser auto-open when ready

### Manual Start
```bash
firebase emulators:start
firebase emulators:start --import=./.emulator-data          # Load saved state
firebase emulators:start --export-on-exit=./.emulator-data   # Save state on exit
```

### Check if Running
```bash
# Check if port 8085 is listening (Firestore emulator)
netstat -ano | Select-String "8085"
```

---

## Seeding Data

### Using initLocalDb (via Functions emulator)

The `initLocalDb` Cloud Function creates the minimum structure needed:

```bash
# Via curl
curl -X POST http://localhost:5001/trip-viewer-dev/us-central1/initLocalDb \
  -H "Content-Type: application/json" \
  -d '{"uid": "eySHdjIyK0MNAgiPU77xE0d1CTjp"}'

# Or via browser
open http://localhost:5001/trip-viewer-dev/us-central1/initLocalDb?uid=eySHdjIyK0MNAgiPU77xE0d1CTjp
```

What it creates:
| Collection | Documents |
|---|---|
| `admin/admin` | `{ admins: [uid] }` |
| `admin/permissions/upload/{uid}` | Permission flag |
| `admin/permissions/unlimitedUploadSize/{uid}` | Permission flag |
| `config/system` | `{ registrationOpen: false }` |
| `users/{uid}` | `{ destinations: [], trips: [], listings: [] }` |
| `trips/protected` | Empty container doc |
| `expenses/protected` | Empty container doc |
| `destinations/_placeholder` | Placeholder (so collection appears in UI) |
| `listings/_placeholder` | Placeholder |
| `protected/_placeholder` | Placeholder |

> **Note:** `initLocalDb` requires the Auth emulator to have the user created first. Create a user in the Emulator UI (Auth tab) or via the app's registration flow.

---

## Persisting & Restoring Data

The emulator is **in-memory by default** — data is lost on restart.

### Export (save current state)
```bash
npm run backup
# Equivalent to:
firebase emulators:export ./.emulator-data
```

> **Note — test credentials live in the export:** each export includes `auth_export/accounts.json`
> with the Auth emulator's test users. Each account has an `email` and a `passwordHash` in the form
> `fakeHash:salt=...:password=<PLAINTEXT>` — the plaintext password is embedded after `password=`.
> To sign in an AI/browser session, read these credentials and authenticate (see the
> `browser-navigation` skill). The real-time export at `.emulator-data/auth_export/accounts.json` is
> kept fresh by `npm run dev`'s `--export-on-exit`.

### Import (restore saved state)
```bash
firebase emulators:start --import=./.emulator-data
```

### Auto-persist (dev mode)
`npm run dev` already uses `--import` and `--export-on-exit` flags, so data survives between dev sessions.

---

## Querying the Emulator

Use the built-in tool:
```bash
node scripts/dev/query-firestore.js --list-collections
node scripts/dev/query-firestore.js --collection trips --json
```

Or directly via the Firebase Admin SDK (the tool uses `functions/node_modules/firebase-admin` with `FIRESTORE_EMULATOR_HOST=localhost:8085`).

---

## Emulator UI

Access at `http://localhost:4000`. Provides:
- **Firestore viewer:** Browse collections, documents, and subcollections
- **Auth viewer:** Manage users, view UIDs
- **Functions logs:** View Cloud Function execution logs
- **Request tracing:** Debug Firestore reads/writes

---

## Common Issues

### Port already in use
```bash
npm run kill-ports
```
This force-kills processes on ports 8085, 9099, 5000, 5001, 4000.

### Functions not deploying / 404
- Make sure you built the functions: `npm --prefix functions run build`
- The functions emulator must be running (part of `npm run dev`)
- Check the function URL includes the correct region (`us-central1`)

### initLocalDb fails with "Could not fetch auth user"
- The Auth emulator doesn't have the user. Create one via the Emulator UI or register in the app first.
- The function still creates all data — name and photo will just be empty.

### Data disappears after restart
- Use `npm run dev` (which auto-persists) instead of raw `firebase emulators:start`
- Or manually add `--import=./.emulator-data --export-on-exit=./.emulator-data`

### Emulator data folder
- Saved state goes to `.emulator-data/` (gitignored)
- Contains Firestore export blobs, Auth state, etc.

---

## Firebase Projects

From `.firebaserc`:
| Alias | Project ID |
|---|---|
| `dev` | `trip-viewer-dev` |
| `prd` | `trip-viewer-prd` |
| `tcc` | `trip-viewer-tcc` |

The emulators use `singleProjectMode: true`, so all emulators share one project. The `firebase-config.js` auto-detects the environment by hostname when deployed, but locally defaults to `trip-viewer-dev`.
