import * as admin from "firebase-admin";

admin.initializeApp();

import * as migration13 from "./migrations/13-migrate-english-fields";
export const m13 = migration13.migrate;

import * as migration14 from "./migrations/14-migrate-user-summaries";
export const m14 = migration14.migrate;

import * as migration15 from "./migrations/15-migrate-trip-destinations";
export const m15 = migration15.migrate;

import * as migration16 from "./migrations/16-migrate-accommodations-subcollection";
export const m16 = migration16.migrate;

import * as migration17 from "./migrations/17-migrate-transportation-subcollection";
export const m17 = migration17.migrate;

import * as migration18 from "./migrations/18-migrate-itinerary-subcollection";
export const m18 = migration18.migrate;

import * as migration19 from "./migrations/19-migrate-collection-names";
export const m19 = migration19.migrate;

import * as migration20 from "./migrations/20-migrate-cleanup";
export const m20 = migration20.migrate;
