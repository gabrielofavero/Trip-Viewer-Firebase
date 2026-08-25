import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// ============================================================
// PHASE 1: Translate & Restructure
// Combines migrations 13–18 into a single pass.
//
// For each document in the Portuguese-named collections:
//   1. Translate all field names & values (Pt → En)
//   2. usuarios: split trip/destination/listing summaries into subcollections
//   3. viagens:  strip embedded destination data from destinationRefs
//   4. viagens:  move accommodations → subcollection
//   5. viagens:  move transportation  → subcollection
//   6. viagens:  move itinerary       → subcollection
//
// Idempotent: skips already-migrated documents.
// Supports ?dryRun=true query parameter.
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
	destinationId: 'id',
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

const DOC_ID_MAP: Record<string, Record<string, string>> = {
	admin: {
		permissoes: 'permissions',
	},
};

const TOP_COLLECTIONS = [
	'usuarios',
	'viagens',
	'destinos',
	'listagens',
	'gastos',
	'protegido',
	'config',
	'admin',
];

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

function isAlreadyTranslated(data: Record<string, unknown>): boolean {
	const knownPortugueseKeys = new Set(Object.keys(FIELD_MAP));
	for (const parentKey of Object.keys(CONTEXT_FIELD_MAP)) {
		if (!parentKey.startsWith('_root_')) {
			knownPortugueseKeys.add(parentKey);
		}
		for (const innerKey of Object.keys(CONTEXT_FIELD_MAP[parentKey])) {
			knownPortugueseKeys.add(innerKey);
		}
	}

	function hasPortugueseKeys(obj: unknown): boolean {
		if (obj === null || typeof obj !== 'object') return false;
		if (Array.isArray(obj)) {
			return obj.some((item) => hasPortugueseKeys(item));
		}
		const record = obj as Record<string, unknown>;
		for (const key of Object.keys(record)) {
			if (knownPortugueseKeys.has(key)) return true;
			if (hasPortugueseKeys(record[key])) return true;
		}
		return false;
	}

	return !hasPortugueseKeys(data);
}

// ============================================================
// ID GENERATION
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
// BATCH MANAGER
// ============================================================

class BatchManager {
	private batches: FirebaseFirestore.WriteBatch[] = [];
	private current: FirebaseFirestore.WriteBatch;
	private count = 0;

	constructor() {
		this.current = admin.firestore().batch();
		this.batches.push(this.current);
	}

	set(ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.DocumentData) {
		this.current.set(ref, data);
		this.rotate();
	}

	update(ref: FirebaseFirestore.DocumentReference, data: FirebaseFirestore.DocumentData) {
		this.current.update(ref, data);
		this.rotate();
	}

	delete(ref: FirebaseFirestore.DocumentReference) {
		this.current.delete(ref);
		this.rotate();
	}

	private rotate() {
		this.count++;
		if (this.count >= 500) {
			this.current = admin.firestore().batch();
			this.batches.push(this.current);
			this.count = 0;
		}
	}

	async commitAll() {
		console.log(`  Committing ${this.batches.length} batch(es)...`);
		for (let i = 0; i < this.batches.length; i++) {
			await this.batches[i].commit();
		}
	}
}

// ============================================================
// RESTRUCTURING: User Summaries → Subcollections (migration 14)
// ============================================================

interface UserSummaryReport {
	tripSummaries: number;
	destinationSummaries: number;
	listingSummaries: number;
}

