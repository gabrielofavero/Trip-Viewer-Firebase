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