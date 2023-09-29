
function _generateOfflineData() {
    _logger(INFO, "HYPERLINK:");
    console.log(HYPERLINK);
    _logger(INFO, "P_DATA:");
    console.log(P_DATA);
    _logger(INFO, "SHEET_DATA:");
    console.log(SHEET_DATA);
}

function _loadOfflineMode() {
    try {
        SHEET_DATA = _getJSON("assets/json/offline-data/SHEET_DATA.json");
    } catch (error) {
        _displayErrorMessage(error);
        throw error;
    }
}