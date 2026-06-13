/**
 * Import Destination Functions
 * Call these from the browser console on edit/destination.html
 *
 * Data shape (from export-maps-data script):
 * {
 *   nome, emoji, website, mapa, instagram, regiao, valor, midia, nota,
 *   novo (bool), descricao: { en, pt }, criadoEm, id
 * }
 */
import { buildDS, updateValueDS } from '../../ui/dynamic-select.js';
import { getJs, getLastJ } from '../../utils/dom.js';
import { closeAccordions, openLastAccordion } from '../../ui/accordion.js';
import { addLanches } from "./new-destination.js";
import { addLojas } from "./new-destination.js";
import { addRestaurantes } from "./new-destination.js";
import { addSaidas } from "./new-destination.js";
import { addTurismo } from "./new-destination.js";
import { setDescription } from "./categories/description.js";
import { updateDescriptionButtonLabel } from "./categories/description.js";
import { loadMoedaValorAndVisibility } from "./categories/price.js";
import { updateDestinationsTitle } from "./edit-destination.js";


const IMPORT_TYPES = ["restaurantes", "lanches", "saidas", "turismo", "lojas"];

// ─── Core: Fill a destination's fields ────────────────────────────────────────
function importFillDestination(categoria, j, data, force) {
	const entries = [
		{ key: "nome", field: "nome", type: "value" },
		{ key: "emoji", field: "emoji", type: "value" },
		{ key: "website", field: "website", type: "value" },
		{ key: "mapa", field: "mapa", type: "value" },
		{ key: "instagram", field: "instagram", type: "value" },
		{ key: "midia", field: "midia", type: "value" },
		{ key: "nota", field: "nota", type: "value" },
		{ key: "id", field: "id", type: "value" },
		{ key: "criadoEm", field: "criadoEm", type: "value" },
	];

	for (const { key, field, type } of entries) {
		const el = document.getElementById(`${categoria}-${field}-${j}`);
		if (!el) continue;
		const newVal = data[key];
		if (force || (newVal !== undefined && newVal !== null && newVal !== "")) {
			if (type === "value") (el as HTMLInputElement).value = newVal;
		}
	}

	// novo (checkbox)
	const novoEl = document.getElementById(`${categoria}-novo-${j}`);
	if (novoEl) {
		if (force || data.novo !== undefined) {
			(novoEl as HTMLInputElement).checked = !!data.novo;
		}
	}

	// regiao (uses dynamic select + input)
	if (force || (data.regiao !== undefined && data.regiao !== null && data.regiao !== "")) {
		updateValueDS("regiao", data.regiao || "", `${categoria}-regiao-select-${j}`);
		buildDS("regiao");
	}

	// valor (uses _loadMoedaValorAndVisibility)
	if (force || (data.valor !== undefined && data.valor !== null && data.valor !== "")) {
		loadMoedaValorAndVisibility(data.valor || "", categoria, j);
	}

	// descricao
	if (data.descricao && (force || Object.values(data.descricao).some(v => v))) {
		setDescription(categoria, j, data.descricao);
	}

	// update title & description button
	updateDestinationsTitle(j, categoria);
	updateDescriptionButtonLabel(categoria, j);
}

// ─── Helper: get last J (index) in a category box ─────────────────────────────
function importGetLastJ(categoria) {
	return getLastJ(`${categoria}-box`);
}

// ─── Add-function lookup (replaces dynamic window._addXxx calls) ──────────────
const ADD_FUNCTIONS = {
	restaurantes: addRestaurantes,
	lanches: addLanches,
	saidas: addSaidas,
	turismo: addTurismo,
	lojas: addLojas,
};

// ─── 1. importNewDestination ──────────────────────────────────────────────────
/**
 * Click the "add" button for the given type, then fill the new item.
 * @param {"restaurantes"|"lanches"|"saidas"|"turismo"|"lojas"} type
 * @param {Object} data - destination data
 * @param {boolean} [force=false] - if true, replace all fields (even with empty values)
 */
function importNewDestination(type, data, force = false) {
	if (!IMPORT_TYPES.includes(type)) {
		console.error(`Invalid type: "${type}". Must be one of: ${IMPORT_TYPES.join(", ")}`);
		return;
	}

	const addFn = ADD_FUNCTIONS[type];
	if (typeof addFn !== "function") {
		console.error(`Add function for "${type}" not found.`);
		return;
	}

	// Close others, trigger add, open the new one
	closeAccordions(type);
	addFn();
	const j = importGetLastJ(type);
	openLastAccordion(type);
	buildDS("regiao");

	importFillDestination(type, j, data, force);
	console.log(`✅ Imported new "${type}" at index ${j}: ${data.nome || "(unnamed)"}`);
}

