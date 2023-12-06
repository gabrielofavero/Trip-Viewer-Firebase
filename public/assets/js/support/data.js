// ======= Data JS =======

var CALL_SYNC = [];
var FIRESTORE_DATA;
var CONFIG;

var SHEET_DATA;
var P_DATA;
var HYPERLINK;


// ======= GETTERS =======
async function _getSingleTrip() {
  const urlParams = new URLSearchParams(window.location.search);
  const tripID = urlParams.get('v');

  if (tripID) {
      const host = window.location.hostname;
      var url =
          host == "localhost"
              ? `http://localhost:5001/trip-viewer-tcc/us-central1/getSingleTrip?viagemRef=${tripID}`
              : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/getSingleTrip?viagemRef=${tripID}`;

      const response = await fetch(url);
      const text = await response.text();

      if (!text || text === 'Documento não encontrado') {
          _displayNoTripError();
      } else {
          return JSON.parse(text);
      }
  } else {
      _displayNoTripError();
  }
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

function _codifyText(inputString) {
  let lowercaseString = inputString.toLowerCase();
  let validFolderName = lowercaseString.replace(/[^a-z0-9_]/g, '');
  return validFolderName;
}