function extractUserSummaries(
	translatedData: Record<string, any>,
	userDocRef: FirebaseFirestore.DocumentReference,
	batch: BatchManager,
	dryRun: boolean,
): UserSummaryReport {
	const report: UserSummaryReport = {
		tripSummaries: 0,
		destinationSummaries: 0,
		listingSummaries: 0,
	};
	const fieldsToDelete: string[] = [];

	// Helper: extract summaries from either nested object or dot-notation keys.
	// Firestore dot-notation keys appear as nested objects via SDK, but handle
	// both forms defensively.
	function extractSummaries(
		prefix: string,
		subcollectionName: string,
		buildDoc: (id: string, summary: Record<string, any>) => Record<string, any>,
	) {
		// 1) Nested object: { trips: { id1: {...}, id2: {...} } }
		const nested = translatedData[prefix];
		if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
			for (const [id, summary] of Object.entries(nested as Record<string, any>)) {
				if (!summary || typeof summary !== 'object') continue;
				const doc = buildDoc(id, summary);
				console.log(`    ${dryRun ? '[DRY RUN] ' : ''}Creating ${subcollectionName}: ${id}`);
				if (!dryRun)
					batch.set(userDocRef.collection(subcollectionName).doc(id), doc);
				report.tripSummaries += subcollectionName === 'tripSummaries' ? 1 : 0;
				report.destinationSummaries +=
					subcollectionName === 'destinationSummaries' ? 1 : 0;
				report.listingSummaries += subcollectionName === 'listingSummaries' ? 1 : 0;
			}
			fieldsToDelete.push(prefix);
		}

		// 2) Flat dot-notation: { "trips.id1": {...}, "trips.id2": {...} }
		//    Firestore SDK normally nests these, but user docs created via
		//    admin SDK update() with dot paths may retain flat keys.
		const dotPrefix = `${prefix}.`;
		for (const [key, summary] of Object.entries(translatedData)) {
			if (!key.startsWith(dotPrefix)) continue;
			if (!summary || typeof summary !== 'object') continue;
			const id = key.slice(dotPrefix.length);
			const doc = buildDoc(id, summary as Record<string, any>);
			console.log(
				`    ${dryRun ? '[DRY RUN] ' : ''}Creating ${subcollectionName} (dot-notation): ${id}`,
			);
			if (!dryRun)
				batch.set(userDocRef.collection(subcollectionName).doc(id), doc);
			if (subcollectionName === 'tripSummaries') report.tripSummaries++;
			if (subcollectionName === 'destinationSummaries') report.destinationSummaries++;
			if (subcollectionName === 'listingSummaries') report.listingSummaries++;
			fieldsToDelete.push(key);
		}
	}

	// Trip summaries
	extractSummaries('trips', 'tripSummaries', (id, s) => ({
		title: s.title ?? '',
		start: s.start ?? null,
		end: s.end ?? null,
		image: s.image ?? '',
		colors: s.colors ?? {},
		version: s.version ?? {},
		pin: s.pin ?? 'no-pin',
		modules: s.modules ?? {},
	}));

	// Destination summaries
	extractSummaries('destinations', 'destinationSummaries', (id, s) => ({
		title: s.title ?? '',
		currency: s.currency ?? '',
		version: s.version ?? {},
	}));

	// Listing summaries
	extractSummaries('listings', 'listingSummaries', (id, s) => ({
		title: s.title ?? '',
		subtitle: s.subtitle ?? '',
		description: s.description ?? '',
		image: s.image ?? '',
		colors: s.colors ?? {},
		version: s.version ?? {},
	}));

	// Remove embedded fields from translated data
	for (const f of fieldsToDelete) {
		delete translatedData[f];
	}

	return report;
}

// ============================================================
// RESTRUCTURING: Trip Destination Refs (migration 15)
// ============================================================

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
		const id = ref.id || ref.destinosID;
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

// ============================================================
// RESTRUCTURING: Accommodations → Subcollection (migration 16)
// ============================================================

function moveAccommodations(
	translatedData: Record<string, any>,
	tripDocRef: FirebaseFirestore.DocumentReference,
	batch: BatchManager,
	existingIds: string[],
	dryRun: boolean,
): number {
	const accs = translatedData.accommodations;
	if (!Array.isArray(accs) || accs.length === 0) return 0;

	let moved = 0;
	for (const acc of accs) {
		if (!acc || typeof acc !== 'object') continue;
		// Preserve original ID so protected-doc mapping stays valid
		const accId = acc.id && typeof acc.id === 'string' ? acc.id : randomId(5, existingIds);
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

		console.log(`    ${dryRun ? '[DRY RUN] ' : ''}Creating accommodation: ${accId}`);
		if (!dryRun) batch.set(tripDocRef.collection('accommodations').doc(accId), doc);
		moved++;
	}

	if (moved > 0) delete translatedData.accommodations;
	return moved;
}

