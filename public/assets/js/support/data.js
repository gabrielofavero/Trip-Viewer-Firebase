// ======= Data JS =======

var CALL_SYNC = [];
var FIRESTORE_DATA;
var CONFIG;

var SHEET_DATA;
var P_DATA;
var HYPERLINK;

// ======= GETTERS =======
async function _getFirestoreData() {
  const host = window.location.hostname;
  var url =
    host == "localhost"
      ? "http://localhost:5001/trip-viewer-tcc/us-central1/getTripData?userID=R0yDPACnVVPjx2S6oqP6zqVI20t1"
      : "https://us-central1-trip-viewer-tcc.cloudfunctions.net/getTripData?userID=R0yDPACnVVPjx2S6oqP6zqVI20t1";

  const response = await fetch(url);
  const data = await response.json();
  return data[0]; // Zero pois é a primeira viagem para esse teste. Adaptar posteriormente por ID
}

async function _getConfig() {
  const host = window.location.hostname;
  var url =
    host == "localhost"
      ? "http://localhost:5001/trip-viewer-tcc/us-central1/getConfig"
      : "https://us-central1-trip-viewer-tcc.cloudfunctions.net/getConfig";

  const response = await fetch(url);
  const data = await response.json();
  return data;
}

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

function _convertFirestoreDate(timestamp) {
  return new Date(timestamp._seconds * 1000 + timestamp._nanoseconds / 1000000);
}

function _sortFunctionArray(functionArray, orderArray) {
  functionArray.sort((a, b) => {
    const indexA = orderArray.indexOf(a.name);
    const indexB = orderArray.indexOf(b.name);
    return indexA - indexB;
  });
}