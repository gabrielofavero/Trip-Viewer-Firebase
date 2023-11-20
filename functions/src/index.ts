import { getBackup } from './data/main/backup';
import { getConfig, getSingleTrip, getTripList } from './data/viagem/get';
import { updateTrip, newTrip } from './data/viagem/set';
import * as admin from "firebase-admin";
import credentials from "./data/main/credentials";

admin.initializeApp({
    credential: admin.credential.cert(credentials as admin.ServiceAccount),
});

export {
    getBackup,
    getConfig,
    getSingleTrip,
    getTripList,
    updateTrip,
    newTrip
};