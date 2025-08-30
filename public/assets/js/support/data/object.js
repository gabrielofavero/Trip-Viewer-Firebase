import { PIN_GASTOS } from "../../edit/trip/categories/edit-trip-expenses.js";
import { setSuccessfulSave } from "../../main/app.js";
import { FIRESTORE_DATA, FIRESTORE_DESTINOS_DATA, FIRESTORE_DESTINOS_NEW_DATA, FIRESTORE_GASTOS_DATA, FIRESTORE_GASTOS_NEW_DATA, FIRESTORE_NEW_DATA, FIRESTORE_PROGRAMACAO_DATA } from "../firebase/database.js";
import { stopLoadingScreen } from "../pages/loading.js";
import { openModal } from "../styles/modal.js";
import { getPage } from "./data.js";

var DOCS_CHANGED;

export function isObject(obj) {
  return obj === Object(obj);
}

function compareObjects({ obj1, obj2, ignoredPaths = [], name = 'Objeto' }) {
  let result = {
    name: name,
    areEqual: true,
    differences: []
  };

  function _compare(path, val1, val2) {
    if (typeof val1 === 'object' && val1 !== null && typeof val2 === 'object' && val2 !== null) {
      const keys = new Set([...Object.keys(val1), ...Object.keys(val2)]);
      for (let key of keys) {
        _compare(`${path ? path + '.' : ''}${key}`, val1[key], val2[key]);
      }
    } else if (val1 !== val2) {
      result.areEqual = false;
      result.differences.push({
        path: path || '',
        value1: val1,
        value2: val2
      });
    }
  }

  _compare('', obj1, obj2);

  if (ignoredPaths.length > 0) {
    result.differences = result.differences.filter(diff => !ignoredPaths.includes(diff.path));
    if (result.differences.length === 0) {
      result.areEqual = true;
    }
  }

  return result;
}

function compareDocuments() {
  const result = {
    multiple: false,
    data: [],
  };

  switch (getPage()) {
    case 'edit/trip':
      result.multiple = true;
      _compareAndPush({ obj1: FIRESTORE_DATA, obj2: FIRESTORE_NEW_DATA, ignoredPaths: ['versao.ultimaAtualizacao', 'lineup'], name: 'dados da viagem' });
      _compareAndPush({ obj1: FIRESTORE_PROGRAMACAO_DATA, obj2: FIRESTORE_NEW_DATA.programacoes, ignoredPaths: [], name: 'programação' });
      _compareAndPush({ obj1: FIRESTORE_GASTOS_DATA, obj2: FIRESTORE_GASTOS_NEW_DATA, ignoredPaths: ['versao.ultimaAtualizacao'], name: 'gastos' });
      _compareAndPush({ obj1: { pin: PIN_GASTOS.current }, obj2: { pin: PIN_GASTOS.new }, ignoredPaths: [], name: 'senha de acesso aos gastos' });
      break;
    case 'edit/listing':
      const ignoredPaths = _getIgnoredPathDestinos();
      ignoredPaths.push('versao.ultimaAtualizacao');
      _compareAndPush({ obj1: FIRESTORE_DATA, obj2: FIRESTORE_NEW_DATA, ignoredPaths: ignoredPaths, name: 'dados da listagem' });
      break;
    case 'edit/destination':
      _compareAndPush({ obj1: FIRESTORE_DESTINOS_DATA, obj2: FIRESTORE_DESTINOS_NEW_DATA, ignoredPaths: ['versao.ultimaAtualizacao', 'links'], name: 'dados do destino' });
      break;
    default:
      console.warn('Page not supported. Use "_compareObjects()"');
      return null;
  }

  return result;

  function _compareAndPush({ obj1, obj2, ignoredPaths, name }) {
    result.data.push(compareObjects({ obj1, obj2, ignoredPaths, name }));
  };
}

export function validateIfDocumentChanged() {
  DOCS_CHANGED = compareDocuments();
  const noNewData = !DOCS_CHANGED;
  const unknownError = ((DOCS_CHANGED.multiple && DOCS_CHANGED.data.every(item => item.areEqual)) || DOCS_CHANGED.data[0].areEqual)

  if (noNewData || unknownError) {
    const errorMsgPath = `messages.documents.save.${noNewData ? 'no_new_data' : 'unknown'}`;
    getID('modal-inner-text').innerText = `${translate('messages.documents.save.error')}. ${translate(errorMsgPath)}`;

    setSuccessfulSave(false);
    openModal();
    stopLoadingScreen();
  }
}

export function searchObject(obj, key, strict = true) {
  const keys = key.split(".");
  let result = obj;

  for (const k of keys) {
    if (result && k in result) {
      result = result[k];
    } else {
      return strict ? null : key;
    }
  }

  const type = typeof result;
  if (type != "string") {
    console.error(`Invalid search value for key "${key}": expected a string, got ${type}.`);
    return "";
  }

  return result;
}

export function cloneObject(object) {
  return JSON.parse(JSON.stringify(object));
}