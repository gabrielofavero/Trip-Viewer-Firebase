/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

// const {onRequest} = require("firebase-functions/v2/https");
// const logger = require("firebase-functions/logger");

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });


const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const { onRequest } = require("firebase-functions/v2/https");

exports.getUsuario = onRequest(async (request, response) => {
  try {
    const userId = "AVMVvshXlStODuSn9gd4"; // ID do documento que você deseja buscar
    const userRef = admin.firestore().collection("usuarios").doc(userId);
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      console.log("Documento não encontrado.");
      response.status(404).send("Documento não encontrado.");
      return;
    }

    const userData = snapshot.data();
    console.log("Dados do usuário:", userData);

    response.status(200).json(userData);
  } catch (error) {
    console.error("Erro ao buscar o documento:", error);
    response.status(500).send("Erro ao buscar o documento.");
  }
});
