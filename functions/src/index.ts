import * as admin from "firebase-admin";
import credentials from "./data/main/credentials";

import { getConfig } from "./data/main/config";
import { updateVisibility, getVisibility } from "./data/main/visibility";

import { getSingleTrip, getTripList } from "./data/viagem/get";
import { updateTrip, newTrip, updateTripImage } from "./data/viagem/set";
import { deleteTrip } from "./data/viagem/delete";

import { getSinglePlaces, getPlacesList } from "./data/passeios/get";
import { updatePlaces, newPlaces } from "./data/passeios/set";
import { deletePlaces } from "./data/passeios/delete";

import { deleteUser } from "./data/user/delete";
import { getBackup } from "./data/main/backup";

admin.initializeApp({
  credential: admin.credential.cert(credentials as admin.ServiceAccount),
});

export {
  getConfig,
  getBackup,
  updateVisibility,
  getVisibility,
  getSingleTrip,
  getTripList,
  updateTrip,
  newTrip,
  updateTripImage,
  deleteTrip,
  getSinglePlaces,
  getPlacesList,
  updatePlaces,
  newPlaces,
  deletePlaces,
  deleteUser,

};
