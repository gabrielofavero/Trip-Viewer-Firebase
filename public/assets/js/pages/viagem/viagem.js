document.addEventListener('DOMContentLoaded', function () {
  try {
    _main();
    const urlParams = new URLSearchParams(window.location.search);
    let type = 'viagens';

    if (urlParams.has('l')) {
      type = 'listagens';
    }

    Promise.all([_getConfig(), _getSingleData(type)])
      .then(([configData, firestoreData]) => {
        CONFIG = configData;
        FIRESTORE_DATA = firestoreData;
        console.log('Dados do Firestore Database carregados com sucesso');
        _start();
        _mainLoad();
        $('body').css('overflow', 'auto');
      })
  } catch (error) {
    _displayErrorMessage(error);
    throw error;
  }
});

async function _mainLoad() {
  try {
    if (CALL_SYNC.length > 0) {
      _sortFunctionArray(CALL_SYNC, CONFIG.callSyncOrder.data);
      for (let _function of CALL_SYNC) {
        _function();
      }
    } else {
      _logger(WARNING, "No functions to sync");
    }
    // Loading Screen
    _stopLoadingScreen();
  } catch (error) {
    _displayErrorMessage(error);
    throw error;
  }
}