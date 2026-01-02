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

    if (!langButton) {
        return;
    }

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