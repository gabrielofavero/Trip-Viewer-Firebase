// ======= My Maps KML — Service Layer =======
// Acquires a Google My Maps KML two ways:
//   1. fetchKml()        — via the Places API worker proxy (GET /places/kml),
//      which fetches Google server-side (Google's KML endpoint sends no CORS
//      headers, so the browser can't call it directly).
//   2. readKmlFromFile() — from a local .kml / .kmz file the user picks (KMZ
//      unzipped in-browser with the vendored JSZip, loaded on demand).
//
// Like the Places API feature, the proxy path is HARD-GATED to local
// environments for now (P1 decision — lift later; the KML fetch itself is
// free, but it rides the same authenticated worker).
//
// References:
// - docs/implementation-plans/20260826-mymaps-import-destination.md (§5 P1)

import type { PlaceSearchResult } from '../../models/places-api.model.js';
import type { PlaceItem } from '../../models/schema.js';
import { getDestinations } from '../../app/config.js';
import { translate } from '../../i18n/translation.js';
import { getFirebaseIdToken } from '../firebase/auth.js';
import {
	buildMapsSearchUrl,
	GMAPS_SCRAPER_ENABLED,
	scrapePlaces,
} from './gmaps-scraper.service.js';
import { PLACES_API_BASE_URL, PLACES_API_ENABLED, searchPlaces } from './places-api.service.js';

/** Options for `fetchKml()`. */
export interface MyMapsKmlOptions {
	/** My Maps map id (the `mid=` param of the destination `myMaps` URL). */
	mid: string;
	/** Optional layer id — left empty the worker follows every layer. */
	lid?: string;
	/** AbortSignal so callers can cancel the in-flight request. */
	signal?: AbortSignal;
}

/** HARD CHECK — mirrors the Places API local-only gate (P1 default). */
export const MYMAPS_KML_ENABLED = PLACES_API_ENABLED;

function assertLocalOnly(): void {
	if (!MYMAPS_KML_ENABLED) {
		throw new Error(translate('placesApi.errors.localOnly'));
	}
}

/**
 * Fetch the My Maps KML through the Cloudflare worker proxy.
 * @returns The KML document text (parsed downstream by P2).
 */
export async function fetchKml({ mid, lid = '', signal }: MyMapsKmlOptions): Promise<string> {
	assertLocalOnly();

	let token = '';
	try {
		token = await getFirebaseIdToken();
	} catch {
		// Unauthenticated → the worker answers 401 with its JSON envelope.
	}

	const params = new URLSearchParams();
	params.set('mid', mid);
	if (lid) params.set('lid', lid);

	let response: Response;
	try {
		const headers = new Headers();
		if (token) headers.set('Authorization', `Bearer ${token}`);
		response = await fetch(`${PLACES_API_BASE_URL}/places/kml?${params.toString()}`, {
			signal,
			headers,
		});
	} catch (error) {
		if ((error as Error)?.name === 'AbortError') throw error;
		throw new Error(translate('placesApi.errors.network'));
	}

	if (!response.ok) {
		throw new Error(`${translate('placesApi.errors.network')} (${response.status})`);
	}

	return await response.text();
}

/**
 * Read a user-chosen My Maps export file (.kml or .kmz) into KML text.
 * Needs no worker/proxy and works even when the map isn't publicly shared.
 */
export async function readKmlFromFile(file: File): Promise<string> {
	const name = (file.name ?? '').toLowerCase();
	if (name.endsWith('.kmz')) {
		return await readKmz(file);
	}
	// Plain .kml (or unknown extension) — treat as XML text.
	return await file.text();
}

// JSZip is loaded on demand (never a static <script> on destination.html), so
// it can't leak into the static-export manifest — see static-export skill.
let jsZipPromise: Promise<unknown> | null = null;

function ensureJsZip(): Promise<unknown> {
	if (typeof (window as any).JSZip !== 'undefined') {
		return Promise.resolve((window as any).JSZip);
	}
	if (!jsZipPromise) {
		jsZipPromise = new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.src = 'assets/vendor/jszip/jszip.min.js';
			script.onload = () => resolve((window as any).JSZip);
			script.onerror = () => reject(new Error(translate('mymapsImport.errors.jsZipMissing')));
			document.head.appendChild(script);
		});
	}
	return jsZipPromise;
}

