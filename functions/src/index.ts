import * as admin from "firebase-admin";

admin.initializeApp();

// English migration series — Prompt 2: Field name & enum value translation
import * as migration13 from "./migrations/13-migrate-english-fields";
export const migrateEnglishFields = migration13.migrate;
/** @deprecated Use migrateEnglishFields */
export const m13 = migration13.migrate;

// Prompt 3a: Split user summaries into subcollections
import * as migration14 from "./migrations/14-migrate-user-summaries";
export const migrateUserSummaries = migration14.migrate;
/** @deprecated Use migrateUserSummaries */
export const m14 = migration14.migrate;

// Prompt 3b: Strip embedded destination data from trip docs
import * as migration15 from "./migrations/15-migrate-trip-destinations";
export const migrateTripDestinations = migration15.migrate;
/** @deprecated Use migrateTripDestinations */
export const m15 = migration15.migrate;

// Prompt 3c: Move accommodations to subcollection
import * as migration16 from "./migrations/16-migrate-accommodations-subcollection";
export const migrateAccommodationsSubcollection = migration16.migrate;
/** @deprecated Use migrateAccommodationsSubcollection */
export const m16 = migration16.migrate;

// Prompt 3d: Move transportation to subcollection
import * as migration17 from "./migrations/17-migrate-transportation-subcollection";
export const migrateTransportationSubcollection = migration17.migrate;
/** @deprecated Use migrateTransportationSubcollection */
export const m17 = migration17.migrate;

// Prompt 3e: Move itinerary to subcollection
import * as migration18 from "./migrations/18-migrate-itinerary-subcollection";
export const migrateItinerarySubcollection = migration18.migrate;
/** @deprecated Use migrateItinerarySubcollection */
export const m18 = migration18.migrate;

// Prompt 4: Rename collections from Portuguese → English
import * as migration19 from "./migrations/19-migrate-collection-names";
export const migrateCollectionNames = migration19.migrate;
/** @deprecated Use migrateCollectionNames */
export const m19 = migration19.migrate;

// Prompt 5: Cleanup old Portuguese collections
import * as migration20 from "./migrations/20-migrate-cleanup";
export const migrateCleanup = migration20.migrate;
/** @deprecated Use migrateCleanup */
export const m20 = migration20.migrate;
