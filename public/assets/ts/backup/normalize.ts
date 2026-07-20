// ============================================================
// Legacy JSON Normalization
//
// Detects and normalizes legacy (Portuguese) backup JSON to the
// post-migration (English) format. Ported from the Phase 1
// migration script (13-migrate-phase1-translate-restructure.ts).
//
// Usage:
//   import { normalizeLegacyJson } from './normalize.js';
//   const normalized = normalizeLegacyJson(legacyJson);
// ============================================================

// ============================================================
// FIELD TRANSLATION MAPS (from migration 13)
// ============================================================

const FIELD_MAP: Record<string, string> = {
	titulo: 'title',
	versao: 'version',
	visibilidade: 'visibility',
	inicio: 'start',
	fim: 'end',
	cores: 'colors',
	compartilhamento: 'sharing',
	modulos: 'modules',
	moeda: 'currency',
	pessoas: 'travelers',
	hospedagens: 'accommodations',
	transportes: 'transportation',
	programacoes: 'itinerary',
	galeria: 'gallery',
	nome: 'name',
	descricao: 'description',
	endereco: 'address',
	datas: 'dates',
	cafe: 'breakfast',
	imagens: 'images',
	reserva: 'reservation',
	empresa: 'company',
	pontos: 'points',
	duracao: 'duration',
	idaVolta: 'direction',
	pessoa: 'person',
	visualizacao: 'viewMode',
	destinosIDs: 'destinationIds',
	madrugada: 'earlyMorning',
	manha: 'morning',
	tarde: 'afternoon',
	noite: 'night',
	programacao: 'label',
	tipo: 'type',
	transporte: 'type',
	restaurantes: 'restaurants',
	lanches: 'snacks',
	lojas: 'shopping',
	saidas: 'nightlife',
	turismo: 'tourism',
	nota: 'rating',
	mapa: 'map',
	regiao: 'region',
	novo: 'isNew',
	criadoEm: 'createdAt',
	midia: 'media',
	permissoes: 'permissions',
	gastosDurante: 'duringTrip',
	gastosPrevios: 'preTrip',
	orcamento: 'budget',
	ultimaAtualizacao: 'lastUpdated',
	dono: 'owner',
	editores: 'editors',
	vacina: 'vaccine',
	traduzir: 'translate',
	checkin: 'checkIn',
	checkout: 'checkOut',
	ativo: 'active',
	destinosID: 'id',
	dados: 'data',
	destinos: 'destinations',
	valor: 'price',
	subtitulo: 'subtitle',
	imagem: 'image',
	foto: 'photo',
	altura: 'height',
	caminho: 'path',
	claro: 'light',
	escuro: 'dark',
	exibirEmDestinos: 'showInDestinations',
	gastos: 'expenses',
	resumo: 'summary',
	listagens: 'listings',
	viagens: 'trips',
	tamanhoUploadIrrestrito: 'unlimitedUploadSize',
	versoes: 'versions',
	enviadoEm: 'sentAt',
	link: 'link',
	instagram: 'instagram',
	website: 'website',
	emoji: 'emoji',
	preco: 'price',
	documento: 'document',
	arquivo: 'file',
	icone: 'icon',
	texto: 'text',
	legenda: 'caption',
	destaque: 'highlight',
	ordem: 'order',
	status: 'status',
	configuracao: 'configuration',
	tema: 'theme',
	idioma: 'language',
	categoria: 'category',
	local: 'location',
	categorias: 'categories',
	descricoes: 'descriptions',
	titulos: 'titles',
};

const CONTEXT_FIELD_MAP: Record<string, Record<string, string>> = {
	pontos: {
		partida: 'origin',
		chegada: 'destination',
	},
	datas: {
		partida: 'departure',
		chegada: 'arrival',
	},
	titulo: {
		valor: 'value',
		destinos: 'showDestinations',
	},
	_root_viagens: {
		destinos: 'destinationRefs',
	},
	programacoes: {
		data: 'date',
	},
	modulos: {
		programacao: 'itinerary',
	},
};

const VALUE_MAP: Record<string, string> = {
	voo: 'flight',
	onibus: 'bus',
	carro: 'car',
	'trem-bala': 'bullet_train',
	ida: 'departure',
	volta: 'return',
	durante: 'during',
	'simple-view': 'simple',
	'leg-view': 'leg',
	destinos: 'destination',
	transporte: 'transportation',
	hospedagens: 'accommodation',
	dinamico: 'dynamic',
	claro: 'light',
	escuro: 'dark',
	ativo: 'active',
	saidas: 'nightlife',
	mapa: 'map',
	gastos: 'expenses',
	resumo: 'summary',
	restaurantes: 'restaurants',
	lanches: 'snacks',
	lojas: 'shopping',
	turismo: 'tourism',
	sim: 'yes',
	nao: 'no',
	todos: 'all',
	nenhum: 'none',
};

