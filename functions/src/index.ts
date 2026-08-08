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

// Dev: initialize a fresh local Firestore emulator database
import * as initLocalDbModule from './dev/init-local-db';
export const initLocalDb = initLocalDbModule.initLocalDb;

// Migration 17: Places API prep — grants the canUsePlacesAPI permission
// to UIDs passed in the request body and adds `placeID` to destination
// entries. Usage: ?dryRun=true for preview; POST {"uids": [...]} to grant.
import * as migratePlacesApiModule from './migrations/17-migrate-places-api';
export const migratePlacesApi = migratePlacesApiModule.migrate;
