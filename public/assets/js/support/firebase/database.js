import { getUID } from "./user.js";
import { translate } from "../../main/translate.js";
import { getURLParam } from "../data/data.js";
import { getDateString } from "../data/dates.js";

export var DOCUMENT_ID;
export var ERROR_FROM_GET_REQUEST = "";

export var FIRESTORE_DATA;
export var FIRESTORE_NEW_DATA;
export var FIRESTORE_DESTINOS_DATA;
export var FIRESTORE_DESTINOS_NEW_DATA
export var FIRESTORE_PROGRAMACAO_DATA;
export var FIRESTORE_GASTOS_DATA;
export var FIRESTORE_GASTOS_NEW_DATA

const DATABASE_TRIP_DOCUMENTS = ["viagens", "destinos", "listagens"];

// Constructors
function buildDatabaseObject(success, message = "", data = {}) {
  return ({
    success: success,
    data: data,
    message: message
  })

}

// Generic Methods
export async function get(path, treatError = true) {
  try {
    const docRef = firebase.firestore().doc(path);
    const snapshot = await docRef.get();

    if (snapshot.exists) {
      return snapshot.data();
    } else {
      const message = `Document not found: ${path}`;
      console.warn(message);
      return;
    }
  } catch (error) {
    if (treatError) {
      console.error(error.message);
      ERROR_FROM_GET_REQUEST = error;
      return;
    } else throw error;
  }
}

export async function create(collection, data, docName = "") {
  try {
    let docRef = '';
    if (!docName) {
      docRef = await firebase.firestore().collection(collection).add(data);
    } else {
      docRef = await firebase.firestore().collection(collection).doc(docName).set(data)
    }
    return buildDatabaseObject(true, translate('messages.documents.create.success'), docRef)

  } catch (error) {
    console.error(error.message);
    return buildDatabaseObject(false, `${translate('messages.documents.create.error')}: ${error.message}`)
  }
}

export async function deepCreate(path, data, docId = "") {
  try {
    let docRef;

    if (!docId) {
      // Auto-generate document ID
      docRef = await firebase.firestore().collection(path).add(data);
    } else {
      // Specify custom document ID (supports deeper paths)
      docRef = firebase.firestore().doc(`${path}/${docId}`);
      await docRef.set(data);
    }

    return buildDatabaseObject(true, translate('messages.documents.create.success'), docRef);
  } catch (error) {
    console.error(error.message);
    return buildDatabaseObject(false, `${translate('messages.documents.create.error')}: ${error.message}`);
  }
}

export async function update(path, newData) {
  const docRef = firebase.firestore().doc(path);
  try {
    const update = await docRef.update(newData);
    return buildDatabaseObject(true, translate('messages.documents.update.success'), update);
  } catch (error) {
    console.error(error.message);
    return buildDatabaseObject(false, `${translate('messages.documents.update.error')}: ${error.message}`)
  }
}

export async function override(path, newData) {
  const docRef = firebase.firestore().doc(path);
  try {
    await docRef.set(newData, { merge: false });
    return buildDatabaseObject(true, translate('messages.documents.replace.success'));
  } catch (error) {
    console.error(error.message);
    return buildDatabaseObject(false, `${translate('messages.documents.replace.error')}: ${error.message}`);
  }
}

export async function deleteData(path) {
  const docRef = firebase.firestore().doc(path);
  try {
    const deleteObj = await docRef.delete();
    return buildDatabaseObject(true, translate('messages.documents.delete.success'), deleteObj);
  } catch (error) {
    console.error(error.message);
    return buildDatabaseObject(false, `${translate('messages.documents.delete.error')}: ${error.message}`)
  }
}

// Generic Data
export async function getSingleData(type) {
  let data;
  try {
    data = await get(`${type}/${getURLParam(type[0])}`);

    if (data) {
      for (let i = 0; i < data?.destinos?.length; i++) {
        let place;
        try {
          place = await get(`destinos/${data.destinos[i].destinosID}`, false);
          data.destinos[i].destinos = place
        } catch (e) {
          console.warn(`Unable to get destination ${data.destinos[i].destinosID}: ${e.message}`);
          data.destinos.splice(i, 1);
        }
      }
    } else {
      _displayError(`${translate('messages.documents.get.error')}. ${translate(translate('messages.documents.get.no_code'))}`);
    }
  } catch (error) {
    console.error('Error fetching data from Firestore:', error.message);
  }

  return data;
}

