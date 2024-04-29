function _initSwipers(className = 'testimonials-slider') {
    // Get the element
    const swiperElements = document.querySelectorAll(`.${className}`);

    for (const swiperElement of swiperElements) {
        swiperElement.style.setProperty('--swiper-navigation-color', THEME_COLOR);
        swiperElement.style.setProperty('--swiper-pagination-color', THEME_COLOR);

        new Swiper(swiperElement, {
            speed: 600,
            loop: false,
            spaceBetween: 30,
            pagination: {
                el: '.swiper-pagination',
                type: 'bullets',
                clickable: true
            }
        });
    }
}

function _loadSwiperHTML(id, itensHTML) {
    const swiper = getID(id);
    let text = '';

    for (const item of itensHTML) {
        text += `
        <div class="swiper-slide">
            <div class="testimonial-item">
                ${item}
            </div>
        </div>`;
    }

    swiper.innerHTML = text;
}