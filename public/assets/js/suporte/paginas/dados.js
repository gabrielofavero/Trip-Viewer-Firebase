var CALL_SYNC = [];
var FIRESTORE_DATA;

var SHEET_DATA;
var P_DATA;
var HYPERLINK;

var CONFIG;
var DOCS_CHANGED;

// ======= CONVERTERS =======
function _sortByArray(arrayToSort, referenceArray) {
  arrayToSort.sort((a, b) => {
    const indexA = referenceArray.indexOf(a.name);
    const indexB = referenceArray.indexOf(b.name);
    return indexA - indexB;
  });
}

function _firstCharToUpperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function _firstCharsToUpperCase(str) {
  return str.replace(/\b\w/g, l => l.toUpperCase());
}

function _codifyText(inputString) {
  let lowercaseString = inputString.toLowerCase();
  let validFolderName = lowercaseString.replace(/[^a-z0-9_]/g, '');
  return validFolderName;
}

function _uncodifyText(inputString) {
  return _firstCharsToUpperCase(inputString.replace(/_/g, ' '));
}

function _getChildIDs(parentId) {
  var parentElement = getID(parentId);

  if (parentElement) {
    var childElements = parentElement.children;
    var idsArray = [];

    for (var i = 0; i < childElements.length; i++) {
      var elementId = childElements[i].id;
      if (elementId) {
        idsArray.push(elementId);
      }
    }
    return idsArray;
  } else {
    console.error("Element with id '" + parentId + "' not found");
    return null;
  }
}

function _isObject(obj) {
  return obj === Object(obj);
}

function _objectExistsAndHasKeys(obj) {
  return _isObject(obj) && obj && Object.keys(obj).length > 0;
}

function _getIdFromObjectDB(dbObject) {
  try {
    const segments = dbObject.data._delegate._key.path.segments
    return segments[segments.length - 1];

  } catch (e) {
    console.error('Cannot get ID from DB: ' + e.message)
    return;
  }
}

function _add(type) {
  const dynamicFunctionName = `_add${type}`;
  if (typeof window[dynamicFunctionName] === 'function') {
    window[dynamicFunctionName]();
  } else {
    console.error(`${dynamicFunctionName} is not defined.`);
  }
}

function _setRequired(id) {
  const div = getID(id);
  if (div) {
    div.setAttribute('required', "");
  }
}

function _removeRequired(id) {
  const div = getID(id);
  if (div) {
    div.removeAttribute('required');
  }
}

function _removeRequired(id) {
  const div = getID(id);
  if (div) {
    div.removeAttribute('required');
  }
}

function _getOptionsFromSelect(id) {
  const selectElement = getID(id);
  let optionValues = [];

  for (let i = 0; i < selectElement.options.length; i++) {
    optionValues.push(selectElement.options[i].value);
  }
  return optionValues;
}

function _printObjectHTML(obj) {
  var str = "<br>";
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) {
      const formattedKey = _uncodifyText(key);
      str += `<br><strong>${formattedKey}:</strong> ${obj[key]}`
    }
  }
  return str;
}

function _getIfExists(objString) {
  try {
    return eval(objString);
  } catch (error) {
    return undefined;
  }
}

function _replaceLast(text, search, replacement) {
  var target = text;
  return target.replace(new RegExp(search + "(?![\\s\\S]*" + search + ")", "g"), replacement);
}

function _getReadableArray(array) {
  return _replaceLast(array.join(", "), ",", ` ${translate('labels.and')}`);
}

function _removeChild(tipo) {
  const div = getID(tipo);
  div.parentNode.removeChild(div);
}

function _removeChildWithValidation(categoria, j) {
  const id = getID(`${categoria}-inner-box-${j}`) ? `${categoria}-inner-box-${j}` : `${categoria}-${j}`;
  _removeChild(id);
  _hideParentIfNoChildren(categoria);
}