async function readKmz(file: File): Promise<string> {
	const zipLib: any = await ensureJsZip();
	const zip = await zipLib.loadAsync(file);

	const docEntry = zip.file('doc.kml');
	const target =
		docEntry ??
		Object.values(zip.files).find(
			(entry: any) =>
				entry && !entry.dir && String(entry.name ?? '').toLowerCase().endsWith('.kml'),
		);
	if (!target) {
		throw new Error(translate('mymapsImport.errors.noKmlInKmz'));
	}
	return await target.async('string');
}

// ======= P2 — KML parsing + folder → category mapping =======
// Turns a KML document into draft entries: name, coordinates, and the folder
// the placemark was grouped under, with that folder resolved to a category id.
//
// References:
// - docs/implementation-plans/20260826-mymaps-import-destination.md (§5 P2)

/**
 * The 5 content categories a My Maps folder can be mapped into. The `map` /
 * `myMaps` sections in destinations-config.json are map embeds, not import
 * targets, so they're deliberately excluded.
 */
const IMPORTABLE_CATEGORY_IDS = ['restaurants', 'snacks', 'nightlife', 'tourism', 'shopping'];

/**
 * A single placemark pulled out of a My Maps export, before enrichment (P3)
 * and the review/write step (P4). `category` is the resolved category id, or
 * `null` when the folder didn't match any known category ("unassigned").
 */
export interface MyMapsDraft {
	/** My Maps folder the placemark was grouped under ("" when none). */
	folder: string;
	/** Resolved category id, or null when unassigned. */
	category: string | null;
	/** Placemark display name (CDATA-safe). */
	name: string;
	/** Latitude (decimal degrees). */
	lat: number;
	/** Longitude (decimal degrees). */
	lng: number;
	/** Google Place ID — filled by P3 enrichment; empty until then. */
	placeId?: string;
	/** Canonical Maps URL — built by P3 stage 1 (coordinate link). */
	map?: string;
	/**
	 * Review checkbox. Defaults to TRUE when the folder mapped to a category;
	 * placemarks whose folder couldn't be mapped default to FALSE (unchecked),
	 * so they're only imported once the user assigns a category in the review
	 * (or left unchecked to discard).
	 */
	include: boolean;
}

/**
 * Parse a My Maps KML document into draft entries.
 *
 * Handles the real-world export shape: `<Folder>` groups (nested folders
 * included — the innermost folder wins), `<name>` as plain text or CDATA,
 * and `<Point><coordinates>` (`lng,lat[,alt]`). Placemarks without a usable
 * name or coordinates are skipped. Throws when nothing usable is found.
 */
export function parseKml(kmlText: string): MyMapsDraft[] {
	const doc = new DOMParser().parseFromString(kmlText, 'text/xml');
	if (doc.getElementsByTagName('parsererror').length > 0) {
		throw new Error(translate('mymapsImport.errors.invalidKml'));
	}

	const drafts: MyMapsDraft[] = [];
	const placemarks = doc.getElementsByTagName('Placemark');
	for (let i = 0; i < placemarks.length; i++) {
		const placemark = placemarks[i];

		const name = readElementText(placemark, 'name').trim();
		if (!name) continue;

		const coords = readCoordinates(placemark);
		if (!coords) continue;

		const folder = readFolderName(placemark);
		const category = mapFolderToCategory(folder);
		drafts.push({
			folder,
			category,
			name,
			lat: coords[1],
			lng: coords[0],
			// Unmapped folders default unchecked — imported only after the user
			// assigns a category in the review dialog (or discarded by leaving
			// the box off).
			include: category !== null,
		});
	}

	if (drafts.length === 0) {
		throw new Error(translate('mymapsImport.errors.noPlacemarks'));
	}
	return drafts;
}

/** Read the trimmed text of the first descendant with the given tag (CDATA-safe). */
function readElementText(root: Element, tag: string): string {
	const node = root.getElementsByTagName(tag)[0];
	return node ? (node.textContent ?? '') : '';
}

/** Name of the nearest `<Folder>` ancestor, or "" when the placemark is top-level. */
function readFolderName(placemark: Element): string {
	let node: Element | null = placemark.parentElement;
	while (node) {
		if (node.tagName === 'Folder') {
			return readElementText(node, 'name').trim();
		}
		node = node.parentElement;
	}
	return '';
}

