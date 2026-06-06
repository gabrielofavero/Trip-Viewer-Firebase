import { getID, removeChildWithValidation } from '../utils/dom.js';;

let DYNAMIC_SELECT = {};

export function newDynamicSelect(type) {
	DYNAMIC_SELECT[type] = {
		selectors: {},
		values: {},
		selectInnerHTML: "",
	};
}

export function addSelectorDS(type, selectID, inputID, customFunction = null) {
	DYNAMIC_SELECT[type].selectors[selectID] = {
		inputID: inputID,
		value: "",
	};
	addEventListenersDS(type, selectID, inputID, customFunction);
}

export function removeValueDS(type, value) {
	if (value) {
		DYNAMIC_SELECT[type].values[value]--;
		if (DYNAMIC_SELECT[type].values[value] === 0) {
			delete DYNAMIC_SELECT[type].values[value];
		}
	}
}

export function updateValueDS(type, value, selectID) {
	const lastValue = DYNAMIC_SELECT[type].selectors[selectID].value;
	removeValueDS(type, lastValue);
	DYNAMIC_SELECT[type].selectors[selectID].value = "";

	if (value) {
		DYNAMIC_SELECT[type].selectors[selectID].value = value;

		addValueDS(type, value);

		getID(DYNAMIC_SELECT[type].selectors[selectID].inputID).value = "";
		getID(selectID).value = value;
	}

	// Private Function
	function addValueDS(type, value) {
		if (!DYNAMIC_SELECT[type].values[value]) {
			DYNAMIC_SELECT[type].values[value] = 1;
		} else {
			DYNAMIC_SELECT[type].values[value]++;
		}
	}
}

export function buildDS(type) {
	buildSelectDS(type);
	applySelectDS(type);

	function buildSelectDS(type) {
		let selectInnerHTML = `<option value="">${translate("labels.select")}</option>`;
		const values = Object.keys(DYNAMIC_SELECT[type].values).sort();

		for (const value of values) {
			selectInnerHTML += `<option value="${value}">${value}</option>`;
		}

		selectInnerHTML += `<option value="outra">${translate("labels.other")}</option>`;
		DYNAMIC_SELECT[type].selectInnerHTML = selectInnerHTML;
	}

	function applySelectDS(type) {
		for (const selectID in DYNAMIC_SELECT[type].selectors) {
			const select = getID(selectID);
			const input = getID(DYNAMIC_SELECT[type].selectors[selectID].inputID);

			const value =
				select.value || DYNAMIC_SELECT[type].selectors[selectID].value;

			select.innerHTML = DYNAMIC_SELECT[type].selectInnerHTML;
			if (DYNAMIC_SELECT[type].values[value]) {
				select.value = value;
			}
			select.style.display = "block";
			input.style.display = select.value === "outra" ? "block" : "none";
		}
	}
}

export function addEventListenersDS(type, selectID, inputID, customFunction = null) {
	const select = getID(selectID);
	const input = getID(inputID);

	select.addEventListener("change", () => {
		const value = select.value;
		if (value === "outra") {
			input.style.display = "block";
		} else {
			input.style.display = "none";
			updateValueDS(type, value, selectID);
			buildDS(type);
		}
	});

	input.addEventListener("change", () => {
		updateValueDS(type, input.value, selectID);
		buildDS(type);
		if (typeof customFunction === "function") {
			customFunction();
		}
	});
}

export function addRemoveChildListenerDS(categoria, j, dynamicSelects = []) {
	getID(`remove-${categoria}-${j}`).addEventListener("click", function () {
		for (const dynamicSelect of dynamicSelects) {
			removeSelectorDS(dynamicSelect.type, dynamicSelect.selectID);
		}

		removeChildWithValidation(categoria, j);

		for (const dynamicSelect of dynamicSelects) {
			buildDS(dynamicSelect.type);
		}
	});
}

export function removeSelectorDS(type, selectID) {
	const value = DYNAMIC_SELECT[type].selectors[selectID].value;
	removeValueDS(type, value);
	delete DYNAMIC_SELECT[type].selectors[selectID];
}