function _hideParentIfNoChildren(categoria) {
  if (_getChildIDs(`${categoria}-box`).length === 0) {
    getID(`habilitado-${categoria}`).checked = false;
    _hideContent(categoria);
  }
}

function _removeEmptyChild(categoria) {
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
    const j = _getFirstJ(`${categoria}-box`);
    if (j && !_hasUserData(itens, j)) {
      _removeChild(`${categoria}-${j}`);
    }
  }
}

function _hasUserData(itens, j) {
  for (const item of itens) {
    if (getID(`${item}-${j}`).value) {
      return true;
    }
  }
  return false;
}

function _getIDs(divID) {
  const ids = [];
  for (const item of divID.split('-')) {
    if (!isNaN(item)) {
      ids.push(parseInt(item));
    }
  }
  return ids.join('-');
}

function _getJ(id) {
  const jSplit = id.split("-");
  return parseInt(jSplit[jSplit.length - 1]);
}

function _getJs(parentID) {
  let result = [];
  if (!getID(parentID)) return result;
  for (const child of _getChildIDs(parentID)) {
    const jSplit = child.split("-");
    result.push(parseInt(jSplit[jSplit.length - 1]));
  }
  return result;
}

function _findJFromID(id, tipo) {
  const js = _getJs(`${tipo}-box`);
  for (const j of js) {
    const result = getID(`${tipo}-id-${j}`).value;
    if (result === id) {
      return j;
    }
  }
  return 0;
}

function _getFirstJ(parentID) {
  const js = _getJs(parentID);
  return js[0];
}

function _getLastJ(parentID) {
  const js = _getJs(parentID);
  return js.length === 0 ? 0 : js[js.length - 1];
}

function _getNextJ(parentID) {
  return _getLastJ(parentID) + 1;
}

function _getRandomID({ idLength = 5, pool = [] } = {}) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint32Array(idLength);
  crypto.getRandomValues(array); // native + secure

  let randomId = '';
  for (let i = 0; i < idLength; i++) {
    randomId += characters[array[i] % characters.length];
  }

  // avoid collision
  return pool.includes(randomId)
    ? _getRandomID({ idLength, pool })
    : randomId;
}

function _getCategoriaID(tipo, j) {
  const js = _getJs(`${tipo}-box`);
  let ids = [];

  for (const innerJ of js) {
    const id = getID(`${tipo}-id-${innerJ}`).value;
    if (id) ids.push(id);
  }

  const currentID = getID(`${tipo}-id-${j}`).value;
  if (currentID && !ids.includes(currentID)) {
    return currentID;
  }

  return _getRandomID({ pool: ids });
}

function _getOrCreateCategoriaID(tipo, j) {
  const currentID = getID(`${tipo}-id-${j}`).value;
  return currentID ? currentID : _getCategoriaID(tipo, j);
}

function _getEmptyChar() {
  return '\u200B';
}

function _cloneObject(object) {
  return JSON.parse(JSON.stringify(object));
}

function _getURLParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const params = {};
  for (const [key, value] of urlParams) {
    params[key] = value;
  }
  return params;
}

function _getURLParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