/**
 * Read the placemark's coordinates as `[lng, lat]`.
 * Prefers `<Point><coordinates>`, falls back to the first `<coordinates>`
 * element. Returns null when absent or unparsable.
 */
function readCoordinates(placemark: Element): [number, number] | null {
	const pointCoords = placemark.getElementsByTagName('Point')[0]?.getElementsByTagName(
		'coordinates',
	)[0];
	const coordsNode = pointCoords ?? placemark.getElementsByTagName('coordinates')[0];
	if (!coordsNode) return null;

	const text = (coordsNode.textContent ?? '').trim();
	// KML coordinates: "lng,lat[,alt]" — a Point has a single triple.
	const first = text.split(/\s+/)[0];
	if (!first) return null;

	const [lngRaw, latRaw] = first.split(',');
	const lng = Number(lngRaw);
	const lat = Number(latRaw);
	if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
	return [lng, lat];
}

/**
 * Folders My Maps users commonly use that aren't already covered by the
 * config labels (`translation` EN + `_deprecated_original` PT — those carry
 * the simple singular forms). These add plural / generic / English / PT
 * variants so more layer names auto-map. Matching is by normalized substring
 * (longest label wins), so multi-word entries like "Coffee Shop" or
 * "Lanches / Brunch" resolve too. Anything not matched returns null → the
 * review dialog shows it as "unassigned" for the user to assign or discard.
 */
