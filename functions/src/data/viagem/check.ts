import * as functions from "firebase-functions";

// Verifica se o parâmetro é válido
export function _checkParam(
  param: any,
  name: string,
  response: functions.Response
) {
  if (!param) {
    response.status(400).send(`O parâmetro '${name}' é obrigatório.`);
    throw new Error(`O parâmetro '${name}' é obrigatório.`);
  }
}
