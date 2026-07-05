import { getID } from '../../../../../utils/dom.js';
import { translate } from "../../../../../i18n/translation.js";
import {FILTER_OPTIONS, filter} from "../filter.js";
import {SORT_OPTIONS, sort} from "../sort.js";
import { FILTER_SORT_KEYS_ORDER } from "../sort-and-filter.js";
import { ACTIVE_CATEGORY } from "../../../destination.js";
import { getFilterPreferences, setFilterPreference } from "./preferences.js";
import { getSortPreferences, setSortPreference } from "./preferences.js";

const DRAWER_STATE = {
	actions: null,
};

// Open and Close Actions
export function openDrawer(titleText, innerHTML, actions) {
	actions.beforeOpen?.();

	const overlay = getID("overlay");
	const drawer = getID("drawer");
	const title = getID("drawerTitle");
	const content = getID("drawerContent");

	DRAWER_STATE.actions = actions || null;

	title.textContent = titleText;
	content.innerHTML = innerHTML;

	overlay.style.display = "block";
	drawer.getBoundingClientRect();
	drawer.classList.add("open");

	const optionButtons = content.querySelectorAll(".option-btn");
	optionButtons.forEach((button) => {
		button.addEventListener("click", actions.click);
	});

	actions.load?.();
}

export function closeDrawer() {
	const overlay = getID("overlay");
	const drawer = getID("drawer");

	drawer.classList.remove("open");

	DRAWER_STATE.actions?.close?.();
	DRAWER_STATE.actions = null;

	setTimeout(() => {
		overlay.style.display = "none";
	}, 280);
}

// Inner HTML
export function getFilterDrawerInnerHTML() {
	const titles = FILTER_OPTIONS.titles;
	const types = FILTER_OPTIONS[ACTIVE_CATEGORY];

	let result = "";
	for (const typeKey in types) {
		let optionsHTML = "";
		const options = types[typeKey];
		const optionKeys = getSortedArray(Object.keys(options), typeKey);
		for (const optionKey of optionKeys) {
			optionsHTML += `<button class="option-btn" data-value="${optionKey}">${options[optionKey]}</button>`;
		}
		result += `
        <div class="drawer-container" data-type="${typeKey}">
            <div class="drawer-title">${titles[typeKey]}</div>
            <button class="option-btn" data-value="everything">${translate("destination.filter.show_everything")}</button>
            ${optionsHTML}
        </div>
        `;
	}
	return result;
}

export function getSortDrawerInnerHTML() {
	const titles = SORT_OPTIONS.titles;
	const types = SORT_OPTIONS[ACTIVE_CATEGORY];

	let result = "";
	for (const typeKey in types) {
		let optionsHTML = "";
		const options = types[typeKey];
		for (const optionKey in options) {
			optionsHTML += `<button class="option-btn" data-value="${optionKey}">${options[optionKey]}</button>`;
		}
		result += `
        <div class="drawer-container" data-type="${typeKey}">
            <div class="drawer-title">${titles[typeKey]}</div>
            ${optionsHTML}
        </div>
        `;
	}
	return result;
}

// Load Actions
export function filterDrawerOptionLoadAction() {
	const preferences = getFilterPreferences();
	const content = getID("drawerContent");
	const containers = content.querySelectorAll(".drawer-container");

	for (const container of containers) {
		const type = container.getAttribute("data-type");
		const value = preferences[type];

		const buttons = container.querySelectorAll(".option-btn");
		let valueFound = false;
		for (const button of buttons) {
			if (button.getAttribute("data-value") === value) {
				valueFound = true;
				button.classList.add("active");
			} else {
				button.classList.remove("active");
			}
		}

		if (!valueFound) {
			for (const button of buttons) {
				if (button.getAttribute("data-value") === "everything") {
					button.classList.add("active");
				}
			}
		}
	}
}

export function sortDrawerOptionLoadAction() {
	const preferences = getSortPreferences();
	const content = getID("drawerContent");
	const containers = content.querySelectorAll(".drawer-container");

	const type = preferences.type;
	const value = preferences.value;

	for (const container of containers) {
		const containerType = container.getAttribute("data-type");
		const buttons = container.querySelectorAll(".option-btn");

		for (const button of buttons) {
			if (
				button.getAttribute("data-value") === value &&
				containerType === type
			) {
				button.classList.add("active");
			} else {
				button.classList.remove("active");
			}
		}
	}
}

// Click Actions
export function filterDrawerOptionClickAction(e) {
	const container = e.currentTarget.closest(".drawer-container");
	handleDrawerOptionClick(e, container, setFilterPreference);
	filter(true);
}

export function sortDrawerOptionClickAction(e) {
	const container = getID("drawerContent");
	handleDrawerOptionClick(e, container, setSortPreference);
	sort(true);
}

// Helpers
function handleDrawerOptionClick(e, container, applyPreference) {
	const target = e.currentTarget;
	target.classList.add("active");

	const buttons = container.querySelectorAll(".option-btn");
	for (const button of buttons) {
		if (button !== target) {
			button.classList.remove("active");
		}
	}

	const type = target.closest(".drawer-container").getAttribute("data-type");
	const value = target.getAttribute("data-value");

	applyPreference(type, value);
}

export function isDrawerOpen() {
	return getID("drawer").classList.contains("open");
}

export function adjustDrawer() {
	if (isDrawerOpen()) {
		closeDrawer();
	}
}

function getSortedArray(arr, key) {
	if (!FILTER_SORT_KEYS_ORDER[key]) {
		return arr;
	}

	const sorted = [...arr];
	sorted.sort((a, b) => {
		const order = FILTER_SORT_KEYS_ORDER[key];
		return order.indexOf(a) - order.indexOf(b);
	});
	return sorted;
}
