import * as admin from "firebase-admin";
import credentials from "./data/main/credentials";

admin.initializeApp({
  credential: admin.credential.cert(credentials as admin.ServiceAccount),
});

export {};
