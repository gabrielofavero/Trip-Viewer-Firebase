// ======= Device JS =======

function _getHTMLpage() {
    let result = window.location.pathname.replace(".html", "");
    switch (result) {
        case "/":
            return "index";
        case "/view":
            return "viagem";
        case "/destination":
            return "destinos";
        case "/expenses":
            return "gastos";
        case "/edit/listing":
            return "editar-listagem";
        case "/edit/destination":
            return "editar-destino";
        case "/edit/trip":
            return "editar-viagem";
        default:
            return result;
    }
}

// ======= CHECKERS =======
function _isIOSDevice() {
    return [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ].includes(navigator.platform)
        ||
        (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}

function _isOnMobileMode() {
    return window.innerWidth < 1200;
}

function _isViagemHTML() {
    return _getHTMLpage() === "viagem";
}