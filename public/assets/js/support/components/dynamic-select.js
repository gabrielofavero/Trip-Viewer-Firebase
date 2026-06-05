import { _removeChildWithValidation } from "../pages/data.js";

let DYNAMIC_SELECT = {};

export function _newDynamicSelect(type) {
	DYNAMIC_SELECT[type] = {
		selectors: {},
		values: {},
		selectInnerHTML: "",
	};
}

export function _addSelectorDS(type, selectID, inputID, customFunction = "") {
	DYNAMIC_SELECT[type].selectors[selectID] = {
		inputID: inputID,
		value: "",
	};
	_addEventListenersDS(type, selectID, inputID, customFunction);
}

export function _removeValueDS(type, value) {
	if (value) {
		DYNAMIC_SELECT[type].values[value]--;
		if (DYNAMIC_SELECT[type].values[value] === 0) {
			delete DYNAMIC_SELECT[type].values[value];
		}
	}
}

export function _updateValueDS(type, value, selectID) {
	const lastValue = DYNAMIC_SELECT[type].selectors[selectID].value;
	_removeValueDS(type, lastValue);
	DYNAMIC_SELECT[type].selectors[selectID].value = "";

	if (value) {
		DYNAMIC_SELECT[type].selectors[selectID].value = value;

		_addValueDS(type, value);

		getID(DYNAMIC_SELECT[type].selectors[selectID].inputID).value = "";
		getID(selectID).value = value;
	}

	// Função Privada
	function _addValueDS(type, value) {
		if (!DYNAMIC_SELECT[type].values[value]) {
			DYNAMIC_SELECT[type].values[value] = 1;
		} else {
			DYNAMIC_SELECT[type].values[value]++;
		}
	}
}

export function _buildDS(type) {
	_buildSelectDS(type);
	_applySelectDS(type);

	function _buildSelectDS(type) {
		let selectInnerHTML = `<option value="">${translate("labels.select")}</option>`;
		const values = Object.keys(DYNAMIC_SELECT[type].values).sort();

		for (const value of values) {
			selectInnerHTML += `<option value="${value}">${value}</option>`;
		}

		selectInnerHTML += `<option value="outra">${translate("labels.other")}</option>`;
		DYNAMIC_SELECT[type].selectInnerHTML = selectInnerHTML;
	}

	function _applySelectDS(type) {
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

export function _addEventListenersDS(type, selectID, inputID, customFunction = "") {
	const select = getID(selectID);
	const input = getID(inputID);

	select.addEventListener("change", () => {
		const value = select.value;
		if (value === "outra") {
			input.style.display = "block";
		} else {
			input.style.display = "none";
			_updateValueDS(type, value, selectID);
			_buildDS(type);
		}
	});

	input.addEventListener("change", () => {
		_updateValueDS(type, input.value, selectID);
		_buildDS(type);
		if (customFunction) {
			eval(customFunction);
		}
	});
}

export function _addRemoveChildListenerDS(categoria, j, dynamicSelects = []) {
	getID(`remove-${categoria}-${j}`).addEventListener("click", function () {
		for (const dynamicSelect of dynamicSelects) {
			_removeSelectorDS(dynamicSelect.type, dynamicSelect.selectID);
		}

		_removeChildWithValidation(categoria, j);

		for (const dynamicSelect of dynamicSelects) {
			_buildDS(dynamicSelect.type);
		}
	});
}

export function _removeSelectorDS(type, selectID) {
	const value = DYNAMIC_SELECT[type].selectors[selectID].value;
	_removeValueDS(type, value);
	delete DYNAMIC_SELECT[type].selectors[selectID];
}

// BACKWARD COMPAT: attach to window during migration
window.DYNAMIC_SELECT = DYNAMIC_SELECT;
window._newDynamicSelect = _newDynamicSelect;
window._addSelectorDS = _addSelectorDS;
window._removeValueDS = _removeValueDS;
window._updateValueDS = _updateValueDS;
window._buildDS = _buildDS;
window._addEventListenersDS = _addEventListenersDS;
window._addRemoveChildListenerDS = _addRemoveChildListenerDS;
window._removeSelectorDS = _removeSelectorDS;
