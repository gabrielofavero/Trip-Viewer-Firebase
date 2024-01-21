function _applyCustomColorsViagem() {
    const text = document.getElementById("trip-viewer-text");
    text.style.color = THEME_COLOR;

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
    _addCSSRule('.portfolio #portfolio-flters li:hover', 'color', THEME_COLOR);
    _addCSSRule('.portfolio #portfolio-flters li.filter-active', 'color', THEME_COLOR);
    _addCSSRule('.portfolio .portfolio-wrap .portfolio-links a:hover', 'color', THEME_COLOR);
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
}

function _openShare() {
    var modal = document.getElementById('shareModal');
    modal.style.display = 'block';
}

function _closeShare() {
    var modal = document.getElementById('shareModal');
    modal.style.display = 'none';
}

function _copyShareLink() {
    var divElement = document.getElementById('share-link');
    var textarea = document.createElement('textarea');

    textarea.value = divElement.innerText;

    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}