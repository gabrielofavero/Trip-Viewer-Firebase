import { getAllTripsFromUser, getConfig, getBackup, getSingleTrip, getTripList } from './data/get';
import * as admin from "firebase-admin";

admin.initializeApp();

export { getAllTripsFromUser, getBackup, getConfig, getSingleTrip, getTripList };