const FOLDER_ALIASES: Record<string, string> = {
	// --- restaurants ---
	// EN / generic
	restaurant: 'restaurants',
	restaurants: 'restaurants',
	diner: 'restaurants',
	diners: 'restaurants',
	eatery: 'restaurants',
	eateries: 'restaurants',
	dining: 'restaurants',
	'fine dining': 'restaurants',
	kitchen: 'restaurants',
	grill: 'restaurants',
	grills: 'restaurants',
	steakhouse: 'restaurants',
	steak: 'restaurants',
	bbq: 'restaurants',
	barbecue: 'restaurants',
	bistro: 'restaurants',
	bistros: 'restaurants',
	'food court': 'restaurants',
	'food courts': 'restaurants',
	takeout: 'restaurants',
	'take away': 'restaurants',
	delivery: 'restaurants',
	meals: 'restaurants',
	'where to eat': 'restaurants',
	'places to eat': 'restaurants',
	lunch: 'restaurants',
	dinner: 'restaurants',
	gastronomy: 'restaurants',
	buffet: 'restaurants',
	'self service': 'restaurants',
	// PT
	restaurante: 'restaurants',
	restaurantes: 'restaurants',
	comer: 'restaurants',
	comida: 'restaurants',
	comidas: 'restaurants',
	almoco: 'restaurants',
	jantar: 'restaurants',
	cozinha: 'restaurants',
	churrasco: 'restaurants',
	churrascaria: 'restaurants',
	churrascarias: 'restaurants',
	gastronomia: 'restaurants',
	refeicoes: 'restaurants',
	'onde comer': 'restaurants',
	'lugares para comer': 'restaurants',
	eat: 'restaurants',
	food: 'restaurants',

	// --- snacks ---
	// EN
	snack: 'snacks',
	snacks: 'snacks',
	brunch: 'snacks',
	cafe: 'snacks',
	cafes: 'snacks',
	coffee: 'snacks',
	coffees: 'snacks',
	'coffee shop': 'snacks',
	'coffee shops': 'snacks',
	cafeteria: 'snacks',
	cafeterias: 'snacks',
	bakery: 'snacks',
	bakeries: 'snacks',
	dessert: 'snacks',
	desserts: 'snacks',
	sweets: 'snacks',
	donut: 'snacks',
	donuts: 'snacks',
	doughnut: 'snacks',
	doughnuts: 'snacks',
	'ice cream': 'snacks',
	gelato: 'snacks',
	juice: 'snacks',
	juices: 'snacks',
	smoothie: 'snacks',
	smoothies: 'snacks',
	milkshake: 'snacks',
	'milk shake': 'snacks',
	'fast food': 'snacks',
	'quick bites': 'snacks',
	breakfast: 'snacks',
	// PT
	lanche: 'snacks',
	lanches: 'snacks',
	lanchonete: 'snacks',
	lanchonetes: 'snacks',
	sorvete: 'snacks',
	sorveteria: 'snacks',
	sorveterias: 'snacks',
	padaria: 'snacks',
	padarias: 'snacks',
	sobremesa: 'snacks',
	sobremesas: 'snacks',
	doces: 'snacks',
	suco: 'snacks',
	acai: 'snacks',
	'cafe da manha': 'snacks',

	// --- nightlife ---
	// EN
	bar: 'nightlife',
	bars: 'nightlife',
	pub: 'nightlife',
	pubs: 'nightlife',
	tavern: 'nightlife',
	taverns: 'nightlife',
	nightlife: 'nightlife',
	night: 'nightlife',
	'night out': 'nightlife',
	'going out': 'nightlife',
	outings: 'nightlife',
	drinks: 'nightlife',
	drink: 'nightlife',
	cocktail: 'nightlife',
	cocktails: 'nightlife',
	lounge: 'nightlife',
	lounges: 'nightlife',
	club: 'nightlife',
	clubs: 'nightlife',
	party: 'nightlife',
	parties: 'nightlife',
	'live music': 'nightlife',
	shows: 'nightlife',
	'happy hour': 'nightlife',
	brewery: 'nightlife',
	breweries: 'nightlife',
	beer: 'nightlife',
	// PT
	bares: 'nightlife',
	noite: 'nightlife',
	'vida noturna': 'nightlife',
	saidas: 'nightlife',
	balada: 'nightlife',
	baladas: 'nightlife',
	discoteca: 'nightlife',
	festas: 'nightlife',
	bebidas: 'nightlife',
	coquetel: 'nightlife',
	cervejaria: 'nightlife',
	cervejarias: 'nightlife',
	'musica ao vivo': 'nightlife',

	// --- tourism ---
	// EN
	tourism: 'tourism',
	tourist: 'tourism',
	tourists: 'tourism',
	attraction: 'tourism',
	attractions: 'tourism',
	sights: 'tourism',
	sightseeing: 'tourism',
	'point of interest': 'tourism',
	'points of interest': 'tourism',
	landmark: 'tourism',
	landmarks: 'tourism',
	museum: 'tourism',
	museums: 'tourism',
	park: 'tourism',
	parks: 'tourism',
	nature: 'tourism',
	culture: 'tourism',
	cultural: 'tourism',
	history: 'tourism',
	historic: 'tourism',
	historical: 'tourism',
	tour: 'tourism',
	tours: 'tourism',
	excursion: 'tourism',
	excursions: 'tourism',
	activities: 'tourism',
	'things to do': 'tourism',
	'places to visit': 'tourism',
	// PT
	turismo: 'tourism',
	atracoes: 'tourism',
	passeios: 'tourism',
	parque: 'tourism',
	parques: 'tourism',
	museu: 'tourism',
	museus: 'tourism',
	natureza: 'tourism',
	cultura: 'tourism',
	historia: 'tourism',
	excursao: 'tourism',
	atividades: 'tourism',
	'o que fazer': 'tourism',
	'coisas para fazer': 'tourism',
	'lugares para visitar': 'tourism',

	// --- shopping ---
	// EN
	shopping: 'shopping',
	store: 'shopping',
	stores: 'shopping',
	shop: 'shopping',
	shops: 'shopping',
	mall: 'shopping',
	malls: 'shopping',
	'shopping mall': 'shopping',
	'shopping center': 'shopping',
	retail: 'shopping',
	boutique: 'shopping',
	boutiques: 'shopping',
	market: 'shopping',
	markets: 'shopping',
	supermarket: 'shopping',
	supermarkets: 'shopping',
	grocery: 'shopping',
	groceries: 'shopping',
	outlet: 'shopping',
	outlets: 'shopping',
	pharmacy: 'shopping',
	drugstore: 'shopping',
	drugstores: 'shopping',
	bookstore: 'shopping',
	bookstores: 'shopping',
	clothing: 'shopping',
	clothes: 'shopping',
	fashion: 'shopping',
	souvenirs: 'shopping',
	'department store': 'shopping',
	'second hand': 'shopping',
	electronics: 'shopping',
	// PT
	compras: 'shopping',
	loja: 'shopping',
	lojas: 'shopping',
	comprar: 'shopping',
	mercado: 'shopping',
	mercados: 'shopping',
	supermercado: 'shopping',
	supermercados: 'shopping',
	farmacia: 'shopping',
	livraria: 'shopping',
	livrarias: 'shopping',
	roupas: 'shopping',
	moda: 'shopping',
	lembrancas: 'shopping',
	butique: 'shopping',
	butiques: 'shopping',
	'centro comercial': 'shopping',
	brecho: 'shopping',
	antiguidades: 'shopping',
};

