/* ======= Main JS =======
    - Template Name: MyResume - v4.5.0
    - Template URL: https://bootstrapmade.com/free-html-bootstrap-template-my-resume/
    - Author: BootstrapMade.com
    - License: https://bootstrapmade.com/license/
    - Modified by: Gabriel Fávero
*/

var userData = {};

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

  document.getElementById('myTrips').addEventListener('click', function () {
    _loadMyTripsVisibility();
  });

  document.getElementById('myPlaces').addEventListener('click', function () {
    _loadMyPlacesVisibility();
  });

  document.getElementById('profile-icon').addEventListener('click', function () {
    _loadSettingsVisibility();
  });

  document.getElementById('new-viagem').addEventListener('click', function () {
    _viagensNovo();
  });

  document.getElementById('new-destino').addEventListener('click', function () {
    _destinosNovo();
  });

  document.getElementById('new-listagem').addEventListener('click', function () {
    _listagensNovo();
  });

  document.getElementById('back').addEventListener('click', function () {
    _loadUserIndexVisibility();
  });

  document.getElementById('myPlacesLists').addEventListener('click', function () {
    _loadMyPlacesListVisibility();
  });

  document.getElementById('apagar').addEventListener('click', async function () {
    _startLoadingScreen();
    await _deleteAccount();
    _closeModal();
    _signOut();
    _stopLoadingScreen();
  });

  document.getElementById('trip-view-continue').addEventListener('click', async function () {
    document.getElementById('trip-view-invalid').style.display = 'none';
    document.getElementById('trip-view-private').style.display = 'none';
    document.getElementById('trip-view-reminder').style.display = 'none';
    document.getElementById('trip-view-error').style.display = 'none';

    let viagem = document.getElementById('trip-view-input').value;
    if (viagem) {
      const viagemValue = viagem.trim();
      const status = await _getStatus(`viagens/${viagemValue}`);

      switch (status) {
        case 'Found':
          window.location.href = `viagem.html?v=${viagemValue}`;
          break;
        case 'Forbidden':
          document.getElementById('trip-view-private').style.display = 'block';
          break;
        case 'Not Found':
          document.getElementById('trip-view-invalid').style.display = 'block';
          break;
        default:
          document.getElementById('trip-view-error').style.display = 'block';
          break;
      }
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

        _loadUserDataList('viagens');
        _loadUserDataList('destinos');
        _loadUserDataList('listagens');

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

async function _loadUserDataList(type) {
  userData[type] = await _getUserList(type);
  localStorage.setItem(`${type}User`, JSON.stringify(userData[type]));

  if (userData[type] && userData[type].length > 0) {
    document.getElementById(`sem-${type}`).style.display = 'none';
    _loadUserDataHTML(userData[type], type);
  }
}

function _loadUserDataHTML(data, type) {
  const div = document.getElementById(`dados-${type}`);

  let text = '';
  for (let i = 0; i < data.length; i++) {
    let secondaryDiv = '';
    let visualizarDiv = '';

    switch (type) {
      case 'viagens':
        const inicioDate = _convertFromFirestoreDate(data[i].inicio);
        const fimDate = _convertFromFirestoreDate(data[i].fim);
        const inicio = _jsDateToDate(inicioDate);
        const fim = _jsDateToDate(fimDate);
        secondaryDiv = `<div class="user-data-item-date">${inicio} - ${fim}</div>`;
        break;
      case 'destinos':
        secondaryDiv = `<div class="user-data-item-date">${data[i].ultimaAtualizacao}</div>`;
        break;
      case 'listagens':
        secondaryDiv = `<div class="user-data-item-date">${data[i].subtitulo || data[i].ultimaAtualizacao}</div>`;
        break;
      default:
        break;
    }

    if (typeof window[`_${type}Visualizar`] === 'function') {
      visualizarDiv = `<i class="iconify user-data-icon" onclick="_${type}Visualizar('${data[i].code}')" data-icon="fluent:eye-16-regular"></i>`
    }

    text += `
    <div class="user-data-item">
      <div class="user-data-item-text">
        <div class="user-data-item-title">${data[i].titulo}</div>
        ${secondaryDiv}
      </div>
      <div class="trip-data-icons">
        <i class="iconify user-data-icon" onclick="_${type}Editar('${data[i].code}')" data-icon="tabler:edit"></i>
        ${visualizarDiv}
      </div>
    </div>`
  }

  div.innerHTML = text;
}

function _viagensEditar(code) {
  window.location.href = `editar-viagem.html?v=${code}`;
}

function _viagensVisualizar(code) {
  window.location.href = `viagem.html?v=${code}`;
}

function _viagensNovo() {
  localStorage.setItem('viagensUser', JSON.stringify(userData['viagens']));
  localStorage.setItem('destinosUser', JSON.stringify(userData['destinos']));
  window.location.href = `editar-viagem.html`;
}

function _destinosNovo() {
  localStorage.setItem('destinosUser', JSON.stringify(userData['destinos']));
  window.location.href = `editar-destino.html`;
}

function _destinosEditar(code) {
  localStorage.setItem('destinosUser', JSON.stringify(userData['destinos']));
  window.location.href = `editar-destino.html?d=${code}`;
}

function _listagensEditar(code) {
  window.location.href = `editar-listagem.html?l=${code}`;
}

function _listagensVisualizar(code) {
  window.location.href = `viagem.html?l=${code}`;
}

function _listagensNovo() {
  localStorage.setItem('listagensUser', JSON.stringify(userData['listagens']));
  localStorage.setItem('destinosUser', JSON.stringify(userData['destinos']));
  window.location.href = `editar-listagem.html`;
}