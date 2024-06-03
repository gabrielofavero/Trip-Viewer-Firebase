var ADJUST_HEIGHT_CARDS = [];

function _applyCustomColorsViagem() {
    getID("trip-viewer-text").style.color = THEME_COLOR;
    _applyCustomColorsPreloader();

    _addCSSRule('.back-to-top', 'background', THEME_COLOR);
    _addCSSRule('.back-to-top:hover', 'background', THEME_COLOR);
    _addCSSRule('.nav-menu a:hover', 'background', THEME_COLOR);
    _addCSSRule('.nav-menu .active', 'background', THEME_COLOR);
    _addCSSRule('.nav-menu .active:focus', 'background', THEME_COLOR);
    _addCSSRule('.nav-menu li:hover>a', 'background', THEME_COLOR);
    _addCSSRule('.mobile-nav-active .mobile-nav-toggle', 'background-color', THEME_COLOR);
    _addCSSRule('#hero p span', 'color', THEME_COLOR);
    _addCSSRule('#hero .social-links a:hover', 'color', THEME_COLOR);
    _addCSSRule('.section-title h2::after', 'background', THEME_COLOR);
    _addCSSRule('.about .content ul i', 'color', THEME_COLOR);
    _addCSSRule('.facts .count-box i', 'background', THEME_COLOR);
    _addCSSRule('.about .count-box i', 'background', THEME_COLOR);
    _addCSSRule('.skills .progress-bar', 'background-color', THEME_COLOR);
    _addCSSRule('.about .progress-bar', 'background-color', THEME_COLOR);
    _addCSSRule('#calendarTitle', 'background', THEME_COLOR);
    _addCSSRule('.resume .resume-item', 'border-left', `2px solid ${THEME_COLOR}`);
    _addCSSRule('#portfolio-flters li:hover', 'color', THEME_COLOR);
    _addCSSRule('#portfolio-flters li.filter-active', 'color', THEME_COLOR);
    _addCSSRule('.portfolio-wrap .portfolio-links a:hover', 'color', THEME_COLOR);
    _addCSSRule('.portfolio-details .portfolio-details-slider .swiper-pagination .swiper-pagination-bullet', 'border', `1px solid ${THEME_COLOR}`);
    _addCSSRule('.portfolio-details .portfolio-details-slider .swiper-pagination .swiper-pagination-bullet-active', 'background-color', THEME_COLOR);
    _addCSSRule('.testimonials .swiper-pagination .swiper-pagination-bullet', 'border', `1px solid ${THEME_COLOR}`);
    _addCSSRule('.testimonials .swiper-pagination .swiper-pagination-bullet-active', 'background-color', THEME_COLOR);
    _addCSSRule('.contact .info i', 'color', THEME_COLOR);
    _addCSSRule('.contact .info .email:hover i', 'background', THEME_COLOR);
    _addCSSRule('.contact .info .address:hover i', 'background', THEME_COLOR);
    _addCSSRule('.contact .info .phone:hover i', 'background', THEME_COLOR);
    _addCSSRule('#botao', 'background', THEME_COLOR);
    _addCSSRule('#botao-right', 'background', THEME_COLOR);
    _addCSSRule('#botao-salvar', 'background', THEME_COLOR);
    _addCSSRule('#botao:hover', 'background', THEME_COLOR);
    _addCSSRule('#botao-right:hover', 'background', THEME_COLOR);
    _addCSSRule('#botao-salvar:hover', 'background', THEME_COLOR);
    _addCSSRule('#circulo', 'color', THEME_COLOR);
    _addCSSRule('#circulo-mini', 'color', THEME_COLOR);
    _addCSSRule('#circulo:hover', 'background', THEME_COLOR);
    _addCSSRule('#circulo-mini:hover', 'background', THEME_COLOR);
    _addCSSRule('#footer .social-links a', 'background', THEME_COLOR);
    _addCSSRule('#footer .social-links a:hover', 'background', THEME_COLOR);
    _addCSSRule('#previous', 'background-color', THEME_COLOR);
    _addCSSRule('#next', 'background-color', THEME_COLOR);
    _addCSSRule('.calendarTrip:hover', 'background-color', `${THEME_COLOR} !important`);
    _addCSSRule('.calendarTrip:active', 'background-color', `${THEME_COLOR} !important`);
    _addCSSRule('.flight-icon', 'color', `${THEME_COLOR} !important`);
    _addCSSRule('.external-link', 'color', THEME_COLOR);
    _addCSSRule('.color-icon', 'color', THEME_COLOR);
    _addCSSRule('.active-pill', 'background-color', THEME_COLOR_SECONDARY)
    _addCSSRule('.active-circle', 'background-color', THEME_COLOR)
    _addCSSRule('.active-calendar', 'background-color', `${THEME_COLOR_SECONDARY} !important`)
    _addCSSRule('.pill:hover .pill-circle', 'background-color', THEME_COLOR)
}

function _applyCustomColorsPreloader(){
    _addCSSRule('#preloader:before', 'border-right-color', THEME_COLOR);
    _addCSSRule('#preloader:before', 'border-left-color', THEME_COLOR);
}

function _loadAdjustCardsHeightsListener() {
    window.addEventListener('resize', _adjustCardsHeights);
}

function _adjustCardsHeights() {
    if (ADJUST_HEIGHT_CARDS.length > 0) {
        for (const card of ADJUST_HEIGHT_CARDS) {
            _adjustSingleCardsHeights(card);
        }
    }
}

function _adjustSingleCardsHeights(tipo, second=false) {
    let innerID = (tipo === 'hospedagens' && !second) ? 'nome' : 'box';

    const sliders = _getChildIDs(`${tipo}-wrapper`);
    let maxHeight = 0;
  
    for (const slider of sliders) {
        const j = _getJ(slider);
        const box = getID(`${tipo}-${innerID}-${j}`);

        if (box) {
            box.style.height = 'auto';
            const height = box.offsetHeight;
            if (height > maxHeight) {
                maxHeight = height;
            }
        }
    }
  
    for (const slider of sliders) {
        const j = _getJ(slider);
        const div = getID(`${tipo}-${innerID}-${j}`);
        if (div) {
            div.style.height = `${maxHeight}px`;
        }
    }

    if (tipo === 'hospedagens' && !second) {
        _adjustSingleCardsHeights('hospedagens', true);
    }
  }