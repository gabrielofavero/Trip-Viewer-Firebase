import { getBackup } from './data/backup';
import { getConfig, getSingleTrip, getTripList } from './data/viagem/get';
import { updateViagem, newViagem } from './data/viagem/set';
import * as admin from "firebase-admin";
import credentials from "./data/credentials";

admin.initializeApp({
    credential: admin.credential.cert(credentials as admin.ServiceAccount),
});

export {
    getBackup,
    getConfig,
    getSingleTrip,
    getTripList,
    updateViagem,
    newViagem
};