// ============================================================
// TOP-LEVEL COLLECTION NAME MAP
// ============================================================

const TOP_KEY_MAP: Record<string, string> = {
	usuario: 'user',
	destinos: 'destinations',
	viagens: 'trips',
	listagens: 'listings',
	gastos: 'expenses',
	protegido: 'protected',
};

// Reverse map for detection
const PORTUGUESE_TOP_KEYS = new Set(Object.keys(TOP_KEY_MAP));

// ============================================================
// DETECTION
// ============================================================

/**
 * Returns true if the JSON object is in legacy (Portuguese) format.
 * Checks for Portuguese top-level keys like `usuario`, `destinos`, `viagens`.
 */
export function isLegacyJson(data: unknown): boolean {
	if (!data || typeof data !== 'object') return false;
	const keys = Object.keys(data as Record<string, unknown>);
	return keys.some((k) => PORTUGUESE_TOP_KEYS.has(k));
}

// ============================================================
// TRANSLATION LOGIC
// ============================================================

function transformObject(
	obj: unknown,
	parentKey: string,
): { result: unknown; fieldsRenamed: number; valuesTranslated: number } {
	let fieldsRenamed = 0;
	let valuesTranslated = 0;

	if (Array.isArray(obj)) {
		const arrResult: unknown[] = [];
		for (const item of obj) {
			const child = transformObject(item, parentKey);
			arrResult.push(child.result);
			fieldsRenamed += child.fieldsRenamed;
			valuesTranslated += child.valuesTranslated;
		}
		return { result: arrResult, fieldsRenamed, valuesTranslated };
	}

	if (obj === null || typeof obj !== 'object') {
		if (typeof obj === 'string' && VALUE_MAP[obj] !== undefined) {
			return { result: VALUE_MAP[obj], fieldsRenamed, valuesTranslated: 1 };
		}
		return { result: obj, fieldsRenamed, valuesTranslated };
	}

	const record = obj as Record<string, unknown>;
	const newObj: Record<string, unknown> = {};
	const contextOverrides = CONTEXT_FIELD_MAP[parentKey] ?? {};

	for (const [key, value] of Object.entries(record)) {
		let newKey: string;
		if (contextOverrides[key] !== undefined) {
			newKey = contextOverrides[key];
			fieldsRenamed++;
		} else if (FIELD_MAP[key] !== undefined) {
			newKey = FIELD_MAP[key];
			fieldsRenamed++;
		} else {
			newKey = key;
		}

		const child = transformObject(value, key);
		newObj[newKey] = child.result;
		fieldsRenamed += child.fieldsRenamed;
		valuesTranslated += child.valuesTranslated;
	}

	return { result: newObj, fieldsRenamed, valuesTranslated };
}

// ============================================================
// ID GENERATION (for subcollection doc IDs)
// ============================================================

function randomId(length = 5, pool: string[] = []): string {
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	const array = new Uint32Array(length);
	crypto.getRandomValues(array);
	let id = '';
	for (let i = 0; i < length; i++) {
		id += chars[array[i] % chars.length];
	}
	return pool.includes(id) ? randomId(length, pool) : id;
}

// ============================================================
// RESTRUCTURING LOGIC (mirrors Phase 1 migration)
// ============================================================

/**
 * Strip embedded destination data from destinationRefs,
 * keeping only { id } entries.
 */
function stripDestinationRefs(translatedData: Record<string, any>): number {
	const refs = translatedData.destinationRefs;
	if (!Array.isArray(refs) || refs.length === 0) return 0;

	const fatKeys = new Set([
		'title',
		'currency',
		'version',
		'sharing',
		'modules',
		'myMaps',
		'restaurants',
		'snacks',
		'shopping',
		'nightlife',
		'tourism',
	]);

	const slimRefs: { id: string }[] = [];
	let stripped = 0;
	for (const ref of refs) {
		if (!ref || typeof ref !== 'object') continue;
		const id = ref.id;
		if (!id) continue;
		const hasFatKeys = Object.keys(ref).some((k) => fatKeys.has(k));
		slimRefs.push({ id });
		if (hasFatKeys) stripped++;
	}

	if (stripped > 0) {
		translatedData.destinationRefs = slimRefs;
	}
	return stripped;
}

/**
 * Extract accommodations array from trip doc → subcollection map.
 * Modifies translatedData in place (deletes accommodations key).
 */
