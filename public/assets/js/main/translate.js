import { searchObject } from "../support/data/object.js";
import { CONFIG } from "./app.js";

export var LANGUAGES = ['en', 'pt'];
export const MISSING_TRANSLATIONS = new Set();

export function getUserLanguage() {
  let language = localStorage.getItem("userLanguage");
  if (!language) {
    language = navigator.language || navigator.userLanguage;
    language = language.split("-")[0];
    localStorage.setItem("userLanguage", language);
  }
  return language;
}

export function getLanguagePackName() {
  let language = getUserLanguage();
  if (["pt", 'en'].includes(language)) {
    return language;
  } else return "en"
}

function updateUserLanguage(language) {
  const previousLang = localStorage.getItem("userLanguage");
  localStorage.setItem("userLanguage", language);

  if (previousLang !== language) {
    window.location.reload();
  }
}

export function translate(key, replacements = {}, strict = true) {
  if (!CONFIG?.language) return "";
  let result = searchObject(CONFIG.language, key, strict);

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

export function translatePage() {
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

export function loadLangSelectorSelect() {
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
    updateUserLanguage(lang);
  }
}