var ADJUST_HEIGHT_CARDS = [];

function _applyCustomColorsViagem() {
    getID("trip-viewer-text").style.color = THEME_COLOR;
    _applyCustomColorsPreloader();

    _setCSSRule('.back-to-top', 'background', THEME_COLOR);
    _setCSSRule('.back-to-top:hover', 'background', THEME_COLOR);
    _setCSSRule('.nav-menu a:hover', 'background', THEME_COLOR);
    _setCSSRule('.nav-menu .active', 'background', THEME_COLOR);
    _setCSSRule('.nav-menu .active:focus', 'background', THEME_COLOR);
    _setCSSRule('.nav-menu li:hover>a', 'background', THEME_COLOR);
    _setCSSRule('.mobile-nav-active .mobile-nav-toggle', 'background-color', THEME_COLOR);
    _setCSSRule('#hero p span', 'color', THEME_COLOR);
    _setCSSRule('#hero .social-links a:hover', 'color', THEME_COLOR);
    _setCSSRule('.section-title h2::after', 'background', THEME_COLOR);
    _setCSSRule('.about .content ul i', 'color', THEME_COLOR);
    _setCSSRule('.facts .count-box i', 'background', THEME_COLOR);
    _setCSSRule('.about .count-box i', 'background', THEME_COLOR);
    _setCSSRule('.skills .progress-bar', 'background-color', THEME_COLOR);
    _setCSSRule('.about .progress-bar', 'background-color', THEME_COLOR);
    _setCSSRule('#calendarTitle', 'background', THEME_COLOR);
    _setCSSRule('.resume .resume-item', 'border-left', `2px solid ${THEME_COLOR}`);
    _setCSSRule('#portfolio-flters li:hover', 'color', THEME_COLOR);
    _setCSSRule('#portfolio-flters li.filter-active', 'color', THEME_COLOR);
    _setCSSRule('.portfolio-wrap .portfolio-links a:hover', 'color', THEME_COLOR);
    _setCSSRule('.portfolio-details .portfolio-details-slider .swiper-pagination .swiper-pagination-bullet', 'border', `1px solid ${THEME_COLOR}`);
    _setCSSRule('.portfolio-details .portfolio-details-slider .swiper-pagination .swiper-pagination-bullet-active', 'background-color', THEME_COLOR);
    _setCSSRule('.testimonials .swiper-pagination .swiper-pagination-bullet', 'border', `1px solid ${THEME_COLOR}`);
    _setCSSRule('.testimonials .swiper-pagination .swiper-pagination-bullet-active', 'background-color', THEME_COLOR);
    _setCSSRule('.contact .info i', 'color', THEME_COLOR);
    _setCSSRule('.contact .info .email:hover i', 'background', THEME_COLOR);
    _setCSSRule('.contact .info .address:hover i', 'background', THEME_COLOR);
    _setCSSRule('.contact .info .phone:hover i', 'background', THEME_COLOR);
    _setCSSRule('#botao', 'background', THEME_COLOR);
    _setCSSRule('#botao-right', 'background', THEME_COLOR);
    _setCSSRule('#botao-salvar', 'background', THEME_COLOR);
    _setCSSRule('#botao:hover', 'background', THEME_COLOR);
    _setCSSRule('#botao-right:hover', 'background', THEME_COLOR);
    _setCSSRule('#botao-salvar:hover', 'background', THEME_COLOR);
    _setCSSRule('#circulo', 'color', THEME_COLOR);
    _setCSSRule('#circulo-mini', 'color', THEME_COLOR);
    _setCSSRule('#circulo:hover', 'background', THEME_COLOR);
    _setCSSRule('#circulo-mini:hover', 'background', THEME_COLOR);
    _setCSSRule('#footer .social-links a', 'background', THEME_COLOR);
    _setCSSRule('#footer .social-links a:hover', 'background', THEME_COLOR);
    _setCSSRule('#previous', 'background-color', THEME_COLOR);
    _setCSSRule('#next', 'background-color', THEME_COLOR);
    _setCSSRule('.calendarTrip:hover', 'background-color', `${THEME_COLOR} !important`);
    _setCSSRule('.calendarTrip:active', 'background-color', `${THEME_COLOR} !important`);
    _setCSSRule('.flight-icon', 'color', `${THEME_COLOR} !important`);
    _setCSSRule('.external-link', 'color', THEME_COLOR);
    _setCSSRule('.color-icon', 'color', THEME_COLOR);
    _setCSSRule('.active-pill', 'background-color', THEME_COLOR_SECONDARY)
    _setCSSRule('.active-circle', 'background-color', THEME_COLOR)
    _setCSSRule('.active-calendar', 'background-color', `${THEME_COLOR_SECONDARY} !important`)
    _setCSSRule('.pill:hover .pill-circle-default', 'background-color', THEME_COLOR)
}

function _applyCustomColorsPreloader(){
    _setCSSRule('#preloader:before', 'border-right-color', THEME_COLOR);
    _setCSSRule('#preloader:before', 'border-left-color', THEME_COLOR);
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