function extractAccommodations(
	translatedData: Record<string, any>,
	existingIds: string[],
): Record<string, any> | null {
	const accs = translatedData.accommodations;
	if (!Array.isArray(accs) || accs.length === 0) return null;

	const result: Record<string, any> = {};
	for (const acc of accs) {
		if (!acc || typeof acc !== 'object') continue;
		const accId = randomId(5, existingIds);
		existingIds.push(accId);

		const doc: Record<string, any> = {};
		for (const f of [
			'name',
			'description',
			'address',
			'dates',
			'breakfast',
			'images',
			'reservation',
			'link',
		]) {
			if (acc[f] !== undefined) doc[f] = acc[f];
		}
		result[accId] = doc;
	}

	delete translatedData.accommodations;
	return result;
}

/**
 * Extract transportation from trip doc → subcollection map.
 * Returns { settings, legs }.
 */
function extractTransportation(
	translatedData: Record<string, any>,
	existingIds: string[],
): Record<string, any> | null {
	const transport = translatedData.transportation;
	if (!transport || typeof transport !== 'object') return null;

	const result: Record<string, any> = {};

	// viewMode → _settings doc
	if (transport.viewMode !== undefined && transport.viewMode !== null) {
		result['_settings'] = { viewMode: transport.viewMode };
	}

	// Legs
	const legs = transport.data;
	if (Array.isArray(legs) && legs.length > 0) {
		for (const leg of legs) {
			if (!leg || typeof leg !== 'object') continue;
			const legId = randomId(5, existingIds);
			existingIds.push(legId);

			const doc: Record<string, any> = {};
			for (const f of [
				'type',
				'company',
				'points',
				'dates',
				'duration',
				'direction',
				'reservation',
				'link',
				'person',
			]) {
				if (leg[f] !== undefined) doc[f] = leg[f];
			}
			result[legId] = doc;
		}
	}

	if (Object.keys(result).length > 0) {
		delete translatedData.transportation;
	}
	return Object.keys(result).length > 0 ? result : null;
}

/**
 * Build a deterministic day ID from a date object.
 */
function buildDayId(day: Record<string, any>, index: number): string {
	const date = day.date;
	if (
		date &&
		typeof date === 'object' &&
		typeof date.year === 'number' &&
		typeof date.month === 'number' &&
		typeof date.day === 'number'
	) {
		const y = String(date.year);
		const m = String(date.month).padStart(2, '0');
		const d = String(date.day).padStart(2, '0');
		return `${y}${m}${d}`;
	}
	return `day-${index + 1}`;
}

/**
 * Extract itinerary array from trip doc → subcollection map.
 */
function extractItinerary(
	translatedData: Record<string, any>,
	existingIds: Set<string>,
): Record<string, any> | null {
	const itinerary = translatedData.itinerary;
	if (!Array.isArray(itinerary) || itinerary.length === 0) return null;

	const result: Record<string, any> = {};
	for (let i = 0; i < itinerary.length; i++) {
		const day = itinerary[i];
		if (!day || typeof day !== 'object') continue;

		let dayId = buildDayId(day, i);
		if (existingIds.has(dayId)) {
			const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
			const arr = new Uint32Array(3);
			crypto.getRandomValues(arr);
			let suffix = '';
			for (let j = 0; j < 3; j++) suffix += chars[arr[j] % chars.length];
			dayId = `${dayId}-${suffix}`;
		}
		existingIds.add(dayId);

		const doc: Record<string, any> = {};
		for (const f of [
			'title',
			'date',
			'destinationIds',
			'earlyMorning',
			'morning',
			'afternoon',
			'night',
		]) {
			if (day[f] !== undefined) doc[f] = day[f];
		}
		// Copy any extra fields not in the known list
		for (const [k, v] of Object.entries(day)) {
			if (!(k in doc)) doc[k] = v;
		}

		result[dayId] = doc;
	}

	delete translatedData.itinerary;
	return result;
}

// ============================================================
// MAIN NORMALIZATION FUNCTION
// ============================================================

export interface NormalizedJson {
	/** Top-level documents to write (same as restore expects) */
	user?: Record<string, any>;
	destinations?: Record<string, any>;
	expenses?: Record<string, any>;
	listings?: Record<string, any>;
	protected?: Record<string, any>;
	trips?: Record<string, any>;
	/** Subcollection data extracted during normalization */
	_subcollections?: {
		trips?: Record<string, {
			accommodations?: Record<string, any>;
			transportation?: Record<string, any>;
			itinerary?: Record<string, any>;
		}>;
	};
	/** Metadata about the normalization */
	_normalizationMeta?: {
		wasLegacy: boolean;
		fieldsRenamed: number;
		valuesTranslated: number;
	};
}

/**
 * Normalize a backup JSON object.
 *
 * If the JSON is in legacy Portuguese format:
 *   1. Translates all field names and values (Pt → En)
 *   2. Maps top-level keys (usuario→user, destinos→destinations, etc.)
 *   3. Extracts embedded accommodations, transportation, itinerary into _subcollections
 *   4. Strips embedded destination data from destinationRefs
 *
 * If the JSON is already in English format, it's returned as-is
 * (with _normalizationMeta.wasLegacy = false).
 */
