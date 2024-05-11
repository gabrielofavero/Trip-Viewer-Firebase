var FILTER_MAP = new BiMap();

// Carregamento
function _loadGaleria() {
    _loadGaleriaCategorias(FIRESTORE_DATA.galeria.categorias || FIRESTORE_DATA.galeria.filtros);
    _loadGaleriaBody(FIRESTORE_DATA.galeria);
    _adjustPortfolioHeight();
    _refreshCategorias();
}

function _loadGaleriaCategorias(filters) {
    let result = "";
    let filtersDiv = getID("portfolio-flters");

    filters = filters.filter((item, index) => filters.indexOf(item) === index && item !== null && item !== undefined && item !== '');

    if (filters.length > 0) {
        filters.forEach(filter => {
            const filterClass = _loadFilterClass(filter);
            result += `<li data-filter=".${filterClass}">${filter}</li>`;
        });
        filtersDiv.innerHTML += result;
    } else {
        filtersDiv.style.display = 'none';
    }
}

function _loadGaleriaBody(galeria) {
    let result = "";
    for (let i = 0; i < galeria.titulos.length; i++) {
        const titulo = _getGaleriaTitulo(galeria, i);
        const descricao = _getGaleriaDescricoes(galeria, i);
        const link = _getGaleriaLink(galeria.imagens[i]);
        const categoria = _getGaleriaCategoria(galeria, i);

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
        </div>`
    }

    getID("portfolio-container").innerHTML = result;
    _loadImageLightbox('galeria');
}

function _loadFilterClass(filter) {
    let filterName = 'filter-' + _codifyText(filter);

    if (FILTER_MAP[filterName]) {
        filterName += '-' + Object.keys(FILTER_MAP).length;
    }

    FILTER_MAP.set(filterName, filter);
    return filterName;
}

// Getters
function _getGaleriaTitulo(galeria, i) {
    let titulo = '';
    if (galeria.titulos && galeria.titulos[i]) { // Implementação Atual
        titulo = galeria.titulos[i];
    } else if (galeria.imagens && galeria.imagens[i] && galeria.imagens[i].titulo) { // Implementação Antiga
        titulo = galeria.imagens[i].titulo;
    }
    return titulo || '';
}

function _getGaleriaDescricoes(galeria, i) {
    let descricao = '';
    if (galeria.descricoes && galeria.descricoes[i]) { // Implementação Atual
        descricao = galeria.descricoes[i];
    } else if (galeria.imagens && galeria.imagens[i] && galeria.imagens[i].descricao) { // Implementação Antiga
        descricao = galeria.imagens[i].descricao;
    }
    return descricao || '';
}

function _getGaleriaCategoria(galeria, i) {
    let categoria = '';
    if (galeria.categorias && galeria.categorias[i]) { // Implementação Atual
        categoria = FILTER_MAP.getByValue(galeria.categorias[i]);
    } else if (galeria.imagens && galeria.imagens[i] && galeria.imagens[i].filtro) { // Implementação Antiga
        categoria = FILTER_MAP.getByValue(galeria.imagens[i].filtro);
    }
    return categoria || '';
}

function _getGaleriaLink(imagem) {
    if (_isObject(imagem)) {
        return imagem.link;
    } else {
        return imagem;
    }
}

// Visibility
function _adjustPortfolioHeight() {
    const container = getID('portfolio-container');

    if (!container) return;

    container.style.height = 'auto';
    let totalHeight = 0;

    container.querySelectorAll('.portfolio-item').forEach(item => {
        totalHeight += item.offsetHeight + parseInt(window.getComputedStyle(item).marginBottom, 10);
    });

    container.style.height = `${totalHeight}px`;
}

function _refreshCategorias() {
    let portfolioContainer = select('.portfolio-container');
    if (portfolioContainer) {
        let portfolioIsotope = new Isotope(portfolioContainer, {
            itemSelector: '.portfolio-item'
        });

        let portfolioFilters = select('#portfolio-flters li', true);

        on('click', '#portfolio-flters li', function (e) {
            e.preventDefault();
            portfolioFilters.forEach(function (el) {
                el.classList.remove('filter-active');
            });
            this.classList.add('filter-active');

            portfolioIsotope.arrange({
                filter: this.getAttribute('data-filter')
            });
            portfolioIsotope.on('arrangeComplete', function () {
                AOS.refresh();
            });
        }, true);
    }
}