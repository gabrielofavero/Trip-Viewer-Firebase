function _loadStylesheetsVisibility() {
    const stylesheets = ['mensagens.css', 'botoes.css'];
    const type = _isOnDarkMode() ? 'enable' : 'disable';
    const functions = [];

    for (const stylesheet of stylesheets) {
        if (_isStylesheetLoaded(stylesheet)) {
            functions.push(() => `${type}DarkModeOnFile(stylesheet)`);
        }
    }

    functions.forEach((func) => func());
}

function _isStylesheetLoaded(name) {
    var stylesheets = document.styleSheets;
    for (var i = 0; i < stylesheets.length; i++) {
        if (stylesheets[i].href && stylesheets[i].href.includes(name)) {
            return true;
        }
    }
    return false;
}

function _enableDarkModeOnFile(stylesheet) {
    switch (stylesheet) {
        case 'mensagens.css':
            _enableDarkModeMensagens();
            break;
        case 'botoes.css':
            _enableDarkModeBotoes();
            break;
        case 'viagem.css':

    }
}


// Mensagens
function _enableDarkModeMensagens() {
    _setCSSVariable('background-mensagens', '#303030')
    _setCSSRule('.error-message', 'color', '#ADADAD');
}

function _disableDarkModeMensagens() {
    _removeCSSVariable('background-mensagens', 'background');
    _removeCSSRule('.error-message', 'color');
}

// Botões
function _enableDarkModeBotoes() {
    _setCSSVariable('roxo', '#7f75b6');
    _setCSSRule('.button', 'color', '#ADADAD');
}

function _disableDarkModeBotoes() {
    _removeCSSVariable('roxo', 'color');
    _removeCSSRule('.button', 'color');
}

// Viagem
function _enableDarkModeViagem() {
    _setCSSVariable('theme-color', THEME_COLOR);
    _setCSSRule('.viagem', 'color', '#ADADAD');
}