// System
export async function getSystemData() {
  const systemData = await get("config/system");
  return systemData;
}

// User
export async function deleteUserObject(id, type) {
  const uid = await getUID();
  if (uid) {
    const userData = await get(`usuarios/${uid}`);
    let dataArray = userData[type];
    dataArray = dataArray.filter(item => item !== id);

    let result = {};
    result[type] = dataArray;

    update(`usuarios/${uid}/`, result)

    return await deleteData(`${type}/${id}`);
  }

}

export async function deleteAccount() {
  const uid = await getUID();
  if (uid) {
    await deleteAccountDocuments();
    await deleteData(`usuarios/${uid}`);
    await firebase.auth().currentUser.delete();
  }
}

export async function deleteAccountDocuments() {
  const uid = await getUID();
  if (uid) {
    const userData = await get(`usuarios/${uid}`);
    const promises = [];

    for (const type of DATABASE_TRIP_DOCUMENTS) {
      if (userData[type]) {
        for (const docID of userData[type]) {
          promises.push(deleteData(`${type}/${docID}`));
        }
        userData[type] = [];
      }
    }

    promises.push(update(`usuarios/${uid}`, userData));
    await Promise.all(promises);
  }
}

export async function createAccountDocuments(data) {
  const uid = await getUID();
  if (!uid) return;

  const promises = [];
  const userData = await get(`usuarios/${uid}`);

  for (const type of DATABASE_TRIP_DOCUMENTS) {
    if (data[type]) {
      for (const document of data[type]) {
        promises.push(create(type, document.data, document.code));
        userData[type].push(document.code);
      }
    }
  }

  promises.push(update(`usuarios/${uid}`, userData));
  await Promise.all(promises);
}

export async function getUserList(type, includeData = false, userData) {
  const uid = await getUID();
  if (uid) {

    if (!userData) {
      userData = await get(`usuarios/${uid}`);
    }

    var result = [];

    if (userData) {
      for (const id of userData[type]) {
        const data = await get(`${type}/${id}`);
        var singleResult = {
          code: id,
          titulo: data.titulo,
        }

        if (data.inicio && data.fim) {
          singleResult.inicio = data.inicio;
          singleResult.fim = data.fim;
        }

        if (data.versao?.ultimaAtualizacao) {
          const date = new Date(data.versao.ultimaAtualizacao);
          const dateString = getDateString(date, "dd/mm/yyyy");
          singleResult.ultimaAtualizacao = data.versao.ultimaAtualizacao;
          singleResult.ultimaAtualizacaoText = `${translate('labels.last_updated_on')} ${dateString}`;
        }

        if (data.subtitulo) {
          singleResult.subtitulo = data.subtitulo;
        }

        if (data.cores) {
          singleResult.cores = data.cores;
        }

        if (includeData) {
          singleResult.data = data;
        }

        result.push(singleResult);
      }
    }

    return result;

  } else {
    throw new Error(translate('messages.errors.unauthenticated'));
  }
}

export async function getUserListIDs(type) {
  const userList = await getUserList(type);
  return userList.map(item => item.code);
}

export async function getUserPermissions() {
  // Seing permissions is only for Front-End purposes. Security is handled by Firebase Rules
  const uid = await getUID();
  if (uid) {
    const userData = await get(`usuarios/${uid}`);
    return userData?.permissoes;
  }
}

export function combineDatabaseResponses(responses) {
  if (responses.length === 1) {
    return responses[0];
  }

  const success = !responses.some(response => response.success === false);
  let message = success ? translate('messages.operations.success') : `${translate('messages.operations.error')}. ${translate('messages.documents.update.error')}`;

  return {
    message: message,
    success: success,
    data: responses
  }
}

// Setters
export function setFirestoreData(data) {
  FIRESTORE_DATA = data;
}

export function setFirestoreNewData(data) {
  FIRESTORE_NEW_DATA = data;
}

export function setFirestoreDestinosData(data) {
  FIRESTORE_DESTINOS_DATA = data;
}

export function setFirestoreDestinosNewData(data) {
  FIRESTORE_DESTINOS_NEW_DATA = data;
}

export function setFirestoreProgramacaoData(data) {
  FIRESTORE_PROGRAMACAO_DATA = data;
}

export function setFirestoreGastosData(data) {
  FIRESTORE_GASTOS_DATA = data;
}

export function setFirestoreGastosNewData(data) {
  FIRESTORE_GASTOS_NEW_DATA = data;
}