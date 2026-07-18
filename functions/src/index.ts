import * as admin from 'firebase-admin';

admin.initializeApp();

// ============================================================
// Consolidated English Migration (replaces migrations 13–22)
//
// Phase 1: Translate all field names/values (Pt → En) and
//          restructure data (summaries → subcollections,
//          accommodations/transportation/itinerary → subcollections).
//          Runs on Portuguese-named collections.
//          Usage: ?dryRun=true for preview
//
// Phase 2: Rename collections (Pt → En), fix itinerary tipo
//          values, fix destination categories.
//          Optional cleanup of old collections via ?cleanup=true.
//          Usage: ?dryRun=true for preview, ?cleanup=true to delete old data
// ============================================================

// Phase 1: Translate & Restructure (was migrations 13–18)
import * as phase1 from './migrations/13-migrate-phase1-translate-restructure';
export const migratePhase1 = phase1.migrate;

// Phase 2: Rename & Finalize (was migrations 19–22)
import * as phase2 from './migrations/14-migrate-phase2-rename-finalize';
export const migratePhase2 = phase2.migrate;

// Dev: initialize a fresh local Firestore emulator database
import * as initLocalDbModule from './dev/init-local-db';
export const initLocalDb = initLocalDbModule.initLocalDb;
