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
        console.warn(`Translation key "${key}" not found in language pack. Using key as fallback.`);
        MISSING_TRANSLATIONS.add(key);
      }
      return key;
    }
  
    if (Object.keys(replacements).length > 0) {
      for (const [placeholder, value] of Object.entries(replacements)) {
        result = result.replace(new RegExp(`{{${placeholder}}}`, 'g'), value);
      }
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