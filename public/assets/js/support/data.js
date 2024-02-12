// ======= Data JS =======

var CALL_SYNC = [];
var FIRESTORE_DATA;
var CONFIG;

var SHEET_DATA;
var P_DATA;
var HYPERLINK;

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

function _sortFunctionArray(functionArray, orderArray) {
  functionArray.sort((a, b) => {
    const indexA = orderArray.indexOf(a.name);
    const indexB = orderArray.indexOf(b.name);
    return indexA - indexB;
  });
}

function _firstCharToUpperCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function _firstCharToUpperCaseAllWords(str) {
  return str.replace(/\b\w/g, l => l.toUpperCase());
}

function _codifyText(inputString) {
  let lowercaseString = inputString.toLowerCase();
  let validFolderName = lowercaseString.replace(/[^a-z0-9_]/g, '');
  return validFolderName;
}

function _getChildIDs(parentId) {
  var parentElement = document.getElementById(parentId);

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

function _removeEmptyValuesFromEndArray(arr) {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] === "") {
      arr.pop();
    } else {
      break;
    }
  }
  return arr;
}

function _returnEmptyIfNoValue(value) {
  if (value) {
    return value;
  } else {
    return "";
  }
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
    _logger(ERROR, 'Falha ao obter ID de DB: ' + e.message)
    return;
  }
}