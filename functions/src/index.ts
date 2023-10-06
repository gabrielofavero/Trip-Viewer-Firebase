import { getTripData, getConfig, getBackup } from './data/get';
import * as admin from "firebase-admin";

admin.initializeApp();

export { getTripData, getBackup, getConfig };