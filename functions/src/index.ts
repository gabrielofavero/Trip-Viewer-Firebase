import * as admin from "firebase-admin";
import credentials from "./data/main/credentials";

import { getBackup } from "./data/main/backup";
import { getConfig } from "./data/main/config";

import { getSingleTrip, getTripList } from "./data/viagem/get";
import { updateTrip, newTrip } from "./data/viagem/set";
import { deleteTrip } from "./data/viagem/delete";

import { getSinglePlaces, getPlacesList } from "./data/passeios/get";
import { updatePlaces, newPlaces } from "./data/passeios/set";
import { deletePlaces } from "./data/passeios/delete";

import { deleteUser } from "./data/user/delete";

admin.initializeApp({
  credential: admin.credential.cert(credentials as admin.ServiceAccount),
});

export {
  getBackup,
  getConfig,
  getSingleTrip,
  getTripList,
  updateTrip,
  newTrip,
  deleteTrip,
  getSinglePlaces,
  getPlacesList,
  updatePlaces,
  newPlaces,
  deletePlaces,
  deleteUser,
};
