var REFRESHED = false;
var TYPE = 'viagens';

document.addEventListener('DOMContentLoaded', function () {
  try {
    _startLoadingTimer();
    _main();
    const urlParams = new URLSearchParams(window.location.search);
    TYPE = 'viagens';

    if (urlParams.has('l')) {
      TYPE = 'listagens';
    }

    window.addEventListener('scroll', () => {
      if (window.scrollY > 0) {
        if (!REFRESHED) {
          _refreshCategorias();
          REFRESHED = true;
        }
      } else {
        REFRESHED = false;
      }
    });	

    Promise.all([_getConfig(), _getSingleData(TYPE)])
      .then(([configData, firestoreData]) => {

        if (!ERROR_FROM_GET_REQUEST) {
          CONFIG = configData;
          FIRESTORE_DATA = firestoreData;
          console.log('Dados do Firestore Database carregados com sucesso');
          
          _start();
          _mainLoad();
          _adjustPortfolioHeight();
          _refreshCategorias();

        } else if (ERROR_FROM_GET_REQUEST.message.includes('Missing or insufficient permissions')) {
          _displayErrorMessage('O documento não está definido como público. Realize o login com uma conta autorizada para visualizar.');
          _stopLoadingScreen();
        } else {
          _displayErrorMessage(ERROR_FROM_GET_REQUEST);
          _stopLoadingScreen();
        }

        $('body').css('overflow', 'auto');
        
        if (!MESSAGE_MODAL_OPEN) {
          setTimeout(() => {
            _adjustCardsHeights();
            _adjustPortfolioHeight();
            _refreshCategorias();
          }, 1000);
        }

      }).catch((error) => {

        _displayErrorMessage(error);
        throw error;

      });
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
      console.warn("No functions to sync");
    }
    // Loading Screen
    _stopLoadingScreen();
  } catch (error) {
    _displayErrorMessage(error);
    throw error;
  }
}