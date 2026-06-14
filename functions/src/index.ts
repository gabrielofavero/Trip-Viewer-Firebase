import * as admin from "firebase-admin";

admin.initializeApp();

import * as migration12 from "./migrations/12-migrate-destination-object";
export const migrate = migration12.migrate;

import * as migration13 from "./migrations/13-migrate-english-fields";
export const migrateEnglishFields = migration13.migrate;
