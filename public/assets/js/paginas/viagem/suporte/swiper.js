function _initSwiper(id) {
	const swiper = getID(`${id}-swiper`);

	swiper.style.setProperty("--swiper-navigation-color", THEME_COLOR);
	swiper.style.setProperty("--swiper-pagination-color", THEME_COLOR);

	new Swiper(swiper, {
		speed: 600,
		loop: false,
		spaceBetween: 30,
		pagination: {
			el: `.${id}-pagination`,
			type: "bullets",
			clickable: true,
		},
		navigation: {
			nextEl: `.${id}-next`,
			prevEl: `.${id}-prev`,
		},
	});
}

function _loadSwiperHTML(id, itensHTML) {
	const swiper = getID(id);
	let text = "";

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
