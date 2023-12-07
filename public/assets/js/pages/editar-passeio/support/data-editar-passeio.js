async function _getSinglePlaces() {
    const urlParams = new URLSearchParams(window.location.search);
    const placesID = urlParams.get('p');
  
    if (placesID) {
        const host = window.location.hostname;
        var url =
            host == "localhost"
                ? `http://localhost:5001/trip-viewer-tcc/us-central1/getSinglePlaces?passeioRef=${placesID}`
                : `https://us-central1-trip-viewer-tcc.cloudfunctions.net/getSinglePlaces?passeioRef=${placesID}`;
  
        const response = await fetch(url);
        const text = await response.text();
  
        if (!text || text === 'Documento não encontrado') {
            _displayNoPlaceError();
        } else {
            return JSON.parse(text);
        }
    } else {
        _displayNoPlaceError();
    }
  }