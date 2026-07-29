import { getID } from '../../../utils/dom.js';
import { getColors } from '../../../app/config.js';
import { translate } from '../../../i18n/translation.js';

export var CURRENT_LIGHT;
export function setCurrentLight(val) {
	CURRENT_LIGHT = val;
}

export function loadCustomizationImageData(value, id) {
	if (value && typeof value === 'string') {
		getID(id).value = value;
	} else if (value && value.link) {
		getID(id).value = value.link;
	}
}

function imageDataIncludes(value, includes) {
	if (value && typeof value === 'string') {
		return value.includes(includes);
	} else if (value && value.url) {
		return value.url.includes(includes);
	}
	return false;
}

export function autoFillDarkColor() {
	const DARK_COLOR = getID('dark-color');
	if (DARK_COLOR.value == '#7f75b6' || (CURRENT_LIGHT && DARK_COLOR.value == CURRENT_LIGHT)) {
		DARK_COLOR.value = getID('light-color').value;
	}
	CURRENT_LIGHT = getID('light-color').value;

	// If user manually changes the picker while in preset mode, switch to custom
	if (_selectedPresetIndex !== null && _selectedPresetIndex >= 0) {
		const colors = getColors();
		const preset = colors.options[_selectedPresetIndex];
		const lightInput = getID('light-color') as HTMLInputElement;
		const darkInput = getID('dark-color') as HTMLInputElement;
		if (lightInput.value !== preset.hex || darkInput.value !== preset.dark) {
			// User strayed from preset → switch to custom
			selectCustomColor();
		}
	}
}

// ---- Color Preset Grid ----

let _selectedPresetIndex: number | null = null; // null=none, -1=custom, 0..n=preset

/**
 * Build the preset color swatch grid from colors.json options.
 * Appends a "+" swatch at the end for custom colors.
 * Must be called after colors.json is loaded (i.e., after loadAllConfigs).
 */
export function buildColorPresets() {
	const grid = getID('color-presets');
	if (!grid) return;

	const colors = getColors();
	const options = colors.options;
	if (!options || !options.length) return;

	grid.innerHTML = '';

	options.forEach((opt, i) => {
		const swatch = document.createElement('div');
		swatch.className = 'color-preset-swatch';
		swatch.style.backgroundColor = opt.hex;
		const label = translate(`labels.customization.colors.presets.${opt.color}`);
		swatch.setAttribute('data-name', label);
		swatch.setAttribute('data-index', String(i));
		swatch.setAttribute('title', label);
		swatch.addEventListener('click', () => selectPresetColor(i));
		grid.appendChild(swatch);
	});

	// Append the "+" custom color swatch
	const addSwatch = document.createElement('div');
	addSwatch.className = 'color-preset-swatch add-custom';
	const customLabel = translate('labels.customization.colors.custom');
	addSwatch.setAttribute('data-name', customLabel);
	addSwatch.setAttribute('data-index', '-1');
	addSwatch.addEventListener('click', () => {
		if (_selectedPresetIndex === -1) {
			deselectAllSwatches();
			hideCustomPickers();
		} else {
			selectCustomColor();
		}
	});
	grid.appendChild(addSwatch);

	// Sync picker state
	syncPresetFromPickers();

	// Wire up arrow buttons
	initColorPresetArrows();
}

function initColorPresetArrows() {
	const grid = getID('color-presets');
	const prev = document.querySelector('.color-preset-prev') as HTMLElement;
	const next = document.querySelector('.color-preset-next') as HTMLElement;
	if (!grid || !prev || !next) return;

	const update = () => {
		const tol = 1;
		prev.style.opacity = grid.scrollLeft > tol ? '' : '0';
		next.style.opacity = grid.scrollLeft + grid.clientWidth < grid.scrollWidth - tol ? '' : '0';
	};

	prev.addEventListener('click', () => grid.scrollBy({ left: -200, behavior: 'smooth' }));
	next.addEventListener('click', () => grid.scrollBy({ left: 200, behavior: 'smooth' }));
	grid.addEventListener('scroll', update);

	// ResizeObserver: re-check when grid becomes visible or resizes
	new ResizeObserver(() => update()).observe(grid);
}

/**
 * Check current light/dark picker values against presets and sync UI state.
 */
function syncPresetFromPickers() {
	const colors = getColors();
	const options = colors.options;
	const lightInput = getID('light-color') as HTMLInputElement;
	const darkInput = getID('dark-color') as HTMLInputElement;
	const colorsEnabled = getID('colors-enabled') as HTMLInputElement;

	if (!lightInput || !darkInput || !options) return;

	const currentLight = lightInput.value;
	const currentDark = darkInput.value;

	// Find matching preset
	const matchIndex = options.findIndex(
		(opt) => opt.hex === currentLight && opt.dark === currentDark,
	);

	if (matchIndex >= 0) {
		selectPresetColor(matchIndex);
	} else if (colorsEnabled?.checked && currentLight && currentDark) {
		// Colors are active but don't match any preset → custom mode
		selectCustomColor();
	}
}

/**
 * Select a preset color by index. Updates both light and dark pickers
 * and marks the swatch as selected.
 */
export function selectPresetColor(index: number) {
	const colors = getColors();
	const options = colors.options;
	if (!options || index < 0 || index >= options.length) return;

	const preset = options[index];
	const lightInput = getID('light-color') as HTMLInputElement;
	const darkInput = getID('dark-color') as HTMLInputElement;

	lightInput.value = preset.hex;
	darkInput.value = preset.dark;
	CURRENT_LIGHT = preset.hex;
	_selectedPresetIndex = index;

	// Update swatch selection visuals: highlight the preset, un-highlight custom
	const grid = getID('color-presets');
	if (grid) {
		grid.querySelectorAll('.color-preset-swatch').forEach((s) => {
			const idx = parseInt(s.getAttribute('data-index') || '');
			s.classList.toggle('selected', idx === index);
		});
	}

	hideCustomPickers();
}

/**
 * Activate custom color mode ("+" swatch selected).
 * Presets remain visible; pickers are shown.
 */
function selectCustomColor() {
	_selectedPresetIndex = -1;

	const grid = getID('color-presets');
	if (grid) {
		grid.querySelectorAll('.color-preset-swatch').forEach((s) => {
			const idx = parseInt(s.getAttribute('data-index') || '');
			s.classList.toggle('selected', idx === -1);
		});
	}

	showCustomPickers();
}

/** Deselect all swatches (both presets and the "+" button). */
function deselectAllSwatches() {
	_selectedPresetIndex = null;
	const grid = getID('color-presets');
	if (grid) {
		grid.querySelectorAll('.color-preset-swatch').forEach((s) => {
			s.classList.remove('selected');
		});
	}
}

// ---- Internal helpers ----

function showCustomPickers() {
	const pickers = getID('color-pickers');
	if (pickers) pickers.style.display = 'flex';
}

function hideCustomPickers() {
	const pickers = getID('color-pickers');
	if (pickers) pickers.style.display = 'none';
}

/**
 * Get the currently selected preset index (or null if nothing, -1 if custom).
 */
export function getSelectedPresetIndex(): number | null {
	return _selectedPresetIndex;
}