export function normalizeLegacyJson(input: unknown): NormalizedJson {
	if (!input || typeof input !== 'object') {
		return input as NormalizedJson;
	}

	const data = input as Record<string, any>;

	// Detect legacy format
	const isLegacy = isLegacyJson(data);
	if (!isLegacy) {
		// Already in English format — return as-is but wrapped
		return {
			...data,
			_normalizationMeta: { wasLegacy: false, fieldsRenamed: 0, valuesTranslated: 0 },
		};
	}

	console.log('[normalize] Detected legacy (Portuguese) JSON — normalizing...');

	let totalFieldsRenamed = 0;
	let totalValuesTranslated = 0;
	const normalized: NormalizedJson = {
		_subcollections: { trips: {} },
		_normalizationMeta: { wasLegacy: true, fieldsRenamed: 0, valuesTranslated: 0 },
	};

	// Step 1: Remap top-level keys & translate contents
	for (const [oldKey, value] of Object.entries(data)) {
		const newKey = TOP_KEY_MAP[oldKey] || oldKey;

		if (newKey === 'user') {
			// User document: translate summaries
			const userTransformed = transformObject(value, '_root_usuarios');
			normalized.user = userTransformed.result as Record<string, any>;
			totalFieldsRenamed += userTransformed.fieldsRenamed;
			totalValuesTranslated += userTransformed.valuesTranslated;
			continue;
		}

		if (newKey === 'trips') {
			// Trips: translate + restructure
			const tripsResult: Record<string, any> = {};
			const tripsData = value as Record<string, any>;
			const protData = tripsData.protected;

			for (const [tripId, tripDoc] of Object.entries(tripsData)) {
				if (tripId === 'protected') continue;

				const transformed = transformObject(tripDoc, '_root_viagens');
				totalFieldsRenamed += transformed.fieldsRenamed;
				totalValuesTranslated += transformed.valuesTranslated;

				const newTrip = transformed.result as Record<string, any>;

				// Restructuring for trip docs
				stripDestinationRefs(newTrip);

				// Collect existing IDs to avoid collisions
				const existingIds: string[] = [];
				const existingItinIds = new Set<string>();

				// Extract accommodations
				const accs = extractAccommodations(newTrip, existingIds);
				if (accs) {
					if (!normalized._subcollections!.trips) {
						normalized._subcollections!.trips = {};
					}
					if (!normalized._subcollections!.trips[tripId]) {
						normalized._subcollections!.trips[tripId] = {};
					}
					normalized._subcollections!.trips[tripId].accommodations = accs;
				}

				// Extract transportation
				const trans = extractTransportation(newTrip, existingIds);
				if (trans) {
					if (!normalized._subcollections!.trips) {
						normalized._subcollections!.trips = {};
					}
					if (!normalized._subcollections!.trips[tripId]) {
						normalized._subcollections!.trips[tripId] = {};
					}
					normalized._subcollections!.trips[tripId].transportation = trans;
				}

				// Extract itinerary
				const itin = extractItinerary(newTrip, existingItinIds);
				if (itin) {
					if (!normalized._subcollections!.trips) {
						normalized._subcollections!.trips = {};
					}
					if (!normalized._subcollections!.trips[tripId]) {
						normalized._subcollections!.trips[tripId] = {};
					}
					normalized._subcollections!.trips[tripId].itinerary = itin;
				}

				tripsResult[tripId] = newTrip;
			}

			// Handle protected trips
			if (protData && typeof protData === 'object') {
				tripsResult.protected = {};
				for (const [pin, pinData] of Object.entries(protData as Record<string, any>)) {
					tripsResult.protected[pin] = {};
					for (const [tripId, tripDoc] of Object.entries(pinData as Record<string, any>)) {
						const transformed = transformObject(tripDoc, '_root_viagens_protected');
						totalFieldsRenamed += transformed.fieldsRenamed;
						totalValuesTranslated += transformed.valuesTranslated;
						(tripsResult.protected[pin] as Record<string, any>)[tripId] = transformed.result;
					}
				}
			}

			normalized.trips = tripsResult;
			continue;
		}

		// All other collections: translate recursively
		const transformed = transformObject(value, `_root_${oldKey}`);
		totalFieldsRenamed += transformed.fieldsRenamed;
		totalValuesTranslated += transformed.valuesTranslated;
		(normalized as Record<string, any>)[newKey] = transformed.result;
	}

	normalized._normalizationMeta = {
		wasLegacy: true,
		fieldsRenamed: totalFieldsRenamed,
		valuesTranslated: totalValuesTranslated,
	};

	console.log(
		`[normalize] Complete: ${totalFieldsRenamed} fields renamed, ${totalValuesTranslated} values translated.`,
	);

	return normalized;
}
