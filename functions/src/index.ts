import * as admin from 'firebase-admin';

admin.initializeApp();

// ============================================================
// This index normally exposes only dev helpers (initLocalDb).
//
// Runnable data migrations (scripts/build/migrations-config.json) are NOT
// exported here. They are served temporarily by the local Functions emulator
// when you run them against a live project:
//
//   npm run migrations -- --project <dev|prd>
//
//   or automatically after `npm run deploy` — scripts/build/run-migrations.py
//   generates a temporary index exposing only the selected migrations, builds,
//   runs the Functions emulator against the project's real Firestore, then
//   restores this file (revert everything). initLocalDb is never included in
//   that temporary index.
// ============================================================

// Dev: initialize a fresh local Firestore emulator database
import * as initLocalDbModule from './dev/init-local-db';
export const initLocalDb = initLocalDbModule.initLocalDb;
