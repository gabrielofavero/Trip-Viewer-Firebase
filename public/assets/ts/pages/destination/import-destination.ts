/**
 * Import Destination Data — for use on destination.html (view page)
 * Only one item can be edited at a time, so just fill the open edit form.
 *
 * Data shape (from export-maps-data script):
 * { nome, emoji, website, mapa, instagram, regiao, valor, midia, nota,
 *   novo (bool), descricao: { en, pt }, criadoEm, id }
 */

// ─── Helper: find the J of the currently open edit form ───────────────────────
function importGetEditingJ() {
	const container = document.querySelector(".edit-title-container");
	if (!container) return null;
	const input = container.querySelector("[id^='editar-'][id*='-']");
	if (!input) return null;
	const parts = input.id.split("-");
	const j = parseInt(parts[parts.length - 1], 10);
	return Number.isFinite(j) ? j : null;
}

// ─── Helper: set a select-or-input field (regiao / valor) ────────────────────
function importSetSelectOrInput(prefix, j, value) {
	const select = document.getElementById(`editar-${prefix}-select-${j}`) as HTMLSelectElement;
	const input = document.getElementById(`editar-${prefix}-input-${j}`) as HTMLInputElement;
	if (!select) return;

	const option = select.querySelector(`option[value="${value}"]`);
	if (option && value !== "custom") {
		select.value = value;
		if (input) input.style.display = "none";
	} else if (value) {
		select.value = "custom";
		if (input) { input.style.display = ""; input.value = value; }
	} else {
		select.value = "";
		if (input) { input.style.display = "none"; input.value = ""; }
	}
}

// ─── Core fill function ───────────────────────────────────────────────────────
function importFillEditFields(j, data, force) {
	const setValue = (id, val) => {
		const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement;
		if (!el) return;
		if (force || (val !== undefined && val !== null && val !== "")) {
			el.value = val;
		}
	};

	setValue(`editar-nome-${j}`, data.nome);
	setValue(`editar-emoji-${j}`, data.emoji);
	setValue(`editar-map-${j}`, data.mapa);
	setValue(`editar-instagram-${j}`, data.instagram);
	setValue(`editar-website-${j}`, data.website);
	setValue(`editar-midia-${j}`, data.midia);

	// nota (select)
	const notaEl = document.getElementById(`editar-rating-${j}`) as HTMLSelectElement;
	if (notaEl) {
		if (force || (data.nota !== undefined && data.nota !== null && data.nota !== "")) {
			notaEl.value = data.nota === "?" ? "default" : data.nota;
		}
	}

	// regiao (select + optional custom input)
	if (force || (data.regiao !== undefined && data.regiao !== null && data.regiao !== "")) {
		importSetSelectOrInput("regiao", j, data.regiao || "");
	}

	// valor (select + optional custom input)
	if (force || (data.valor !== undefined && data.valor !== null && data.valor !== "")) {
		importSetSelectOrInput("valor", j, data.valor || "");
	}

	// descricao
	if (data.descricao) {
		if (force || data.descricao.en) setValue(`editar-description-en-${j}`, data.descricao.en || "");
		if (force || data.descricao.pt) setValue(`editar-description-pt-${j}`, data.descricao.pt || "");
	}
}

// ─── Main import function ─────────────────────────────────────────────────────
/**
 * Fill the currently open edit form on destination.html with imported data.
 * @param {Object}  data       - destination data
 * @param {boolean} [force=false] - if true, replace all fields (even with empty values)
 *
 * @example
 *   importDestination({ nome: "Ibirapuera Park", regiao: "Vila Mariana", ... })
 *   importDestination(data, true)
 */
async function importDestination(data, force = false) {
	const j = importGetEditingJ();

	if (j == null) {
		console.error("❌ No edit form is open. Click the edit button on an item first.");
		return;
	}

	importFillEditFields(j, data, force);
	console.log(`✅ Imported data into item at index ${j}: ${data.nome || "(unnamed)"}`);
}

// ─── Expose on dev.page for console use ──────────────────────────────────────
if (typeof dev !== "undefined") {
	dev.page.importDestination = importDestination;
}

console.log("📦 Import function ready: importDestination(data, force?)");