// ============================================================
// RESTRUCTURING: Transportation → Subcollection (migration 17)
// ============================================================

function moveTransportation(
	translatedData: Record<string, any>,
	tripDocRef: FirebaseFirestore.DocumentReference,
	batch: BatchManager,
	existingIds: string[],
	dryRun: boolean,
): { legs: number; settings: boolean } {
	const transport = translatedData.transportation;
	if (!transport || typeof transport !== 'object') return { legs: 0, settings: false };

	let legsMoved = 0;
	let settingsMoved = false;

	// viewMode → _settings doc
	if (transport.viewMode !== undefined && transport.viewMode !== null) {
		console.log(`    ${dryRun ? '[DRY RUN] ' : ''}Creating transportation _settings`);
		if (!dryRun)
			batch.set(tripDocRef.collection('transportation').doc('_settings'), {
				viewMode: transport.viewMode,
			});
		settingsMoved = true;
	}

	// Legs
	const legs = transport.data;
	if (Array.isArray(legs) && legs.length > 0) {
		for (const leg of legs) {
			if (!leg || typeof leg !== 'object') continue;
			// Preserve original ID so protected-doc mapping stays valid
			const legId = leg.id && typeof leg.id === 'string' ? leg.id : randomId(5, existingIds);
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

			console.log(`    ${dryRun ? '[DRY RUN] ' : ''}Creating transport leg: ${legId}`);
			if (!dryRun) batch.set(tripDocRef.collection('transportation').doc(legId), doc);
			legsMoved++;
		}
	}

	if (legsMoved > 0 || settingsMoved) delete translatedData.transportation;
	return { legs: legsMoved, settings: settingsMoved };
}

// ============================================================
// RESTRUCTURING: Itinerary → Subcollection (migration 18)
// ============================================================

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

function moveItinerary(
	translatedData: Record<string, any>,
	tripDocRef: FirebaseFirestore.DocumentReference,
	batch: BatchManager,
	existingIds: Set<string>,
	dryRun: boolean,
): number {
	const itinerary = translatedData.itinerary;
	if (!Array.isArray(itinerary) || itinerary.length === 0) return 0;

	let daysMoved = 0;
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
		for (const [k, v] of Object.entries(day)) {
			if (!(k in doc)) doc[k] = v;
		}

		console.log(`    ${dryRun ? '[DRY RUN] ' : ''}Creating itinerary day: ${dayId}`);
		if (!dryRun) batch.set(tripDocRef.collection('itinerary').doc(dayId), doc);
		daysMoved++;
	}

	if (daysMoved > 0) delete translatedData.itinerary;
	return daysMoved;
}

// ============================================================
// PER-COLLECTION PROCESSOR
// ============================================================

interface DocReport {
	docId: string;
	fieldsRenamed: number;
	valuesTranslated: number;
	summaries?: UserSummaryReport;
	destRefsStripped?: number;
	accsMoved?: number;
	transportLegs?: number;
	transportSettings?: boolean;
	itineraryDays?: number;
}

