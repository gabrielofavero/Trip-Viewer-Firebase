/* ======= Main JS =======
    - Template Name: MyResume - v4.5.0
    - Template URL: https://bootstrapmade.com/free-html-bootstrap-template-my-resume/
    - Author: BootstrapMade.com
    - License: https://bootstrapmade.com/license/
    - Modified by: Gabriel Fávero
*/

const MISSING_TRANSLATIONS = new Set();
var LANGUAGES = ['en', 'pt'];

const APP = {
  projectId: null,
  version: null,
}

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


function _main() {
  _mainAdjustments();
  _mainStart();
}

function _mainAdjustments() {
  "use strict";
  $('body').css('overflow', 'hidden');

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

function _mainStart() {
  const config = {};
  return Promise.all([
    $.getJSON("/assets/json/cores.json").then(data => config.cores = data),
    $.getJSON("/assets/json/destinos.json").then(data => config.destinos = data),
    $.getJSON("/assets/json/information.json").then(data => config.information = data),
    $.getJSON("/assets/json/moedas.json").then(data => config.moedas = data),
    $.getJSON("/assets/json/transportes.json").then(data => config.transportes = data),
    $.getJSON("/assets/json/icons.json").then(data => config.icons = data),
    $.getJSON("/assets/json/version.json").then(data => config.versoes = data),
    $.getJSON(`/assets/json/languages/${_getLanguagePackName()}.json`).then(data => config.language = data),
  ]).then(() => {
    CONFIG = config;
    _translatePage();
    _initializeApp();
    _loadLangSelectorSelect();
    _loadPage();
  }).catch(error => {
    _displayError('Initialization Error:' + error.message);
  });
}

function _loadPage() {
  switch (_getHTMLpage()) {
    case "index":
      _loadIndexPage();
      break;
    case "viagem":
      _loadViagemPage();
      break;
    case "destinos":
      _loadDestinosPage();
      break;
    case "gastos":
      _loadGastosPage();
      break;
    case "editar-listagem":
      _loadEditarListagemPage();
      break;
    case "editar-destino":
      _loadEditarDestinoPage();
      break;
    case "editar-viagem":
      _loadEditarViagemPage();
      break;
    default:
      _displayError(`Page "${_getHTMLpage()}" not found.`);
      break;
  }

}

function _getHTMLpage() {
  let result = window.location.pathname.replace(".html", "");
  switch (result) {
    case "/":
      return "index";
    case "/view":
      return "viagem";
    case "/destination":
      return "destinos";
    case "/expenses":
      return "gastos";
    case "/edit/listing":
      return "editar-listagem";
    case "/edit/destination":
      return "editar-destino";
    case "/edit/trip":
      return "editar-viagem";
    default:
      return result;
  }
}

function _openLinkInNewTab(url) {
  var win = window.open(url, '_blank');
  win.focus();
}


function _initializeApp() {
  const isLocalhost = window.location.hostname === "localhost";
  const isIP = /^\d{1,3}(\.\d{1,3}){3}$/.test(window.location.hostname);

  APP.projectId = firebase.app().options.projectId;
  APP.version = isLocalhost || isIP ? new Date().getTime() : CONFIG.versoes[APP.projectId];

  // Cache Busting
  if (APP.version) {
    const tags = document.querySelectorAll('script[src], link[rel="stylesheet"]');
    tags.forEach(tag => {
      const attr = tag.tagName === 'LINK' ? 'href' : 'src';
      const url = new URL(tag.getAttribute(attr), window.location.origin);
      url.searchParams.set('v', APP.version);
      tag.setAttribute(attr, url.toString());
    });
  }
}

function _getUserLanguage() {
  let language = localStorage.getItem("userLanguage");
  if (!language) {
    language = navigator.language || navigator.userLanguage;
    language = language.split("-")[0];
    localStorage.setItem("userLanguage", language);
  }
  return language;
}

function _getLanguagePackName() {
  let language = _getUserLanguage();
  if (["pt", 'en'].includes(language)) {
    return language;
  } else return "en"
}

function _updateUserLanguage(language) {
  const previousLang = localStorage.getItem("userLanguage");
  localStorage.setItem("userLanguage", language);

  if (previousLang !== language) {
    window.location.reload();
  }
}

function translate(key, replacements = {}, strict = true) {
  if (!CONFIG?.language) return "";
  let result = _searchObject(CONFIG.language, key, strict);

  if (result == null) {
    if (strict) {
      if (strict) {
        const stack = new Error().stack;
        console.warn(
          `Translation key "${key}" not found.`,
          { caller: getCallerFromStack(stack) }
        );
        MISSING_TRANSLATIONS.add(key);
      }
    }
    return key;

    function getCallerFromStack(stack) {
      if (!stack) return 'unknown';
      const lines = stack.split('\n');
      return lines[2]?.trim() || 'unknown';
    }
  }

  if (Object.keys(replacements).length > 0) {
    for (const [placeholder, value] of Object.entries(replacements)) {
      result = result.replace(new RegExp(`{{${placeholder}}}`, 'g'), value);
    }
  }

  return result;
}

function _searchObject(obj, key, strict = true) {
  const keys = key.split(".");
  let result = obj;

  for (const k of keys) {
    if (result && k in result) {
      result = result[k];
    } else {
      return strict ? null : key;
    }
  }

  const type = typeof result;
  if (type != "string") {
    console.error(`Invalid search value for key "${key}": expected a string, got ${type}.`);
    return "";
  }

  return result;
}

function _translatePage() {
  const elements = document.querySelectorAll("[data-translate]");
  for (const element of elements) {
    const key = element.getAttribute("data-translate");
    if (key) {
      const translation = translate(key);
      if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
        element.placeholder = translation;
      } else {
        element.textContent = translation;
      }
    }
  }
}

function _loadLangSelectorSelect() {
  const langButton = document.querySelector('.lang-button');
  const langOptions = document.querySelector('.lang-options');
  _setLanguage(_getLanguagePackName());

  langButton.addEventListener('click', () => {
    langOptions.style.display = langOptions.style.display === 'block' ? 'none' : 'block';
  });

  langOptions.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
      const lang = e.target.dataset.lang;
      _setLanguage(lang);
      langOptions.style.display = 'none';
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.lang-selector')) {
      langOptions.style.display = 'none';
    }
  });

  function _setLanguage(lang) {
    langButton.textContent = lang.toUpperCase();
    _updateUserLanguage(lang);
  }
}