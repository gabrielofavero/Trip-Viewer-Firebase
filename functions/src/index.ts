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

// Migration 16: Backfill user profile fields (name, email, photoURL) from Auth
import * as userProfileMigration from './migrations/16-migrate-user-profile-fields';
export const migrateUserProfile = userProfileMigration.migrate;
