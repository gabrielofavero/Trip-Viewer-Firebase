import { getTripData, getConfig, getBackup } from './data/get';
// import { testSet } from './data/set';
import * as admin from "firebase-admin";

admin.initializeApp();

export { getTripData, getBackup, getConfig};