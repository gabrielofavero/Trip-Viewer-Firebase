// ======= Device JS =======

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