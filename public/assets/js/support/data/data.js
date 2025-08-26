import { getID, getChildIDs, getSecondaryIDs, getFirstSecondaryID } from "../pages/selectors.js";
import { translate } from "../../main/translate.js";
import { FIRESTORE_NEW_DATA, FIRESTORE_DESTINOS_NEW_DATA } from "../firebase/database.js";
import { displayError } from "../pages/messages.js";

// Getters
export async function getJson(path) {
  const response = await fetch(path);
  if (!response.ok) {
    displayError()
  }
  return response.json();
}

export function getPage() {
  const path = new URL(document.URL).pathname.slice(1);
  return path || 'index';
}

export function getReadableArray(array) {
  return replaceLast(array.join(", "), ",", ` ${translate('labels.and')}`);
}

function getRandomID(idLength = 5) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomId = '';

  for (let i = 0; i < idLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomId += characters[randomIndex];
  }

  return randomId;
}

export function getNewTypeID(tipo, j) {
  const js = getSecondaryIDs(`${tipo}-box`);
  let ids = [];

  for (const innerJ of js) {
    const id = getID(`${tipo}-id-${innerJ}`).value;
    if (id) ids.push(id);
  }

  const currentID = getID(`${tipo}-id-${j}`).value;
  if (currentID && !ids.includes(currentID)) {
    return currentID;
  }

  let newID = getRandomID();
  while (ids.includes(newID)) {
    newID = getRandomID();
  }
  return newID;
}

export function getTypeID(tipo, j) {
  const currentID = getID(`${tipo}-id-${j}`).value;
  return currentID ? currentID : getNewTypeID(tipo, j);
}

export function getEmptyChar() {
  return '\u200B';
}

export function getURLParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const params = {};
  for (const [key, value] of urlParams) {
    params[key] = value;
  }
  return params;
}

export function getURLParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

export function getNewDataDocument(tipo) {
  switch (tipo) {
    case 'viagens':
    case 'listagens':
      return FIRESTORE_NEW_DATA;
    case 'destinos':
      return FIRESTORE_DESTINOS_NEW_DATA;
    default:
      return null;
  }
}

export async function requestAndGetLocalJSON() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';

    input.onchange = event => {
      const file = event.target.files[0];
      if (!file) {
        reject('No file selected');
        return;
      }

      const reader = new FileReader();
      reader.onload = e => {
        try {
          const json = JSON.parse(e.target.result);
          resolve(json);
        } catch (err) {
          reject('Invalid JSON file');
        }
      };
      reader.onerror = () => reject('Failed to read file');

      reader.readAsText(file);
    };

    input.click();
  });
}


// Setters
export function addFunction(type) {
  const dynamicFunctionName = `_add${type}`;
  if (typeof window[dynamicFunctionName] === 'function') {
    window[dynamicFunctionName]();
  } else {
    console.error(`${dynamicFunctionName} is not defined.`);
  }
}

function removeChild(tipo) {
  const div = getID(tipo);
  div.parentNode.removeChild(div);
}

function replaceLast(text, search, replacement) {
  var target = text;
  return target.replace(new RegExp(search + "(?![\\s\\S]*" + search + ")", "g"), replacement);
}

export function removeChildWithValidation(categoria, j) {
  removeChild(`${categoria}-${j}`);
  hideParentIfNoChildren(categoria);
}

function hideParentIfNoChildren(categoria) {
  if (getChildIDs(`${categoria}-box`).length === 0) {
    getID(`habilitado-${categoria}`).checked = false;
    _hideContent(categoria);
  }
}

export function removeEmptyChild(categoria) {
  let itens = [];

  switch (categoria) {
    case 'restaurantes':
    case 'lanches':
    case 'saidas':
    case 'turismo':
    case 'lojas':
    case 'lineup':
      itens = [`${categoria}-nome`];
      break;
    case 'transporte':
      itens = ['ponto-partida', 'ponto-chegada'];
      break;
    case 'hospedagens':
      itens = [`${categoria}-nome`, `${categoria}-endereco`];
      break;
    case 'galeria':
      itens = [`${categoria}-titulo`, `link-${categoria}`];
      break;
  }

  if (itens.length > 0) {
    const j = getFirstSecondaryID(`${categoria}-box`);
    if (j && !hasUserData(itens, j)) {
      removeChild(`${categoria}-${j}`);
    }
  }
}

// Checkers
function hasUserData(itens, j) {
  for (const item of itens) {
    if (getID(`${item}-${j}`).value) {
      return true;
    }
  }
  return false;
}

// Converters
export function sortByArray(arrayToSort, referenceArray) {
  arrayToSort.sort((a, b) => {
    const indexA = referenceArray.indexOf(a.name);
    const indexB = referenceArray.indexOf(b.name);
    return indexA - indexB;
  });
}

export function firstCharToUpperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function firstCharsToUpperCase(str) {
  return str.replace(/\b\w/g, l => l.toUpperCase());
}

export function codifyText(inputString) {
  let lowercaseString = inputString.toLowerCase();
  let validFolderName = lowercaseString.replace(/[^a-z0-9_]/g, '');
  return validFolderName;
}

export function uncodifyText(inputString) {
  return firstCharsToUpperCase(inputString.replace(/_/g, ' '));
}