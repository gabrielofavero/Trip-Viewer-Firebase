/* ======= Main JS =======
    - Template Name: MyResume - v4.5.0
    - Template URL: https://bootstrapmade.com/free-html-bootstrap-template-my-resume/
    - Author: BootstrapMade.com
    - License: https://bootstrapmade.com/license/
    - Modified by: Gabriel Fávero
*/

var tripList;
var placesList;

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
    firebase.auth().currentUser;
    
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

    _loadListenersIndex();

    _loadUserIndex();

    $('body').css('overflow', 'auto');

  } catch (error) {
    _displayErrorMessage(error);
    throw error;
  }
});

function _loadListenersIndex() {
  document.getElementById('google-login-button').addEventListener('click', function () {
    _signInGoogle();
  });

  document.getElementById('profile-icon').addEventListener('click', function () {
    _loadSettingsVisibility();
  });

  document.getElementById('add-trip').addEventListener('click', function () {
    _newTripIndex();
  });

  document.getElementById('add-places').addEventListener('click', function () {
    _newPlace();
  });

  document.getElementById('settings-delete-account').addEventListener('click', function () {
    _openDeleteModal('conta')
  });

  document.getElementById('trip-view-continue').addEventListener('click', function () {
    let viagem = document.getElementById('trip-view-input').value;
    if (viagem) {
      window.location.href = `viagem.html?v=${viagem.trim()}`;
    } else {
      document.getElementById('trip-view-reminder').style.display = 'block';
    }
  });
}

async function _loadUserIndex() {
  try {
    firebase.auth().onAuthStateChanged(async (user) => {
      if (user) {
        _registerIfUserNotPresent();
        _loadUserIndexVisibility();

        const displayName = user.displayName;
        const photoURL = 'url(' + user.photoURL + ')';

        document.getElementById('title-name').innerHTML = displayName.split(' ')[0];

        document.getElementById('settings-account-name').innerHTML = displayName;
        document.getElementById('settings-account-picture').style.backgroundImage = photoURL;
        document.getElementById('settings-account-picture').style.backgroundSize = 'cover';
        document.getElementById('profile-icon').style.backgroundImage = photoURL;
        document.getElementById('profile-icon').style.backgroundSize = 'cover';

        _loadUserTripList();
        _loadUserPlacesList();

      } else {
        _unloadUserIndexVisibility();
      }
    });
  } catch (error) {
    _stopLoadingScreen();
    _displayErrorMessage(error);
    throw error;
  }
  _stopLoadingScreen();
}

async function _loadUserTripList() {
  tripList = await _getTripList();
  localStorage.setItem('tripList', JSON.stringify(tripList));

  if (tripList && tripList.length > 0) {
    document.getElementById('no-trips').style.display = 'none';
    _loadTripListHTML(tripList);
  }
}

async function _loadUserPlacesList() {
  placesList = await _getPlacesList();
  localStorage.setItem('placesList', JSON.stringify(placesList));

  if (placesList && placesList.length > 0) {
    document.getElementById('no-places').style.display = 'none';
    _loadPlacesListHTML(placesList);
  }
}

function _loadTripListHTML(tripList) {
  const div = document.getElementById('trip-data');

  let text = '';
  for (let i = 0; i < tripList.length; i++) {
    const index = i + 1;

    const inicioDate = _convertFromFirestoreDate(tripList[i].inicio);
    const fimDate = _convertFromFirestoreDate(tripList[i].fim);

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

function _loadPlacesListHTML(placesList) {
  const div = document.getElementById('places-data');

  let text = '';
  for (let i = 0; i < placesList.length; i++) {
    const index = i + 1;

    const titulo = placesList[i].titulo;
    const code = placesList[i].code;

    text += `
    <div class="trip-data-item" id="places-data-item-${index}">
      <div class="trip-data-item-text" id="places-data-item-text-${index}">
        <div class="trip-data-item-title" id="places-data-item-title-${index}">${titulo}</div>
      </div>
      <div class="trip-data-icons" id="places-data-icons-${index}">
        <i class="iconify trip-data-icon" onclick="_editPlace('${code}')" id="places-data-icon-edit-${index}" data-icon="tabler:edit"></i>
      </div>
    </div>`
    //         <i class="iconify trip-data-icon" onclick="_openDeleteModal('passeio', '${code}')" id="places-data-icon-delete-${index}" data-icon="material-symbols:delete-outline"></i>
  }

  div.innerHTML = text;
}

function _editTrip(code){
  window.location.href = `editar-viagem.html?v=${code}`;
}

function _viewTrip(code){
  window.location.href = `viagem.html?v=${code}`;
}

function _newTripIndex() {
  localStorage.setItem('tripList', JSON.stringify(tripList));
  localStorage.setItem('placesList', JSON.stringify(placesList));
  window.location.href = `editar-viagem.html`;
}

function _newPlace() {
  localStorage.setItem('placesList', JSON.stringify(placesList));
  window.location.href = `editar-passeio.html`;
}

function _editPlace(code) {
  localStorage.setItem('placesList', JSON.stringify(placesList));
  window.location.href = `editar-passeio.html?p=${code}`;
}