function _compareObjects({ obj1, obj2, ignoredPaths = [], name = 'Objeto' }) {
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

function _compareDocuments() {
  const result = {
    multiple: false,
    data: [],
  };

  switch (_getHTMLpage()) {
    case 'editar-viagem':
      result.multiple = true;
      _compareAndPush({ obj1: FIRESTORE_DATA, obj2: FIRESTORE_NEW_DATA, ignoredPaths: ['versao.ultimaAtualizacao', 'lineup'], name: 'dados da viagem' });
      _compareAndPush({ obj1: FIRESTORE_PROGRAMACAO_DATA, obj2: FIRESTORE_NEW_DATA.programacoes, ignoredPaths: [], name: 'programação' });
      _compareAndPush({ obj1: FIRESTORE_GASTOS_DATA, obj2: FIRESTORE_GASTOS_NEW_DATA, ignoredPaths: ['versao.ultimaAtualizacao'], name: 'gastos' });
      _compareAndPush({ obj1: { pin: PIN.current }, obj2: { pin: PIN.new }, ignoredPaths: [], name: 'senha de acesso aos gastos' });
      break;
    case 'editar-listagem':
      const ignoredPaths = _getIgnoredPathDestinos();
      ignoredPaths.push('versao.ultimaAtualizacao');
      _compareAndPush({ obj1: FIRESTORE_DATA, obj2: FIRESTORE_NEW_DATA, ignoredPaths: ignoredPaths, name: 'dados da listagem' });
      break;
    case 'editar-destino':
      _compareAndPush({ obj1: FIRESTORE_DESTINOS_DATA, obj2: FIRESTORE_DESTINOS_NEW_DATA, ignoredPaths: ['versao.ultimaAtualizacao', 'links'], name: 'dados do destino' });
      break;
    default:
      console.warn('Page not supported. Use "_compareObjects()"');
      return null;
  }

  return result;

  function _compareAndPush({ obj1, obj2, ignoredPaths, name }) {
    result.data.push(_compareObjects({ obj1, obj2, ignoredPaths, name }));
  };
}

function _validateIfDocumentChanged() {
  DOCS_CHANGED = _compareDocuments();
  return !DOCS_CHANGED.data.every(item => item.areEqual);
}

function _getDataDocument(tipo) {
  switch (tipo) {
    case 'viagens':
    case 'listagens':
      return FIRESTORE_DATA;
    case 'destinos':
      return FIRESTORE_DESTINOS_DATA;
    default:
      return null;
  }
}

function _getNewDataDocument(tipo) {
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

function _getLocalJSON() {
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

function _getAndDestinationTitle(value, destinos) {
  if (value.includes('departure')) {
    return _getReadableArray([translate('trip.transportation.departure'), ...destinos]);
  }
  return _getReadableArray([...destinos, translate('trip.transportation.return')]);
}

function _getInnerProgramacaoTitleHTML(dado, spanClass, isCustomTraveler = false) {
  const programacao = dado.programacao || '';
  const presentes = !dado.pessoas ? [] : dado.pessoas
    .filter(p => p.isPresent)
    .map(p => TRAVELERS.find(t => t.id === p.id)?.nome ?? '');

  const todasPresentes = presentes.length === dado.pessoas.length;
  const pessoasTexto = (todasPresentes || isCustomTraveler === true) ? '' : _getReadableArray(presentes);

  let horario = '';
  if (dado.inicio && dado.fim) {
    horario = `${dado.inicio} - ${dado.fim}`;
  } else if (dado.inicio) {
    horario = dado.inicio;
  }

  if (pessoasTexto && horario && programacao) {
    return `${_highlight(`${horario} (${pessoasTexto})`)}: ${programacao}`;
  }

  if (pessoasTexto && programacao) {
    return `${_highlight(`${pessoasTexto}`)}: ${programacao}`;
  }

  if (horario && programacao) {
    return `${_highlight(`${horario}:`)} ${programacao}`;
  }

  return programacao;

  function _highlight(text) {
    return `<span class="${spanClass}">${text}</span>`;
  }
}

function _getTranslatedDocumentLabel(type) {
  switch (type) {
    case 'viagens':
      return translate('trip.document');
    case 'viagens/protected':
      return translate('trip.protected');
    case 'destinos':
      return translate('destination.document');
    case 'listagens':
      return translate('listing.document');
    case 'gastos':
      return translate('trip.expenses.document');
    case 'gastos/protected':
      return translate('trip.expenses.protected');
    case 'protegido':
      return translate('labels.protected');
    default:
      return translate('labels.unknown');
  }
}

function _getErrorFromGetRequestMessage() {
  return ERROR_FROM_GET_REQUEST.message.includes('Missing or insufficient permissions') ? translate('messages.errors.unauthorized_access') : ERROR_FROM_GET_REQUEST;
}
