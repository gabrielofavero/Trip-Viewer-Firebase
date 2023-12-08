import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as interfaces from "../main/interfaces";
import { _getDataFromPath } from "../main/get";

export async function _getUser(
  request: functions.Request,
  response: functions.Response
) {
  const uid = await _getAuthUserUID(request, response);
  const path = `usuarios/${uid}`;
  return (await _getDataFromPath(
    path,
    response
  )) as unknown as interfaces.Usuario;
}

export async function _getAuthUserUID(
  request: functions.Request,
  response: functions.Response
) {
  const authToken = request.query.token;

  if (!authToken) {
    response.status(401).json({ error: "Authentication token is missing" });
  }

  try {
    const AuthUser = await admin.auth().verifyIdToken(authToken as string);
    return AuthUser.uid;
  } catch (e) {
    response.status(401).json({ error: "A autenticação falhou" });
  }

  return null;
}