// ─── 2. importDestinationByJ ──────────────────────────────────────────────────
/**
 * Replace all fields of the destination at the given index.
 * @param {"restaurantes"|"lanches"|"saidas"|"turismo"|"lojas"} type
 * @param {number} j - the index (e.g., 15 for collapse-restaurantes-15)
 * @param {Object} data
 * @param {boolean} [force=false]
 */
function importDestinationByJ(type, j, data, force = false) {
	if (!IMPORT_TYPES.includes(type)) {
		console.error(`Invalid type: "${type}". Must be one of: ${IMPORT_TYPES.join(", ")}`);
		return;
	}

	const accordion = document.getElementById(`collapse-${type}-${j}`);
	if (!accordion) {
		console.error(`Destination not found: collapse-${type}-${j}`);
		return;
	}

	importFillDestination(type, j, data, force);
	console.log(`✅ Imported "${type}" at index ${j}: ${data.nome || "(unnamed)"}`);
}

// ─── 3. importDestinationByName ───────────────────────────────────────────────
/**
 * Search for a destination by name across one or all types.
 * @param {string} name - the name to search for
 * @param {Object} data
 * @param {string} [type] - if omitted, searches all types
 * @param {boolean} [force=false]
 */
function importDestinationByName(name, data, type, force = false) {
	const typesToSearch = type ? [type] : IMPORT_TYPES;

	if (type && !IMPORT_TYPES.includes(type)) {
		console.error(`Invalid type: "${type}". Must be one of: ${IMPORT_TYPES.join(", ")}`);
		return;
	}

	const matches = [];

	for (const cat of typesToSearch) {
		const js = [...new Set(getJs(`${cat}-box`))];
		for (const j of js) {
			const nameEl = document.getElementById(`${cat}-nome-${j}`);
			if (nameEl && (nameEl as HTMLInputElement).value.trim().toLowerCase() === name.trim().toLowerCase()) {
				matches.push({ type: cat, j });
			}
		}
	}

	if (matches.length === 0) {
		console.warn(`⚠️ No destination found with name "${name}"`);
		return;
	}

	if (matches.length > 1) {
		console.error(
			`❌ Multiple matches found for "${name}":`,
			matches.map(m => `  - ${m.type}[${m.j}]`).join("\n")
		);
		return;
	}

	const match = matches[0];
	importDestinationByJ(match.type, match.j, data, force);
}

// ─── Per-category convenience wrappers ────────────────────────────────────────

// --- importNew* ---
function importNewRestaurant(data, force) { importNewDestination("restaurantes", data, force); }
function importNewSnack(data, force) { importNewDestination("lanches", data, force); }
function importNewNightlife(data, force) { importNewDestination("saidas", data, force); }
function importNewTourism(data, force) { importNewDestination("turismo", data, force); }
function importNewShop(data, force) { importNewDestination("lojas", data, force); }

// --- import*ByJ ---
function importRestaurantByJ(j, data, force) { importDestinationByJ("restaurantes", j, data, force); }
function importSnackByJ(j, data, force) { importDestinationByJ("lanches", j, data, force); }
function importNightlifeByJ(j, data, force) { importDestinationByJ("saidas", j, data, force); }
function importTourismByJ(j, data, force) { importDestinationByJ("turismo", j, data, force); }
function importShopByJ(j, data, force) { importDestinationByJ("lojas", j, data, force); }

// --- import*ByName ---
function importRestaurantByName(name, data, force) { importDestinationByName(name, data, "restaurantes", force); }
function importSnackByName(name, data, force) { importDestinationByName(name, data, "lanches", force); }
function importNightlifeByName(name, data, force) { importDestinationByName(name, data, "saidas", force); }
function importTourismByName(name, data, force) { importDestinationByName(name, data, "turismo", force); }
function importShopByName(name, data, force) { importDestinationByName(name, data, "lojas", force); }

// ─── Expose on dev.page for console use ──────────────────────────────────────
if (typeof dev !== "undefined") {
	dev.page.importNewDestination = importNewDestination;
	dev.page.importDestinationByJ = importDestinationByJ;
	dev.page.importDestinationByName = importDestinationByName;

	dev.page.importNewRestaurant = importNewRestaurant;
	dev.page.importNewSnack = importNewSnack;
	dev.page.importNewNightlife = importNewNightlife;
	dev.page.importNewTourism = importNewTourism;
	dev.page.importNewShop = importNewShop;

	dev.page.importRestaurantByJ = importRestaurantByJ;
	dev.page.importSnackByJ = importSnackByJ;
	dev.page.importNightlifeByJ = importNightlifeByJ;
	dev.page.importTourismByJ = importTourismByJ;
	dev.page.importShopByJ = importShopByJ;

	dev.page.importRestaurantByName = importRestaurantByName;
	dev.page.importSnackByName = importSnackByName;
	dev.page.importNightlifeByName = importNightlifeByName;
	dev.page.importTourismByName = importTourismByName;
	dev.page.importShopByName = importShopByName;
}


