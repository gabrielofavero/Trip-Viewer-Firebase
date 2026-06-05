var FILTER_MAP = new BiMap();

// Carregamento
function loadGallery() {
	loadGaleriaCategorias(
		FIRESTORE_DATA.galeria.categorias || FIRESTORE_DATA.galeria.filtros,
	);
	loadGaleriaBody(FIRESTORE_DATA.galeria);
	adjustPortfolioHeight();
	refreshCategorias();
}

function loadGaleriaCategorias(filters) {
	let result = "";
	let filtersDiv = getID("portfolio-flters");

	filters = filters.filter(
		(item, index) =>
			filters.indexOf(item) === index &&
			item !== null &&
			item !== undefined &&
			item !== "",
	);

	if (filters.length > 0) {
		filters.forEach((filter) => {
			const filterClass = loadFilterClass(filter);
			result += `<li data-filter=".${filterClass}">${filter}</li>`;
		});
		filtersDiv.innerHTML += result;
	} else {
		filtersDiv.style.display = "none";
	}
}

function loadGaleriaBody(galeria) {
	let result = "";
	for (let i = 0; i < galeria.titulos.length; i++) {
		const titulo = getGaleriaTitulo(galeria, i);
		const descricao = getGaleriaDescricoes(galeria, i);
		const link = getGaleriaLink(galeria.imagens[i]);
		const categoria = getGaleriaCategoria(galeria, i);

		result += `
        <div class="col-lg-4 col-md-6 portfolio-item ${categoria}">
            <div class="portfolio-wrap">
                <img src="${link}" class="img-fluid portfolio-lightbox" data-gallery="portfolioGallery" alt="">
                <div class="portfolio-info">
                    <h4>${titulo}</h4>
                    <p>${descricao}</p>
                    <div class="portfolio-links">
                        <a href="${link}" data-gallery="portfolioGallery" class="portfolio-lightbox galeria" title="${descricao}"><i class="bx bx-zoom-in"></i></a>
                    </div>
                </div>
            </div>
        </div>`;
	}

	getID("portfolio-container").innerHTML = result;
	loadImageLightbox("galeria");
}

function loadFilterClass(filter) {
	let filterName = "filter-" + codifyText(filter);

	if (FILTER_MAP[filterName]) {
		filterName += "-" + Object.keys(FILTER_MAP).length;
	}

	FILTER_MAP.set(filterName, filter);
	return filterName;
}

// Getters
function getGaleriaTitulo(galeria, i) {
	let titulo = "";
	if (galeria.titulos && galeria.titulos[i]) {
		// Current Implementation
		titulo = galeria.titulos[i];
	} else if (
		galeria.imagens &&
		galeria.imagens[i] &&
		galeria.imagens[i].titulo
	) {
		// Old Implementation
		titulo = galeria.imagens[i].titulo;
	}
	return titulo || "";
}

function getGaleriaDescricoes(galeria, i) {
	let descricao = "";
	if (galeria.descricoes && galeria.descricoes[i]) {
		// Current Implementation
		descricao = galeria.descricoes[i];
	} else if (
		galeria.imagens &&
		galeria.imagens[i] &&
		galeria.imagens[i].descricao
	) {
		// Implementação Antiga
		descricao = galeria.imagens[i].descricao;
	}
	return descricao || "";
}

function getGaleriaCategoria(galeria, i) {
	let categoria = "";
	if (galeria.categorias && galeria.categorias[i]) {
		// Implementação Atual
		categoria = FILTER_MAP.getByValue(galeria.categorias[i]);
	} else if (
		galeria.imagens &&
		galeria.imagens[i] &&
		galeria.imagens[i].filtro
	) {
		// Implementação Antiga
		categoria = FILTER_MAP.getByValue(galeria.imagens[i].filtro);
	}
	return categoria || "";
}

function getGaleriaLink(imagem) {
	if (isObject(imagem)) {
		return imagem.link;
	} else {
		return imagem;
	}
}

// Visibility
function adjustPortfolioHeight() {
	const container = getID("portfolio-container");

	if (!container) return;

	container.style.height = "auto";
	let totalHeight = 0;

	container.querySelectorAll(".portfolio-item").forEach((item) => {
		totalHeight +=
			item.offsetHeight +
			parseInt(window.getComputedStyle(item).marginBottom, 10);
	});

	container.style.height = `${totalHeight}px`;
}

function refreshCategorias() {
	let portfolioContainer = select(".portfolio-container");
	if (portfolioContainer) {
		let portfolioIsotope = new Isotope(portfolioContainer, {
			itemSelector: ".portfolio-item",
		});

		let portfolioFilters = select("#portfolio-flters li", true);

		on(
			"click",
			"#portfolio-flters li",
			function (e) {
				e.preventDefault();
				portfolioFilters.forEach(function (el) {
					el.classList.remove("filter-active");
				});
				this.classList.add("filter-active");

				portfolioIsotope.arrange({
					filter: this.getAttribute("data-filter"),
				});
				portfolioIsotope.on("arrangeComplete", function () {
					AOS.refresh();
				});
			},
			true,
		);
	}
}
