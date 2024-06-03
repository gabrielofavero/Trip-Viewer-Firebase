// ======= Data JS =======

var CALL_SYNC = [];
var FIRESTORE_DATA;

var SHEET_DATA;
var P_DATA;
var HYPERLINK;

var CONFIG;

// ======= CONVERTERS =======
function _formatTxt(text) {
  // áBç -> abc
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
}

function _addDotSeparator(val) {
  // 1000 -> 1.000
  return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");;
}

function _removeComma(val) {
  return val.split(",")[0];
}

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

function _returnEmptyIfNoValue(value) {
  if (value) {
    return value;
  } else {
    return "";
  }
}

function _isObject(obj) {
  return obj === Object(obj);
}

function _objectExistsAndHasKeys(obj) {
  return _isObject(obj) && obj && Object.keys(obj).length > 0;
}

function _firestoreReferencetoPath(ref) {
  if (ref && ref._path && ref._path.segments) {
    return ref._path.segments.join("/");
  } else {
    return "";
  }
}

function _firestoreReferencetoID(ref) {
  if (ref && ref._path && ref._path.segments) {
    return ref._path.segments[1];
  } else {
    return "";
  }
}

function _getIdFromOjbectDB(dbObject) {
  try {
    const segments = dbObject.data._delegate._key.path.segments
    return segments[segments.length - 1];

  } catch (e) {
    console.error('Falha ao obter ID de DB: ' + e.message)
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
  return _replaceLast(array.join(", "), ",", " e");
}

function _removeChild(tipo) {
  const div = getID(tipo);
  div.parentNode.removeChild(div);
}

function _removeChildWithValidation(tipo, i) {
  _removeChild(`${tipo}-${i}`);
  if (_getChildIDs(`${tipo}-box`).length === 0) {
    getID(`habilitado-${tipo}`).checked = false;
    _hideContent(tipo);
  }
}

function _removeChildDestinosWithValidation(i) {
  _removeChild(`com-destinos-${i}`);
  if (_getChildIDs(`com-destinos`).length === 0) {
    if (getID(`habilitado-destinos`)) {
      getID(`habilitado-destinos`).checked = false;
      _hideContent('destinos');
    }
  }
}

function _copyToClipboard(text) {
  var textarea = document.createElement("textarea");
  textarea.value = text;

  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");

  document.body.removeChild(textarea);

  if (getID('copy-msg')) {
    _toggleFadingVisibility()
  }
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

function _getLastJ(parentID) {
  const js = _getJs(parentID);
  return js.length === 0 ? 0 : js[js.length - 1];
}

function _getNextJ(parentID) {
  return _getLastJ(parentID) + 1;
}

function _getRandomID(idLength = 5) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let randomId = '';

  for (let i = 0; i < idLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomId += characters[randomIndex];
  }

  return randomId;
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

  let newID = _getRandomID();
  while (ids.includes(newID)) {
    newID = _getRandomID();
  }
  return newID;
}

function _getIfDoesNotExistCategoriaID(tipo, j) {
  const currentID = getID(`${tipo}-id-${j}`).value;
  return currentID ? currentID : _getCategoriaID(tipo, j);
}

async function _getConfig() {
  let config = {};
  const callSyncOrder = $.getJSON("assets/json/config/call-sync-order.json").then(data => config.callSyncOrder = data);
  const cores = $.getJSON("assets/json/config/cores.json").then(data => config.cores = data);
  const destinos = $.getJSON("assets/json/config/destinos.json").then(data => config.destinos = data);
  const information = $.getJSON("assets/json/config/information.json").then(data => config.information = data);
  const transportes = $.getJSON("assets/json/config/transportes.json").then(data => config.transportes = data);
  await Promise.all([callSyncOrder, cores, destinos, information, transportes]);
  return config;
}