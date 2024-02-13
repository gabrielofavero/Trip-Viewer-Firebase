 // ======= Gallery JS =======

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
    _adjustPortfolioHeight();
}

function _loadGallery() {
    _loadGalleryFilters(FIRESTORE_DATA.galeria.filtros);
    _loadGalleryPhotos(FIRESTORE_DATA.galeria.imagens);
}

function _loadGalleryFilters(filters) {
    let result = "";
    let filtersDiv = document.getElementById("portfolio-flters");

    filters.forEach(filter => {
        result += `<li data-filter=".${filter.replace(/ /g, "-")}">${filter}</li>`;
    });

    filtersDiv.innerHTML += result;
}

function _loadGalleryPhotos(photos) {
    let result = "";
    let photosDiv = document.getElementById("portfolio-container");

    photos.forEach(photo => {
        let src = photo.link;
        let title = photo.titulo;
        let description = photo.descricao;
        let filter = photo.filtro;

        result += `
       <div class="col-lg-4 col-md-6 portfolio-item ${filter}">
           <div class="portfolio-wrap">
           <img src="${src}" class="img-fluid portfolio-lightbox" data-gallery="portfolioGallery" alt="">
           <div class="portfolio-info">
               <h4>${title}</h4>
               <p>${description}</p>
               <div class="portfolio-links">
               <a href="${src}" data-gallery="portfolioGallery" class="portfolio-lightbox" title="${description}"><i class="bx bx-zoom-in"></i></a>
               </div>
           </div>
           </div>
       </div>`
    });

    photosDiv.innerHTML = result;
    _loadPortfolioLightbox();
}

function _adjustPortfolioHeight() {
    const container = document.getElementById('portfolio-container');
    if (!container) return;

    container.style.height = 'auto';
  
    let totalHeight = 0;
    const items = container.querySelectorAll('.portfolio-item');
    items.forEach(item => {
        totalHeight += item.offsetHeight + parseInt(window.getComputedStyle(item).marginBottom, 10);
    });
  
    container.style.height = `${totalHeight}px`;
  }