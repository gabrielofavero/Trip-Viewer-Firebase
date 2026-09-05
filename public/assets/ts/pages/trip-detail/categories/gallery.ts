import { getState } from '../../../data/state.js';
import { BiMap } from '../../../ui/bimap.js';
import { codifyText, getID, isObject, on, select } from '../../../utils/dom.js';
import { loadImageLightbox } from '../support/embed.js';

var FILTER_MAP = new BiMap();

// Carregamento
export function loadGallery() {
	loadGaleriaCategorias(getState().gallery.categories || getState().gallery.filtros);
	loadGaleriaBody(getState().gallery);
	adjustPortfolioHeight();
	refreshCategorias();
}

function loadGaleriaCategorias(filters) {
	let result = '';
	let filtersDiv = getID('portfolio-flters');

	filters = filters.filter(
		(item, index) =>
			filters.indexOf(item) === index && item !== null && item !== undefined && item !== '',
	);

	if (filters.length > 0) {
		filters.forEach((filter) => {
			const filterClass = loadFilterClass(filter);
			result += `<li data-filter=".${filterClass}">${filter}</li>`;
		});
		filtersDiv.innerHTML += result;
	} else {
		filtersDiv.style.display = 'none';
	}
}

function loadGaleriaBody(gallery) {
	let result = '';
	for (let i = 0; i < gallery.titles.length; i++) {
		const title = getGaleriaTitulo(gallery, i);
		const description = getGaleriaDescricoes(gallery, i);
		const link = getGaleriaLink(gallery.images[i]);
		const category = getGaleriaCategoria(gallery, i);

		result += `
        <div class="col-lg-4 col-md-6 portfolio-item ${category}">
            <div class="portfolio-wrap">
                <img src="${link}" class="img-fluid portfolio-lightbox" data-gallery="portfolioGallery" alt="">
                <div class="portfolio-info">
                    <h4>${title}</h4>
                    <p>${description}</p>
                    <div class="portfolio-links">
                        <a href="${link}" data-type="image" data-gallery="portfolioGallery" class="portfolio-lightbox gallery" title="${description}"><i class="bx bx-zoom-in"></i></a>
                    </div>
                </div>
            </div>
        </div>`;
	}

	getID('portfolio-container').innerHTML = result;
	loadImageLightbox('gallery');
}

function loadFilterClass(filter) {
	let filterName = 'filter-' + codifyText(filter);

	if (FILTER_MAP[filterName]) {
		filterName += '-' + Object.keys(FILTER_MAP).length;
	}

	FILTER_MAP.set(filterName, filter);
	return filterName;
}

// Getters
function getGaleriaTitulo(gallery, i) {
	let title = '';
	if (gallery.titles && gallery.titles[i]) {
		// Current Implementation
		title = gallery.titles[i];
	} else if (gallery.images && gallery.images[i] && gallery.images[i].title) {
		// Old Implementation
		title = gallery.images[i].title;
	}
	return title || '';
}

function getGaleriaDescricoes(gallery, i) {
	let description = '';
	if (gallery.descriptions && gallery.descriptions[i]) {
		// Current Implementation
		description = gallery.descriptions[i];
	} else if (gallery.images && gallery.images[i] && gallery.images[i].description) {
		// Old Implementation
		description = gallery.images[i].description;
	}
	return description || '';
}

function getGaleriaCategoria(gallery, i) {
	let category = '';
	if (gallery.categories && gallery.categories[i]) {
		// Current Implementation
		category = FILTER_MAP.getByValue(gallery.categories[i]);
	} else if (gallery.images && gallery.images[i] && gallery.images[i].filtro) {
		// Old Implementation
		category = FILTER_MAP.getByValue(gallery.images[i].filtro);
	}
	return category || '';
}

function getGaleriaLink(image) {
	if (isObject(image)) {
		return image.link;
	} else {
		return image;
	}
}

// Visibility
export function adjustPortfolioHeight() {
	const container = getID('portfolio-container');

	if (!container) return;

	container.style.height = 'auto';
	let totalHeight = 0;

	container.querySelectorAll('.portfolio-item').forEach((item) => {
		const el = item as HTMLElement;
		totalHeight += el.offsetHeight + parseInt(window.getComputedStyle(el).marginBottom, 10);
	});

	container.style.height = `${totalHeight}px`;
}

export function refreshCategorias() {
	let portfolioContainer = select('.portfolio-container');
	if (portfolioContainer) {
		let portfolioIsotope = new Isotope(portfolioContainer, {
			itemSelector: '.portfolio-item',
		});

		let portfolioFilters = select('#portfolio-flters li', true);

		on(
			'click',
			'#portfolio-flters li',
			function (e) {
				e.preventDefault();
				portfolioFilters.forEach(function (el) {
					el.classList.remove('filter-active');
				});
				this.classList.add('filter-active');

				portfolioIsotope.arrange({
					filter: this.getAttribute('data-filter'),
				});
				portfolioIsotope.on('arrangeComplete', function () {
					AOS.refresh();
				});
			},
			true,
		);
	}
}
