/* ======= Main JS =======
    - Template Name: MyResume - v4.5.0
    - Template URL: https://bootstrapmade.com/free-html-bootstrap-template-my-resume/
    - Author: BootstrapMade.com
    - License: https://bootstrapmade.com/license/
    - Modified by: Gabriel Fávero
*/

// Easy Selectors
const select = (el, all = false) => {
  el = el.trim();
  if (all) {
    return [...document.querySelectorAll(el)];
  } else {
    return document.querySelector(el);
  }
};

const on = (type, el, listener, all = false) => {
  if (el === 'document') {
    document.addEventListener(type, listener);
  } else if (el === 'window') {
    window.addEventListener(type, listener);
  } else {
    let selectEl = all ? [...document.querySelectorAll(el)] : [document.querySelector(el)];
    selectEl.forEach(e => e && e.addEventListener(type, listener));
  }
};

const onscroll = (el, listener) => {
  el.addEventListener('scroll', listener)
}

const getID = (id) => {
  return document.getElementById(id);
}


// Firebase
function _startFirebase() {
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
}

async function _cloudFunction(func, params, displayError=true) {
  const myFunction = firebase.functions().httpsCallable(func);
  console.log('Chamando Cloud Function:', func);

  try {
    const result = await myFunction(params);
    console.log(`Função ${func} executada com sucesso`);
    return result.data;
  } catch (error) {
    console.error(error);
    if (displayError) {
      _displayError(error.message || error, true);
    }
  }
}

function _main() {
  "use strict";
  $('body').css('overflow', 'hidden');

  _startFirebase();
  _loadConfig();

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
}

function _loadConfig() {
  let config = {};
  return Promise.all([
    $.getJSON("assets/json/call-sync-order.json").then(data => config.callSyncOrder = data),
    $.getJSON("assets/json/cores.json").then(data => config.cores = data),
    $.getJSON("assets/json/destinos.json").then(data => config.destinos = data),
    $.getJSON("assets/json/information.json").then(data => config.information = data),
    $.getJSON("assets/json/moedas.json").then(data => config.moedas = data),
    $.getJSON("assets/json/transportes.json").then(data => config.transportes = data),
    $.getJSON("assets/json/set.json").then(data => config.set = data)
  ]).then(() => {
    CONFIG = config;
  }).catch(error => {
    console.error('Erro ao carregar a configuração:', error);
    _displayError('Erro ao carregar a configuração');
  });
}