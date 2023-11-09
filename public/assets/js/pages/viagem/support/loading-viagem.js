function _displayNoTripError() {
    const preloader = document.getElementById('preloader');

    if (preloader) {
        ERROR_MODE = true;
        _disableScroll();
        const errorContainer = document.createElement('div');
        errorContainer.className = 'error-container';
        const errorText = document.createElement('div');
        errorText.className = 'error-text';
        const errorTitle = document.createElement('h2');
        errorTitle.innerText = "Erro ao carregar a página 🙁";
        errorText.appendChild(errorTitle);
        const errorDescription = document.createElement('p');
        errorDescription.innerHTML = "<br>Não foi possível carregar a página. Não há um código de viagem válido na URL.<br><br><br> Caso você acredite que esse seja um erro, <a href=\"mailto:gabriel.o.favero@live.com\">entre em contato com o administrador</a>";
        errorText.appendChild(errorDescription);

        errorContainer.appendChild(errorText);
        preloader.innerHTML = '';
        preloader.style.background = 'rgba(0, 0, 0, 0.6)';
        preloader.appendChild(errorContainer);

        if (preloader.style.display != 'block') {
            preloader.style.display = 'block';
        }
    } else {
        _logger(WARN, 'No preloader element found');
    }
}