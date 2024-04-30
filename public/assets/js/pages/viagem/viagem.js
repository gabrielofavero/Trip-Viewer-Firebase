var refreshed = false;

document.addEventListener('DOMContentLoaded', function () {
  try {
    _startLoadingTimer();
    _main();
    const urlParams = new URLSearchParams(window.location.search);
    let type = 'viagens';

    if (urlParams.has('l')) {
      type = 'listagens';
    }

    window.addEventListener('scroll', () => {
      if (window.scrollY > 0) {
        if (!refreshed) {
          _refreshCategorias();
          refreshed = true;
        }
      } else {
        refreshed = false;
      }
    });	

    Promise.all([_getConfig(), _getSingleData(type)])
      .then(([configData, firestoreData]) => {

        if (!getErrorMsg) {
          
          CONFIG = configData;
          FIRESTORE_DATA = firestoreData;
          console.log('Dados do Firestore Database carregados com sucesso');
          
          _start();
          _mainLoad();
          _adjustPortfolioHeight();
          _refreshCategorias();

        } else {

          const permission = getErrorMsg.includes('Missing or insufficient permissions')
          const msg = permission ? '<br>O documento não está definido como público. Realize o login com uma conta autorizada para visualizar.' : '';
          const innerMsg = permission ? '' : getErrorMsg;
          
          _displayErrorMessage(innerMsg, msg);
          _stopLoadingScreen();

        }

        $('body').css('overflow', 'auto');

        setTimeout(() => {

          _adjustPortfolioHeight();
          _refreshCategorias();
        }, 1000);

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