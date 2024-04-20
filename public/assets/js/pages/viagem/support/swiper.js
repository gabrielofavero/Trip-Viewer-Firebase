function _initSwiper(className = 'swiper-container') {
    new Swiper(`.${className}`, {
        speed: 600,
        loop: true,
        autoplay: {
            delay: 5000,
            disableOnInteraction: false
        },
        slidesPerView: 'auto',
        pagination: {
            el: '.swiper-pagination',
            type: 'bullets',
            clickable: true
        }
    });
}

function _getSwipperHTML(id, className, items) {
    let swiper = document.createElement('div');
    swiper.id = id;
    swiper.className = className;
    let swiperWrapper = document.createElement('div');
    swiperWrapper.className = 'swiper-wrapper';
    items.forEach(item => {
        let swiperSlide = document.createElement('div');
        swiperSlide.className = 'swiper-slide';
        swiperSlide.innerHTML = item;
        swiperWrapper.appendChild(swiperSlide);
    });
    swiper.appendChild(swiperWrapper);
    let swiperPagination = document.createElement('div');
    swiperPagination.className = 'swiper-pagination';
    swiper.appendChild(swiperPagination);
    return swiper;
}

function _addItensToSwiperHTML(swiperID, items) {
    let swiper = document.getElementById(swiperID);
    let swiperWrapper = swiper.querySelector('.swiper-wrapper');
    items.forEach(item => {
        let swiperSlide = document.createElement('div');
        swiperSlide.className = 'swiper-slide';
        swiperSlide.innerHTML = item;
        swiperWrapper.appendChild(swiperSlide);
    });
}