/** Lowercase + strip diacritics (NFD) + collapse whitespace and slashes. */
function normalizeFolder(value: string): string {
	return (value ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[\s/]+/g, ' ')
		.trim();
}

/** Build the normalized label → category map from config labels + aliases. */
function buildFolderLabels(config: any): Map<string, string> {
	const labels = new Map<string, string>();
	for (const category of IMPORTABLE_CATEGORY_IDS) {
		for (const raw of [config?.translation?.[category], config?._deprecated_original?.[category]]) {
			if (!raw) continue;
			const label = normalizeFolder(raw);
			if (label) labels.set(label, category);
		}
	}
	for (const [alias, category] of Object.entries(FOLDER_ALIASES)) {
		const label = normalizeFolder(alias);
		if (label) labels.set(label, category);
	}
	return labels;
}

/**
 * Map a My Maps folder name to a destination category id.
 *
 * - normalize (lowercase, strip diacritics);
 * - exact match against the config labels (`translation` EN + `_deprecated_original` PT)
 *   and the explicit alias table (e.g. `compras → shopping`, `lanches/brunch → snacks`);
 * - then a whole-word/substring match (e.g. "Lanches / Brunch" → snacks);
 * - unmatched → null (goes to the review screen as "unassigned").
 */
export function mapFolderToCategory(folder: string): string | null {
	const normalized = normalizeFolder(folder);
	if (!normalized) return null;

	const labels = buildFolderLabels(getDestinations());

	// 1) Exact match.
	if (labels.has(normalized)) return labels.get(normalized)!;

	// 2) Substring match — a known label inside the folder ("Lanches / Brunch"
	//    contains "lanches"). Longest label wins so e.g. "restaurant" variants
	//    don't get shadowed by the singular "restaurante".
	let best: string | null = null;
	let bestLen = 0;
	for (const [label, category] of labels) {
		const inside = label.length <= normalized.length ? normalized.includes(label) : label.includes(normalized);
		if (inside && label.length > bestLen) {
			best = category;
			bestLen = label.length;
		}
	}
	return best;
}

// ======= P3 — Map-link building (stage 1) + optional enrichment (stage 2) =======
// Stage 1 ALWAYS builds a persisted entry: name + a coordinate deep-link
// (`https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`) — no Places
// calls. Stage 2 (ONLY when the user approves, decision #3) resolves each
// placemark to a real place via Places API Text Search (with a location bias)
// or the local scraper, filling `placeId` + a canonical Maps link.
//
// References:
// - docs/implementation-plans/20260826-mymaps-import-destination.md (§5 P3)

/** Default emoji per category until enrichment resolves a real one. */
const CATEGORY_EMOJI: Record<string, string> = {
	restaurants: '🍽️',
	snacks: '🍟',
	nightlife: '🍸',
	tourism: '🏛️',
	shopping: '🛍️',
	default: '📍',
};

/**
 * Build the coordinate deep-link for a placemark
 * (`https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`) — the stage-1
 * Maps link (viability verdict #5).
 */