async function processCollection(
	collectionName: string,
	dryRun: boolean,
): Promise<{
	reports: DocReport[];
	totalRenamed: number;
	totalTranslated: number;
	totalWritten: number;
}> {
	const colRef = admin.firestore().collection(collectionName);
	const snapshot = await colRef.get();

	if (snapshot.empty) {
		console.log(`[${collectionName}] No documents — skipping.`);
		return {
			reports: [],
			totalRenamed: 0,
			totalTranslated: 0,
			totalWritten: 0,
		};
	}

	console.log(`\n[${collectionName}] Processing ${snapshot.size} document(s)...`);

	const batch = new BatchManager();
	const reports: DocReport[] = [];
	let totalWritten = 0;

	for (const doc of snapshot.docs) {
		const data = doc.data();
		const report: DocReport = {
			docId: doc.id,
			fieldsRenamed: 0,
			valuesTranslated: 0,
		};

		// ID renaming check
		const idMap = DOC_ID_MAP[collectionName] ?? {};
		const newDocId: string | undefined = idMap[doc.id];

		if (newDocId) {
			const exists = await admin.firestore().doc(`${collectionName}/${newDocId}`).get();
			if (exists.exists) {
				console.log(`[${collectionName}/${doc.id}] Already renamed to ${newDocId} — deleting old.`);
				if (!dryRun) batch.delete(doc.ref);
				continue;
			}
		}

		// Idempotency: determine translation state
		const alreadyTranslated = isAlreadyTranslated(data);
		const docRef = doc.ref; // original ref (Portuguese collection)

		// Step 1: Translate field names & values (if needed)
		let newData: Record<string, any>;
		if (alreadyTranslated) {
			// Use data as-is; restructuring may still be needed
			newData = { ...data };
			console.log(`[${collectionName}/${doc.id}] Already translated — checking restructuring...`);
		} else {
			const transformed = transformObject(data, `_root_${collectionName}`);
			report.fieldsRenamed = transformed.fieldsRenamed;
			report.valuesTranslated = transformed.valuesTranslated;
			newData = transformed.result as Record<string, any>;
		}

		// Step 2: Collection-specific restructuring (always run)
		if (collectionName === 'usuarios') {
			report.summaries = extractUserSummaries(newData, docRef, batch, dryRun);
		}

		if (collectionName === 'viagens') {
			// Get existing subcollection IDs for collision avoidance
			const existingAccIds: string[] = [];
			const existingItinIds = new Set<string>();
			if (!dryRun) {
				const accSnap = await docRef.collection('accommodations').get();
				accSnap.forEach((d) => existingAccIds.push(d.id));
				const itinSnap = await docRef.collection('itinerary').get();
				itinSnap.forEach((d) => existingItinIds.add(d.id));
				// Also add transport IDs
				const transSnap = await docRef.collection('transportation').get();
				transSnap.forEach((d) => existingAccIds.push(d.id));
			}

			report.destRefsStripped = stripDestinationRefs(newData);
			report.accsMoved = moveAccommodations(newData, docRef, batch, existingAccIds, dryRun);
			const transResult = moveTransportation(newData, docRef, batch, existingAccIds, dryRun);
			report.transportLegs = transResult.legs;
			report.transportSettings = transResult.settings;
			report.itineraryDays = moveItinerary(newData, docRef, batch, existingItinIds, dryRun);
		}

		// Step 3: Determine if write-back is needed
		const hasRestructuring =
			(report.summaries &&
				(report.summaries.tripSummaries > 0 ||
					report.summaries.destinationSummaries > 0 ||
					report.summaries.listingSummaries > 0)) ||
			(report.accsMoved ?? 0) > 0 ||
			(report.transportLegs ?? 0) > 0 ||
			(report.transportSettings ?? false) ||
			(report.itineraryDays ?? 0) > 0 ||
			(report.destRefsStripped ?? 0) > 0;

		const hasTranslation = report.fieldsRenamed > 0 || report.valuesTranslated > 0;
		const isEmpty = Object.keys(newData).length === 0;

		// Gastos (expenses): write a version stub so the frontend can update() later.
		// Other collections: skip empty writes (they cause NOT_FOUND in the emulator).
		if (isEmpty && collectionName === 'gastos') {
			newData.version = { lastUpdated: new Date().toISOString() };
			console.log(`[${collectionName}/${doc.id}] Empty doc — writing version stub.`);
		} else if (isEmpty || (!hasTranslation && !hasRestructuring)) {
			console.log(`[${collectionName}/${doc.id}] No changes — skipping.`);
			continue;
		}

		// Step 4: Write back translated + restructured data
		const renameNote = newDocId ? ` (ID: ${doc.id} → ${newDocId})` : '';
		const changeParts: string[] = [];
		if (hasTranslation) changeParts.push(`${report.fieldsRenamed} fields, ${report.valuesTranslated} values`);
		if (hasRestructuring) changeParts.push('restructuring');
		console.log(
			`[${collectionName}/${doc.id}] ${changeParts.join(' + ')}${renameNote}`,
		);

		if (dryRun) {
			console.log(`  Old keys: ${Object.keys(data).join(', ')}`);
			console.log(`  New keys: ${Object.keys(newData).join(', ')}`);
		} else {
			if (newDocId) {
				const newRef = admin.firestore().doc(`${collectionName}/${newDocId}`);
				batch.set(newRef, newData);
				batch.delete(doc.ref);
			} else {
				batch.set(docRef, newData);
			}
			totalWritten++;
		}

		reports.push(report);
	}

	if (!dryRun) await batch.commitAll();
	return {
		reports,
		totalRenamed: reports.reduce((s, r) => s + r.fieldsRenamed, 0),
		totalTranslated: reports.reduce((s, r) => s + r.valuesTranslated, 0),
		totalWritten,
	};
}

