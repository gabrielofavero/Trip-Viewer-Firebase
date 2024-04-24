// ======= Gallery JS =======

var filterMap = new BiMap();

// ======= LOADERS =======
function _loadPortfolioLightbox() {
    GLightbox({
        selector: '.portfolio-lightbox',
        autofocusVideos: false,
        touchNavigation: true,
        touchFollowAxis: true,
        width: 'auto',
        height: 'auto'
    });
}

function _loadGaleria() {
    _loadGaleriaCategorias(FIRESTORE_DATA.galeria.categorias);
    _loadGaleriaBody(FIRESTORE_DATA.galeria);
    _adjustPortfolioHeight();
    _refreshCategorias();
}

function _loadGaleriaCategorias(filters) {
    let result = "";
    let filtersDiv = document.getElementById("portfolio-flters");

    filters.forEach(filter => {
        const filterClass = _loadFilterClass(filter);
        result += `<li data-filter=".${filterClass}">${filter}</li>`;
    });

    filtersDiv.innerHTML += result;
}

function _loadGaleriaBody(galeria) {
    let result = "";
    for (let i = 0; i < galeria.titulos.length; i++) {
        const link = _getGaleriaLink(galeria.imagens[i]);
        result += `
        <div class="col-lg-4 col-md-6 portfolio-item ${galeria.descricoes[i]}">
            <div class="portfolio-wrap">
            <img src="${link}" class="img-fluid portfolio-lightbox" data-gallery="portfolioGallery" alt="">
            <div class="portfolio-info">
                <h4>${galeria.titulos[i]}</h4>
                <p>${galeria.descricoes[i]}</p>
                <div class="portfolio-links">
                <a href="${link}" data-gallery="portfolioGallery" class="portfolio-lightbox" title="${galeria.descricoes[i]}"><i class="bx bx-zoom-in"></i></a>
                </div>
            </div>
            </div>
        </div>`
    }

    document.getElementById("portfolio-container").innerHTML = result;
    _loadPortfolioLightbox();
}

function _getGaleriaLink(imagem) {
    if (_isObject(imagem)) {
        return imagem.link;
    } else {
        return imagem;
    }
}


function _adjustPortfolioHeight() {
    const container = document.getElementById('portfolio-container');
    
    if (!container) return;

    container.style.height = 'auto';
    let totalHeight = 0;

    container.querySelectorAll('.portfolio-item').forEach(item => {
        totalHeight += item.offsetHeight + parseInt(window.getComputedStyle(item).marginBottom, 10);
    });

    container.style.height = `${totalHeight}px`;
}

function _loadFilterClass(filter) {
    let filterName = 'filter-' + _codifyText(filter);

    if (filterMap[filterName]) {
        filterName += '-' + Object.keys(filterMap).length;
    }

    filterMap.set(filterName, filter);
    return filterName;
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
