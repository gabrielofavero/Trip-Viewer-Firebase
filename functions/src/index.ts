import { getTripData, getConfig, getBackup, getSingleTrip } from './data/get';
import * as admin from "firebase-admin";

admin.initializeApp();

export { getTripData, getBackup, getConfig, getSingleTrip };