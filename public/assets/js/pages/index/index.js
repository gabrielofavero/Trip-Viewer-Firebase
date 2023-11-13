/* ======= Main JS =======
    - Template Name: MyResume - v4.5.0
    - Template URL: https://bootstrapmade.com/free-html-bootstrap-template-my-resume/
    - Author: BootstrapMade.com
    - License: https://bootstrapmade.com/license/
    - Modified by: Gabriel Fávero
*/

var START_LIST = [];

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
    _loadVisibilityIndex();
    _adjustButtonsPosition();

    document.getElementById('google-login-button').addEventListener('click', function () {
      _signInGoogle();
    });

    document.getElementById('sign-out').addEventListener('click', function () {
      _signOut();
    });

    document.getElementById('trip-view-continue').addEventListener('click', function () {
      let viagem = document.getElementById('trip-view-input').value;
      if (viagem) {
        window.location.href = `viagem.html?v=${viagem.trim()}`;
      } else {
        document.getElementById('trip-view-reminder').style.display = 'block';
      }
    });

    _stopLoadingScreen();

    _loadUser();
    $('body').css('overflow', 'auto');

  } catch (error) {
    _displayErrorMessage(error);
    throw error;
  }
});

async function _loadUserIndex() {
  _startLoadingScreen();
  document.getElementById('index-unlogged-title').style.display = 'none';
  document.getElementById('index-logged-title').style.display = 'block';
  document.getElementById('login-box').style.display = 'none';
  document.getElementById('myTrips-box').style.display = 'block';
  document.getElementById('icons-box').style.display = 'block';

  document.getElementById('title-name').innerHTML = USER.displayName.split(' ')[0];

  let tripList = await _getTripList();
  if (tripList && tripList.length > 0) {
    document.getElementById('no-trips').style.display = 'none';
    _loadTripListHTML(tripList);
  }
  _stopLoadingScreen();
}

function _unloadUserIndex() {
  document.getElementById('index-unlogged-title').style.display = 'block';
  document.getElementById('index-logged-title').style.display = 'none';
  document.getElementById('login-box').style.display = 'block';
  document.getElementById('myTrips-box').style.display = 'none';
  document.getElementById('icons-box').style.display = 'none';
}

function _loadTripListHTML(tripList) {
  const div = document.getElementById('trip-data');

  let text = '';
  for (let i = 0; i < tripList.length; i++) {
    const index = i + 1;

    const inicioDate = _convertFirestoreDate(tripList[i].inicio);
    const fimDate = _convertFirestoreDate(tripList[i].fim);

    const inicio = _jsDateToDate(inicioDate);
    const fim = _jsDateToDate(fimDate);

    const titulo = tripList[i].titulo;
    const code = tripList[i].code;

    text += `
    <div class="trip-data-item" id="trip-data-item-${index}">
      <div class="trip-data-item-text" id="trip-data-item-text-${index}">
        <div class="trip-data-item-title" id="trip-data-item-title-${index}">${titulo}</div>
        <div class="trip-data-item-date" id="trip-data-item-date-${index}">${inicio} - ${fim}</div>
      </div>
      <div class="trip-data-icons" id="trip-data-icons-${index}">
        <i class="iconify trip-data-icon" onclick="_editTrip('${code}')" id="trip-data-icon-edit-${index}" data-icon="tabler:edit"></i>
        <i class="iconify trip-data-icon" onclick="_viewTrip('${code}')" id="iconify trip-data-icon-view-${index}" data-icon="fluent:eye-16-regular"></i>
      </div>
    </div>`
  }

  div.innerHTML = text;
}

function _editTrip(code){
  window.location.href = `editar-viagem.html?v=${code}`;
}

function _viewTrip(code){
  window.location.href = `viagem.html?v=${code}`;
}

function _goToSettings(){
  window.location.href = `conta.html`;
}