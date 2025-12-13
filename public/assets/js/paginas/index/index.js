document.addEventListener('DOMContentLoaded', async function () {
  _startLoadingScreen();
  try {
    _main();
  } catch (error) {
    _displayError(error);
    throw error;
  }
  _stopLoadingScreen();
});

async function _loadIndexPage() {
  _loadVisibilityIndex();
  _loadListenersIndex();
  _loadUserIndex();
  $('body').css('overflow', 'auto');
}