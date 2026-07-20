/**
 * Import Destination Data — for use on destination.html (view page)
 * Only one item can be edited at a time, so just fill the open edit form.
 *
 * Data shape (from export-maps-data script):
 * { name, emoji, website, map, instagram, region, price, media, rating,
 *   isNew (bool), description: { en, pt }, createdAt, id }
 */

// ─── Helper: find the J of the currently open edit form ───────────────────────
function importGetEditingJ() {
	const container = document.querySelector('.edit-title-container');
	if (!container) return null;
	const input = container.querySelector("[id^='edit-'][id*='-']");
	if (!input) return null;
	const parts = input.id.split('-');
	const j = parseInt(parts[parts.length - 1], 10);
	return Number.isFinite(j) ? j : null;
}

// ─── Helper: set a select-or-input field (region / price) ────────────────────
function importSetSelectOrInput(prefix, j, value) {
	const select = document.getElementById(`edit-${prefix}-select-${j}`) as HTMLSelectElement;
	const input = document.getElementById(`edit-${prefix}-input-${j}`) as HTMLInputElement;
	if (!select) return;

	const option = select.querySelector(`option[value="${value}"]`);
	if (option && value !== 'custom') {
		select.value = value;
		if (input) input.style.display = 'none';
	} else if (value) {
		select.value = 'custom';
		if (input) {
			input.style.display = '';
			input.value = value;
		}
	} else {
		select.value = '';
		if (input) {
			input.style.display = 'none';
			input.value = '';
		}
	}
}

// ─── Core fill function ───────────────────────────────────────────────────────
function importFillEditFields(j, data, force) {
	const setValue = (id, val) => {
		const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
		if (!el) return;
		if (force || (val !== undefined && val !== null && val !== '')) {
			el.value = val;
		}
	};

	setValue(`edit-name-${j}`, data.name);
	setValue(`edit-emoji-${j}`, data.emoji);
	setValue(`edit-map-${j}`, data.map);
	setValue(`edit-instagram-${j}`, data.instagram);
	setValue(`edit-website-${j}`, data.website);
	setValue(`edit-media-${j}`, data.media);

	// rating (select)
	const ratingEl = document.getElementById(`edit-rating-${j}`) as HTMLSelectElement;
	if (ratingEl) {
		if (force || (data.rating !== undefined && data.rating !== null && data.rating !== '')) {
			ratingEl.value = data.rating === '?' ? 'default' : data.rating;
		}
	}

	// region (select + optional custom input)
	if (force || (data.region !== undefined && data.region !== null && data.region !== '')) {
		importSetSelectOrInput('region', j, data.region || '');
	}

	// price (select + optional custom input)
	if (force || (data.price !== undefined && data.price !== null && data.price !== '')) {
		importSetSelectOrInput('price', j, data.price || '');
	}

	// description
	if (data.description) {
		if (force || data.description.en)
			setValue(`edit-description-en-${j}`, data.description.en || '');
		if (force || data.description.pt)
			setValue(`edit-description-pt-${j}`, data.description.pt || '');
	}
}

// ─── Main import function ─────────────────────────────────────────────────────
/**
 * Fill the currently open edit form on destination.html with imported data.
 * @param {Object}  data       - destination data
 * @param {boolean} [force=false] - if true, replace all fields (even with empty values)
 *
 * @example
 *   importDestination({ name: "Ibirapuera Park", region: "Vila Mariana", ... })
 *   importDestination(data, true)
 */
async function importDestination(data, force = false) {
	const j = importGetEditingJ();

	if (j == null) {
		console.error('❌ No edit form is open. Click the edit button on an item first.');
		return;
	}

	importFillEditFields(j, data, force);
	console.log(`✅ Imported data into item at index ${j}: ${data.name || '(unnamed)'}`);
}

// ─── Expose on dev.page for console use ──────────────────────────────────────
if (typeof dev !== 'undefined') {
	dev.page.importDestination = importDestination;
}

console.log('📦 Import function ready: importDestination(data, force?)');
