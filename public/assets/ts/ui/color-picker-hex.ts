/**
 * Color Picker with Hex Input
 * Enhances native <input type="color"> with a synchronized hex text field.
 *
 * Usage:
 *   enhanceColorPicker(document.getElementById('claro'));
 *   // or auto-detect all:
 *   enhanceAllColorPickers();
 */

export function enhanceColorPicker(colorInput: HTMLInputElement): void {
	if (!colorInput || colorInput.type !== 'color') return;
	if (colorInput.dataset.enhanced === 'true') return;

	colorInput.dataset.enhanced = 'true';

	// Find or create the wrapper
	let wrapper = colorInput.parentElement;
	if (!wrapper || !wrapper.classList.contains('color-picker-box')) {
		// Wrap the color input
		wrapper = document.createElement('div');
		wrapper.className = 'color-picker-box nice-form-group';
		colorInput.parentNode!.insertBefore(wrapper, colorInput);
		wrapper.appendChild(colorInput);
	}

	// Create hex input
	const hexInput = document.createElement('input');
	hexInput.type = 'text';
	hexInput.className = 'hex-input';
	hexInput.placeholder = '#000000';
	hexInput.maxLength = 7;
	hexInput.value = colorInput.value;
	wrapper.appendChild(hexInput);

	// Sync color -> hex
	colorInput.addEventListener('input', () => {
		hexInput.value = colorInput.value;
	});

	// Sync hex -> color
	hexInput.addEventListener('input', () => {
		let val = hexInput.value.trim();
		// Auto-add # if missing
		if (val.length > 0 && !val.startsWith('#')) {
			val = '#' + val;
			hexInput.value = val;
		}
		// Validate hex
		if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
			colorInput.value = val;
		}
	});

	// On blur, normalize the hex value
	hexInput.addEventListener('blur', () => {
		const val = hexInput.value.trim();
		if (!val || !/^#[0-9A-Fa-f]{6}$/.test(val)) {
			hexInput.value = colorInput.value;
		}
	});
}

/** Auto-enhance all color inputs on the page */
export function enhanceAllColorPickers(): void {
	document.querySelectorAll<HTMLInputElement>('input[type="color"]').forEach(enhanceColorPicker);
}