export function buildMapsCoordinateLink(lat: number, lng: number): string {
	return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

/**
 * Build the persisted destination entry (PlaceItem shape) for a draft — stage 1.
 *
 * Uses `draft.map` when a stage-2 resolution filled it (canonical Maps link),
 * else the coordinate deep-link. `placeAPI.id` is the resolved Google Place ID
 * (empty until P3 stage 2 enriches the draft). App-managed fields (`isNew`,
 * `createdAt`, `media`) get stage-1 defaults.
 */
export function buildMyMapsEntry(draft: MyMapsDraft): PlaceItem {
	const map = draft.map || buildMapsCoordinateLink(draft.lat, draft.lng);
	// The local scraper's refresh URL. When no canonical link resolved, persist
	// a name search centered on the pin (NOT the bare coordinate link — the
	// scraper can't extract a business from a coordinate pin; see
	// buildMapsSearchUrl). `map` keeps the coordinate deep-link for the user,
	// while `sourceUrl` is what the bulk "Update with Maps → Local" path scrapes.
	const sourceUrl =
		draft.map || buildMapsSearchUrl(draft.name, { lat: draft.lat, lng: draft.lng });
	const emoji = (draft.category && CATEGORY_EMOJI[draft.category]) || CATEGORY_EMOJI.default;
	const now = new Date().toISOString();
	return {
		name: draft.name,
		description: { pt: '', en: '' },
		rating: '',
		price: '-',
		map,
		website: '',
		regions: [],
		instagram: '',
		isNew: false,
		createdAt: now,
		media: '',
		emoji,
		// P7 (requirement #4): My Maps imports/enrichment never include photos.
		// The entry is built field-by-field (never spread from the draft), so any
		// photo data a resolver might leak is ignored here by construction. Photos
		// are added separately via the "Enrich Data" photo flows.
		images: [],
		placeAPI: {
			id: draft.placeId ?? '',
			name: draft.name,
			map,
			region: '',
			website: '',
			rating: '',
			price: '-',
			description: { pt: '', en: '' },
			emoji,
			updatedAt: now,
			instagram: '',
			sourceUrl,
			sourceCoords: { lat: draft.lat, lng: draft.lng },
		},
	};
}

/** Options for `resolveMyMapsDrafts()` (stage 2 — user-approved enrichment). */
export interface MyMapsEnrichOptions {
	/** Destination title — appended to the query when the first pass is too far. */
	destinationTitle?: string;
	/** Max meters from the placemark for a search hit to count as a match (default 3000). */
	maxDistanceM?: number;
	/** AbortSignal so callers can cancel enrichment. */
	signal?: AbortSignal;
	/** Progress callback — called after each draft resolves. */
	onProgress?: (done: number, total: number) => void;
}

/** Haversine distance in meters between two lat/lng points. */
function distanceM(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371000;
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
	return 2 * R * Math.asin(Math.sqrt(a));
}

/** Loose name comparison (lowercase, diacritics-stripped, containment). */
function namesMatch(a: string, b: string): boolean {
	const norm = (s: string) =>
		(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
	const na = norm(a);
	const nb = norm(b);
	if (!na || !nb) return false;
	return na === nb || na.includes(nb) || nb.includes(na);
}

/** Pick the best search result: nearest to the placemark, then best name match. */
function pickBestMatch(results: PlaceSearchResult[], draft: MyMapsDraft) {
	if (!results?.length) return null;
	let best: { result: PlaceSearchResult; distanceM: number; nameScore: number } | null = null;
	for (const result of results) {
		const d = result.location
			? distanceM(draft.lat, draft.lng, result.location.lat, result.location.lng)
			: Number.POSITIVE_INFINITY;
		const nameScore = namesMatch(result.name, draft.name) ? 0 : 1;
		if (!best || d < best.distanceM || (d === best.distanceM && nameScore < best.nameScore)) {
			best = { result, distanceM: d, nameScore };
		}
	}
	return best;
}

/**
 * Resolve one draft via the Places API Text Search with a location bias.
 * Returns a new draft with `placeId` + `map` filled, or null when no result
 * matches (within `maxDistanceM`, or by name).
 */
async function resolveViaPlacesApi(
	draft: MyMapsDraft,
	{ destinationTitle, maxDistanceM = 3000, signal }: MyMapsEnrichOptions,
): Promise<MyMapsDraft | null> {
	const bias = { latitude: draft.lat, longitude: draft.lng };
	// P7 (requirement #4): My Maps enrichment NEVER requests photos — `photos:
	// false` keeps the paid photos key / photos route out of the import flow.
	// Photos are handled separately (single-item + batch "Enrich Data" flows).
	const attempt = async (query: string) => {
		const results = await searchPlaces(query, { bias, photos: false, signal });
		return pickBestMatch(results, draft);
	};

	let best = await attempt(draft.name);
	// When the nearest hit is too far (or missing), retry with the destination
	// title appended — a generic chain name gets disambiguated by city.
	if (!best || best.distanceM > maxDistanceM) {
		const query = destinationTitle ? `${draft.name} ${destinationTitle}` : draft.name;
		if (query !== draft.name) {
			const retry = await attempt(query);
			if (retry && (best === null || retry.distanceM < best.distanceM)) best = retry;
		}
	}

	// Accept a near hit, or any hit whose name matches — otherwise unresolved.
	if (!best) return null;
	if (best.distanceM > maxDistanceM && best.nameScore !== 0) return null;
	return { ...draft, placeId: best.result.id, map: best.result.map || draft.map };
}

/**
 * Resolve one draft via the local gmaps-scraper (search-query URL). Returns a
 * new draft with `placeId` + `map` filled, or null when nothing usable came back.
 */
async function resolveViaScraper(
	draft: MyMapsDraft,
	{ signal }: MyMapsEnrichOptions,
): Promise<MyMapsDraft | null> {
	// Name search CENTERED on the placemark coords — without the center bias the
	// scraper returns the top hit for the name alone, which mis-picks chains.
	const mapUrl = buildMapsSearchUrl(draft.name, { lat: draft.lat, lng: draft.lng });
	const results = await scrapePlaces([mapUrl], { signal });
	const result = results?.[0];
	if (!result) return null;
	// P7 (requirement #4): the scraper result carries `imageUrls`, but they are
	// deliberately NOT copied into the draft — My Maps enrichment never imports
	// photos. Only the place id + canonical Maps link are taken.
	return {
		...draft,
		placeId: result.id || '',
		map: result.map || result.sourceUrl || draft.map,
	};
}

/**
 * Resolve one draft: Places API (when enabled) → local scraper (when enabled)
 * → keep the stage-1 coordinate link. Source failures fall through to the next
 * source; a fully unresolved draft keeps the coordinate link (resolution order
 * §5 P3 stage 2).
 */
async function resolveMyMapsDraft(
	draft: MyMapsDraft,
	options: MyMapsEnrichOptions,
): Promise<MyMapsDraft> {
	if (PLACES_API_ENABLED) {
		try {
			const resolved = await resolveViaPlacesApi(draft, options);
			if (resolved) return resolved;
		} catch {
			// Fall through to the scraper / coordinate link.
		}
	}
	if (GMAPS_SCRAPER_ENABLED) {
		try {
			const resolved = await resolveViaScraper(draft, options);
			if (resolved) return resolved;
		} catch {
			// Fall through to the coordinate link.
		}
	}
	return draft;
}

/** How many placemarks resolve in parallel (rate limits — plan §8). */
const RESOLUTION_CONCURRENCY = 3;

/**
 * Enrich every draft sequentially with small concurrency (decision #3: only
 * when the user approves — callers gate this). Returns a NEW array; unresolved
 * drafts keep their stage-1 coordinate link.
 */
export async function resolveMyMapsDrafts(
	drafts: MyMapsDraft[],
	options: MyMapsEnrichOptions = {},
): Promise<MyMapsDraft[]> {
	const output: MyMapsDraft[] = new Array(drafts.length);
	let next = 0;
	let done = 0;

	async function worker(): Promise<void> {
		while (next < drafts.length) {
			const index = next++;
			const resolved = await resolveMyMapsDraft(drafts[index], options);
			// P7 guard (requirement #4): My Maps enrichment must NEVER pull in
			// photos. The resolvers request photos:false / drop imageUrls and the
			// draft type carries no image field, but if a future resolver leaks
			// one, warn loudly in dev so the contract can't silently regress.
			const leaked = resolved as unknown as { images?: unknown[]; imageUrls?: unknown[] };
			if (leaked?.images?.length || leaked?.imageUrls?.length) {
				console.warn('[mymaps-kml] P7: enrichment produced photos — blocked.');
			}
			output[index] = resolved;
			done++;
			options.onProgress?.(done, drafts.length);
		}
	}

	const workers = Array.from({ length: Math.min(RESOLUTION_CONCURRENCY, drafts.length) }, () =>
		worker(),
	);
	await Promise.all(workers);
	return output;
}
