/* ======= Main JS =======
    - Template Name: MyResume - v4.5.0
    - Template URL: https://bootstrapmade.com/free-html-bootstrap-template-my-resume/
    - Author: BootstrapMade.com
    - License: https://bootstrapmade.com/license/
    - Modified by: Gabriel Fávero
*/

var blockLoadingEnd = false;
var placesID;
_startLoadingScreen();

document.addEventListener('DOMContentLoaded', function () {
  try {
    "use strict";
    $('body').css('overflow', 'hidden');

    let app = firebase.app();
    let features = [
      'auth',
      'database',
      'firestore',
      'functions',
      'messaging',
      'storage',
      'analytics',
      'remoteConfig',
      'performance',
    ].filter(feature => typeof app[feature] === 'function');
    console.log(`Firebase SDK loaded with ${features.join(', ')}`);

    $('#myModal').on('shown.bs.modal', function () {
      $('#myInput').trigger('focus')
    })

    /**
     * Easy selector helper function
     */
    const select = (el, all = false) => {
      el = el.trim()
      if (all) {
        return [...document.querySelectorAll(el)]
      } else {
        return document.querySelector(el)
      }
    }

    /**
     * Easy event listener function
     */
    const on = (type, el, listener, all = false) => {
      let selectEl = select(el, all)
      if (selectEl) {
        if (all) {
          selectEl.forEach(e => e.addEventListener(type, listener))
        } else {
          selectEl.addEventListener(type, listener)
        }
      }
    }

    /**
     * Easy on scroll event listener 
     */
    const onscroll = (el, listener) => {
      el.addEventListener('scroll', listener)
    }
    /**
     * Navbar links active state on scroll
     */
    let navbarlinks = select('#navbar .scrollto', true)
    const navbarlinksActive = () => {
      let position = window.scrollY + 200
      navbarlinks.forEach(navbarlink => {
        if (!navbarlink.hash) return
        let section = select(navbarlink.hash)
        if (!section) return
        if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
          navbarlink.classList.add('active')
        } else {
          navbarlink.classList.remove('active')
        }
      })
    }
    window.addEventListener('load', navbarlinksActive)
    onscroll(document, navbarlinksActive)

    /**
     * Scrolls to an element with header offset
     */
    const scrollto = (el) => {
      let elementPos = select(el).offsetTop
      window.scrollTo({
        top: elementPos,
        behavior: 'smooth'
      })
    }

    /**
     * Back to top button
     */
    let backtotop = select('.back-to-top')
    if (backtotop) {
      const toggleBacktotop = () => {
        if (window.scrollY > 100) {
          backtotop.classList.add('active')
        } else {
          backtotop.classList.remove('active')
        }
      }
      window.addEventListener('load', toggleBacktotop)
      onscroll(document, toggleBacktotop)
    }

    /**
     * Mobile nav toggle
     */
    on('click', '.mobile-nav-toggle', function (e) {
      select('body').classList.toggle('mobile-nav-active')
      this.classList.toggle('bi-list')
      this.classList.toggle('bi-x')
    })

    /**
     * Scrool with ofset on links with a class name .scrollto
     */
    on('click', '.scrollto', function (e) {
      if (select(this.hash)) {
        e.preventDefault()

        let body = select('body')
        if (body.classList.contains('mobile-nav-active')) {
          body.classList.remove('mobile-nav-active')
          let navbarToggle = select('.mobile-nav-toggle')
          navbarToggle.classList.toggle('bi-list')
          navbarToggle.classList.toggle('bi-x')
        }
        scrollto(this.hash)
      }
    }, true)

    /**
     * Scroll with ofset on page load with hash links in the url
     */
    window.addEventListener('load', () => {
      if (window.location.hash) {
        if (select(window.location.hash)) {
          scrollto(window.location.hash)
        }
      }
    });

    /**
     * Hero type effect
     */
    const typed = select('.typed')
    if (typed) {
      let typed_strings = typed.getAttribute('data-typed-items')
      typed_strings = typed_strings.split(',')
      new Typed('.typed', {
        strings: typed_strings,
        loop: true,
        typeSpeed: 100,
        backSpeed: 50,
        backDelay: 2000
      });
    }

    /**
     * Skills animation
     */
    let skilsContent = select('.skills-content');
    if (skilsContent) {
      new Waypoint({
        element: skilsContent,
        offset: '80%',
        handler: function (direction) {
          let progress = select('.progress .progress-bar', true);
          progress.forEach((el) => {
            el.style.width = el.getAttribute('aria-valuenow') + '%'
          });
        }
      })
    }

    /**
     * Porfolio isotope and filter
     */
    window.addEventListener('load', () => {
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
            AOS.refresh()
          });
        }, true);
      }

    });
    window.addEventListener('load', () => {
      AOS.init({
        duration: 1000,
        easing: 'ease-in-out',
        once: true,
        mirror: false
      })
    });

    const urlParams = new URLSearchParams(window.location.search);
    placesID = urlParams.get('p');

    _loadVisibilityIndex();
    _adjustButtonsPosition();

    _loadHabilitados();

    if (placesID) {
      _loadPlaces()
    }

    _loadEventListeners();

    if (!blockLoadingEnd) {
      _stopLoadingScreen();
    }
    $('body').css('overflow', 'auto');

  } catch (error) {
    _displayErrorMessage(error);
    throw error;
  }
});

function _loadHabilitados() {
  _loadEditModule('restaurantes');
  _loadEditModule('lanches');
  _loadEditModule('saidas');
  _loadEditModule('turismo');
  _loadEditModule('lojas');
  _loadEditModule('mapa');
  _loadEditModule('lineup');

  const mapa = document.getElementById('habilitado-mapa');
  mapa.addEventListener('change', function () {
    if (mapa.checked) {
      mapa.setAttribute('required', "");
    } else {
      mapa.removeAttribute('required');
    }
  });
}

function _loadEventListeners() {
  document.getElementById('restaurantes-adicionar').addEventListener('click', () => {
    _addRestaurante();
  });
  document.getElementById('lanches-adicionar').addEventListener('click', () => {
    _addLanche();
  });
  document.getElementById('saidas-adicionar').addEventListener('click', () => {
    _addSaida();
  });
  document.getElementById('turismo-adicionar').addEventListener('click', () => {
    _addTurismo();
  });
  document.getElementById('lojas-adicionar').addEventListener('click', () => {
    _addLoja();
  });
  document.getElementById('lineup-adicionar').addEventListener('click', () => {
    _addLineup();
  });
  document.getElementById('salvar').addEventListener('click', () => {
    _setPasseio();
  });
  document.getElementById('voltar').addEventListener('click', () => {
    _closeModal();
  });
  document.getElementById('cancelar').addEventListener('click', () => {
    _closeModal();
  });
  document.getElementById('home').addEventListener('click', () => {
    window.location.href = `index.html`;
  });
}

async function _loadPlaces() {
  blockLoadingEnd = true;
  _startLoadingScreen();
  const FIRESTORE_PLACES_DATA = await _getSinglePlaces();
  console.log(FIRESTORE_PLACES_DATA);
  _loadPlacesData(FIRESTORE_PLACES_DATA);
  _stopLoadingScreen();
}
