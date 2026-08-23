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

// ============================================================
// Migrations
// ============================================================

// Migration 18: Backfill trips — denormalize destination metadata
// into destinationRefs (title, image, categories booleans, version).
// Usage: ?dryRun=true for preview
import * as migrateTripDestinationMetadataModule from './migrations/18-migrate-trip-destination-metadata';
export const migrateTripDestinationMetadata = migrateTripDestinationMetadataModule.migrate;

// Migration 19: Convert legacy destination entry `region` string into
// a `regions` array (multi-region support).
// Usage: ?dryRun=true for preview
import * as migrateDestinationRegionsModule from './migrations/19-migrate-destination-regions';
export const migrateDestinationRegions = migrateDestinationRegionsModule.migrate;

// Migration 20: Add multi-person expense fields (link + people) to
// every expense entry in preTrip / duringTrip (public + protected).
// Usage: ?dryRun=true for preview
import * as migrateExpenseFieldsModule from './migrations/20-migrate-expense-fields';
export const migrateExpenseFields = migrateExpenseFieldsModule.migrate;
