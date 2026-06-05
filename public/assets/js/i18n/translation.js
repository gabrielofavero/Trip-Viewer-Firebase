import { getLanguage } from '../app/config.js';

const MISSING_TRANSLATIONS = new Set();
const LANGUAGES = ["en", "pt"];

export function translate(key, replacements = {}, strict = true) {
	const language = getLanguage();
	if (!language) return "";
	let result = searchObject(language, key, strict);

	if (result == null) {
		if (strict) {
			if (strict) {
				const stack = new Error().stack;
				console.warn(`Translation key "${key}" not found.`, {
					caller: getCallerFromStack(stack),
				});
				MISSING_TRANSLATIONS.add(key);
			}
		}
		return key;

		function getCallerFromStack(stack) {
			if (!stack) return "unknown";
			const lines = stack.split("\n");
			return lines[2]?.trim() || "unknown";
		}
	}

	if (Object.keys(replacements).length > 0) {
		for (const [placeholder, value] of Object.entries(replacements)) {
			result = result.replace(new RegExp(`{{${placeholder}}}`, "g"), value);
		}
	}

	return result;

	function searchObject(obj, key, strict = true) {
		const keys = key.split(".");
		let result = obj;

		for (const k of keys) {
			if (result != null && typeof result === "object" && k in result) {
				result = result[k];
			} else {
				return strict ? null : key;
			}
		}

		const type = typeof result;
		if (type != "string") {
			console.error(
				`Invalid search value for key "${key}": expected a string, got ${type}.`,
			);
			return "";
		}

		return result;
	}
}

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
	if (LANGUAGES.includes(language)) {
		return language;
	} else return "en";
}

export function updateUserLanguage(language) {
	const previousLang = localStorage.getItem("userLanguage");
	localStorage.setItem("userLanguage", language);

	if (previousLang !== language) {
		window.location.reload();
	}
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
	const langButton = document.querySelector(".lang-button");

	if (!langButton) {
		return;
	}

	const langOptions = document.querySelector(".lang-options");

	setLanguage(getLanguagePackName());

	langButton.addEventListener("click", () => {
		langOptions.style.display =
			langOptions.style.display === "block" ? "none" : "block";
	});

	langOptions.addEventListener("click", (e) => {
		if (e.target.tagName === "BUTTON") {
			const lang = e.target.dataset.lang;
			setLanguage(lang);
			langOptions.style.display = "none";
		}
	});

	document.addEventListener("click", (e) => {
		if (!e.target.closest(".lang-selector")) {
			langOptions.style.display = "none";
		}
	});

	function setLanguage(lang) {
		langButton.textContent = lang.toUpperCase();
		updateUserLanguage(lang);
	}
}


