import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

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

	// Trip summaries
	const tripsData = translatedData.trips;
	if (tripsData && typeof tripsData === 'object' && !Array.isArray(tripsData)) {
		const entries = Object.entries(tripsData as Record<string, any>);
		for (const [tripId, summary] of entries) {
			if (!summary || typeof summary !== 'object') continue;
			const doc = {
				title: summary.title ?? '',
				start: summary.start ?? null,
				end: summary.end ?? null,
				image: summary.image ?? '',
				colors: summary.colors ?? {},
				version: summary.version ?? {},
				pin: summary.pin ?? 'no-pin',
				modules: summary.modules ?? {},
			};
			console.log(`    ${dryRun ? '[DRY RUN] ' : ''}Creating tripSummary: ${tripId}`);
			if (!dryRun) batch.set(userDocRef.collection('tripSummaries').doc(tripId), doc);
			report.tripSummaries++;
		}
		fieldsToDelete.push('trips');
	}

	// Destination summaries
	const destData = translatedData.destinations;
	if (destData && typeof destData === 'object' && !Array.isArray(destData)) {
		const entries = Object.entries(destData as Record<string, any>);
		for (const [destId, summary] of entries) {
			if (!summary || typeof summary !== 'object') continue;
			const doc = {
				title: summary.title ?? '',
				currency: summary.currency ?? '',
				version: summary.version ?? {},
			};
			console.log(`    ${dryRun ? '[DRY RUN] ' : ''}Creating destinationSummary: ${destId}`);
			if (!dryRun) batch.set(userDocRef.collection('destinationSummaries').doc(destId), doc);
			report.destinationSummaries++;
		}
		fieldsToDelete.push('destinations');
	}

	// Listing summaries
	const listingData = translatedData.listings;
	if (listingData && typeof listingData === 'object' && !Array.isArray(listingData)) {
		const entries = Object.entries(listingData as Record<string, any>);
		for (const [listingId, summary] of entries) {
			if (!summary || typeof summary !== 'object') continue;
			const doc = {
				title: summary.title ?? '',
				subtitle: summary.subtitle ?? '',
				description: summary.description ?? '',
				image: summary.image ?? '',
				colors: summary.colors ?? {},
				version: summary.version ?? {},
			};
			console.log(`    ${dryRun ? '[DRY RUN] ' : ''}Creating listingSummary: ${listingId}`);
			if (!dryRun) batch.set(userDocRef.collection('listingSummaries').doc(listingId), doc);
			report.listingSummaries++;
		}
		fieldsToDelete.push('listings');
	}

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

		// Idempotency: skip if already translated
		if (isAlreadyTranslated(data)) {
			console.log(`[${collectionName}/${doc.id}] Already translated — skipping.`);
			continue;
		}

		// Step 1: Translate field names & values
		const transformed = transformObject(data, `_root_${collectionName}`);
		report.fieldsRenamed = transformed.fieldsRenamed;
		report.valuesTranslated = transformed.valuesTranslated;

		if (transformed.fieldsRenamed === 0 && transformed.valuesTranslated === 0) {
			console.log(`[${collectionName}/${doc.id}] No changes — skipping.`);
			continue;
		}

		const newData = transformed.result as Record<string, any>;
		const docRef = doc.ref; // original ref (Portuguese collection)

		// Step 2: Collection-specific restructuring
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

		// Step 3: Write back translated + restructured data
		const renameNote = newDocId ? ` (ID: ${doc.id} → ${newDocId})` : '';
		console.log(
			`[${collectionName}/${doc.id}] ${report.fieldsRenamed} fields, ${report.valuesTranslated} values${renameNote}`,
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

				console.log(
					`[${path}] ${transformed.fieldsRenamed} fields, ${transformed.valuesTranslated} values`,
				);
				if (!dryRun) {
					await docRef.set(transformed.result as FirebaseFirestore.DocumentData);
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