// ============================================================
// PROTECTED SUBCOLLECTIONS
// ============================================================

async function processProtectedSubcollections(dryRun: boolean): Promise<number> {
	const protectedSnap = await admin.firestore().collection('protegido').get();
	const tripPins: Record<string, string> = {};
	protectedSnap.forEach((doc) => {
		const pin = doc.data()?.pin;
		if (pin) tripPins[doc.id] = pin;
	});

	console.log(`\n[protected-subcollections] Found ${Object.keys(tripPins).length} trip PIN(s).`);

	let processed = 0;
	for (const [tripId, pin] of Object.entries(tripPins)) {
		for (const parent of ['viagens', 'gastos']) {
			const path = `${parent}/protected/${pin}/${tripId}`;
			try {
				const docRef = admin.firestore().doc(path);
				const docSnap = await docRef.get();
				if (!docSnap.exists) continue;

				const data = docSnap.data();
				if (!data || isAlreadyTranslated(data)) continue;

				const transformed = transformObject(data, `_root_${parent}_protected`);
				if (transformed.fieldsRenamed === 0 && transformed.valuesTranslated === 0) continue;

				const result = transformed.result as Record<string, any>;
				if (Object.keys(result).length === 0) continue;

				console.log(
					`[${path}] ${transformed.fieldsRenamed} fields, ${transformed.valuesTranslated} values`,
				);
				if (!dryRun) {
					await docRef.set(result as FirebaseFirestore.DocumentData);
				}
				processed++;
			} catch (err) {
				console.warn(`[${path}] Error: ${(err as Error).message}`);
			}
		}
	}
	return processed;
}

// ============================================================
// MAIN HANDLER
// ============================================================

export const migrate = functions.https.onRequest(async (req, res) => {
	const dryRun = req.query.dryRun === 'true';
	const mode = dryRun ? 'DRY RUN' : 'LIVE';

	console.log(`\n========================================`);
	console.log(`[phase1-translate-restructure] ${mode}`);
	console.log(`========================================\n`);

	try {
		let grandTotalRenamed = 0;
		let grandTotalTranslated = 0;
		let grandTotalWritten = 0;

		// Step 1: Process all top-level collections
		for (const col of TOP_COLLECTIONS) {
			const result = await processCollection(col, dryRun);
			grandTotalRenamed += result.totalRenamed;
			grandTotalTranslated += result.totalTranslated;
			grandTotalWritten += result.totalWritten;
			console.log(
				`[${col}] ${result.totalRenamed} fields renamed, ${result.totalTranslated} values, ${result.totalWritten} written.`,
			);
		}

		// Step 2: Process protected subcollections
		const protectedCount = await processProtectedSubcollections(dryRun);
		grandTotalWritten += protectedCount;

		const summary =
			`\n========================================\n` +
			`[phase1] ${mode} COMPLETE\n` +
			`  Fields renamed:   ${grandTotalRenamed}\n` +
			`  Values translated: ${grandTotalTranslated}\n` +
			`  Documents written: ${grandTotalWritten}\n` +
			`========================================`;

		console.log(summary);
		res
			.status(200)
			.send(
				dryRun
					? `DRY RUN complete. ${grandTotalRenamed} fields would be renamed, ${grandTotalTranslated} values translated, ${grandTotalWritten} docs written. Remove ?dryRun=true to execute.`
					: `Phase 1 complete. ${grandTotalRenamed} fields renamed, ${grandTotalTranslated} values translated, ${grandTotalWritten} docs written.`,
			);
	} catch (error) {
		console.error('[phase1] Fatal error:', error);
		res.status(500).send(`Migration failed: ${(error as Error).message}`);
	}
});
