import * as functions from "firebase-functions";
import * as admin from "firebase-admin";


// ============================================================
// Field Name Translation Map (Portuguese → English)
// Unambiguous global renames — same meaning regardless of parent context.
// ============================================================
const FIELD_MAP: Record<string, string> = {
	titulo: "title",
	versao: "version",
	visibilidade: "visibility",
	inicio: "start",
	fim: "end",
	cores: "colors",
	compartilhamento: "sharing",
	modulos: "modules",
	moeda: "currency",
	pessoas: "travelers",
	hospedagens: "accommodations",
	transportes: "transportation",
	programacoes: "itinerary",
	galeria: "gallery",
	nome: "name",
	descricao: "description",
	endereco: "address",
	datas: "dates",
	cafe: "breakfast",
	imagens: "images",
	reserva: "reservation",
	empresa: "company",
	pontos: "points",
	duracao: "duration",
	idaVolta: "direction",
	pessoa: "person",
	visualizacao: "viewMode",
	destinosIDs: "destinationIds",
	madrugada: "earlyMorning",
	manha: "morning",
	tarde: "afternoon",
	noite: "night",
	programacao: "label",
	tipo: "type",
	transporte: "type",
	restaurantes: "restaurants",
	lanches: "snacks",
	lojas: "shopping",
	saidas: "nightlife",
	turismo: "tourism",
	nota: "rating",
	mapa: "map",
	regiao: "region",
	novo: "isNew",
	criadoEm: "createdAt",
	midia: "media",
	permissoes: "permissions",
	gastosDurante: "duringTrip",
	gastosPrevios: "preTrip",
	orcamento: "budget",
	ultimaAtualizacao: "lastUpdated",
	dono: "owner",
	editores: "editors",
	vacina: "vaccine",
	traduzir: "translate",
	checkin: "checkIn",
	checkout: "checkOut",
	ativo: "active",
	// Singular destinosID appears inside destinationRefs[] entries and itinerary destinationIds[] entries
	destinosID: "id",
	// dados = data array (e.g. transportation.dados)
	dados: "data",
	// Fields discovered missing after initial run:
	destinos: "destinations",
	valor: "price",
	subtitulo: "subtitle",
	imagem: "image",
	foto: "photo",
	altura: "height",
	caminho: "path",
	claro: "light",
	escuro: "dark",
	exibirEmDestinos: "showInDestinations",
	gastos: "expenses",
	resumo: "summary",
	listagens: "listings",
	viagens: "trips",
	tamanhoUploadIrrestrito: "unlimitedUploadSize",
	versoes: "versions",
	enviadoEm: "sentAt",
	link: "link",
	instagram: "instagram",
	website: "website",
	emoji: "emoji",
	preco: "price",
	documento: "document",
	arquivo: "file",
	icone: "icon",
	texto: "text",
	legenda: "caption",
	destaque: "highlight",
	ordem: "order",
	status: "status",
	configuracao: "configuration",
	tema: "theme",
	idioma: "language",
	categoria: "category",
	local: "location",
	// Gallery plural fields (was inside galeria object)
	categorias: "categories",
	descricoes: "descriptions",
	titulos: "titles",
};

// ============================================================
// Context-Sensitive Field Map
// Keys that change meaning depending on their parent object.
// parentKey → { oldKey: newKey }
// ============================================================
const CONTEXT_FIELD_MAP: Record<string, Record<string, string>> = {
	// Inside transportes.pontos: partida = origin point, chegada = destination point
	pontos: {
		partida: "origin",
		chegada: "destination",
	},
	// Inside transportes.datas: partida = departure date, chegada = arrival date
	// (datas is renamed to dates by FIELD_MAP, but we match against the OLD key "datas"
	//  because we check parent BEFORE renaming parent)
	datas: {
		partida: "departure",
		chegada: "arrival",
	},
	// Inside itinerary entry title: valor = the title string, destinos = show flag
	titulo: {
		valor: "value",
		destinos: "showDestinations",
	},
	// Trip root: destinos array should become destinationRefs (not destinations)
	// because it contains {id, ...} refs, not embedded destination data.
	// Parent key is the collection name prefixed with _root_.
	_root_viagens: {
		destinos: "destinationRefs",
	},
	// Inside itinerary entries (parent is the ORIGINAL Portuguese key "programacoes",
	// NOT the translated "itinerary" — because transformObject passes old keys as context):
	// data = Portuguese for "date"
	programacoes: {
		data: "date",
	},
	// Inside modulos object: programacao = itinerary module flag
	// (singular, unlike FIELD_MAP's programacoes: "itinerary" for the array)
	modulos: {
		programacao: "itinerary",
	},
};

// ============================================================
// Value Translation Map (Portuguese → English)
// For Portuguese string VALUES stored as data (not field names).
// Applied to leaf string values after field renaming.
// ============================================================
const VALUE_MAP: Record<string, string> = {
	// Transport type
	voo: "flight",
	onibus: "bus",
	carro: "car",
	"trem-bala": "bullet_train",
	// Direction
	ida: "departure",
	volta: "return",
	durante: "during",
	// View mode
	"simple-view": "simple",
	"leg-view": "leg",
	// Itinerary item type (when stored as a string value)
	destinos: "destination",
	transporte: "transportation",
	hospedagens: "accommodation",
	// User visibility mode
	dinamico: "dynamic",
	// Theme / visibility values (stored as string values, e.g. visibility.light = "claro")
	claro: "light",
	escuro: "dark",
	ativo: "active",
	// Module keys (when stored as string values in arrays or settings)
	saidas: "nightlife",
	mapa: "map",
	gastos: "expenses",
	resumo: "summary",
	// Category values (e.g. categoria: "restaurantes" in itinerary items)
	restaurantes: "restaurants",
	lanches: "snacks",
	lojas: "shopping",
	turismo: "tourism",
	// Common enum values
	sim: "yes",
	nao: "no",
	todos: "all",
	nenhum: "none",
};

// ============================================================
// Document ID Translation Map (Portuguese → English)
// For documents whose ID itself is a Portuguese word.
// Applied per-collection: { collectionName: { oldId: newId } }
// ============================================================
const DOC_ID_MAP: Record<string, Record<string, string>> = {
	admin: {
		permissoes: "permissions",
	},
};

// ============================================================
// Top-level collections to process (Portuguese names)
// ============================================================
const TOP_COLLECTIONS = [
	"usuarios",
	"viagens",
	"destinos",
	"listagens",
	"gastos",
	"protegido",
	"config",
	"admin",
];

// ============================================================
// Helpers
// ============================================================

interface MigrationReport {
	collection: string;
	docsProcessed: number;
	fieldsRenamed: number;
	valuesTranslated: number;
	docsWritten: number;
	docIdsRenamed: number;
}

/**
 * Recursively transform an object's field names and string values.
 * Tracks parentKey to resolve context-sensitive renames.
 *
 * @returns { transformedObj, fieldsRenamed, valuesTranslated }
 */
function transformObject(
	obj: unknown,
	parentKey: string,
): { result: unknown; fieldsRenamed: number; valuesTranslated: number } {
	let fieldsRenamed = 0;
	let valuesTranslated = 0;

	// Arrays: recurse into each element
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

	// Null or non-object (string/number/boolean): check value translation
	if (obj === null || typeof obj !== "object") {
		if (typeof obj === "string" && VALUE_MAP[obj] !== undefined) {
			return { result: VALUE_MAP[obj], fieldsRenamed, valuesTranslated: 1 };
		}
		return { result: obj, fieldsRenamed, valuesTranslated };
	}

	// Object: rename keys and recurse into values
	const record = obj as Record<string, unknown>;
	const newObj: Record<string, unknown> = {};
	const contextOverrides = CONTEXT_FIELD_MAP[parentKey] ?? {};

	for (const [key, value] of Object.entries(record)) {
		// Determine new key: check context overrides first, then global map
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

		// Recurse into value, passing the ORIGINAL key as parent context
		// (so context-sensitive checks match against old Portuguese names)
		const child = transformObject(value, key);
		newObj[newKey] = child.result;
		fieldsRenamed += child.fieldsRenamed;
		valuesTranslated += child.valuesTranslated;
	}

	return { result: newObj, fieldsRenamed, valuesTranslated };
}

/**
 * Check if a document already has English field names (idempotency check).
 *
 * Strategy: recursively scan for ANY known Portuguese field name (from FIELD_MAP
 * or non-_root_ CONTEXT_FIELD_MAP parents).  If a single Portuguese key is found
 * at any nesting level, the doc needs (re-)translation.
 *
 * This catches partially-translated docs where top-level keys are already English
 * but nested keys are still Portuguese (e.g. from a buggy previous run).
 */
function isAlreadyTranslated(data: Record<string, unknown>): boolean {
	// Build the set of Portuguese keys we know how to translate.
	// Includes all FIELD_MAP keys, non-_root_ CONTEXT_FIELD_MAP parent keys,
	// AND all Portuguese keys that appear as VALUES inside context maps
	// (e.g. "data" inside "programacoes" → should be detected as Portuguese).
	const knownPortugueseKeys = new Set(Object.keys(FIELD_MAP));
	for (const parentKey of Object.keys(CONTEXT_FIELD_MAP)) {
		if (!parentKey.startsWith("_root_")) {
			knownPortugueseKeys.add(parentKey);
		}
		// Also add the inner Portuguese keys from each context entry
		for (const innerKey of Object.keys(CONTEXT_FIELD_MAP[parentKey])) {
			knownPortugueseKeys.add(innerKey);
		}
	}

	// Recursively check for any Portuguese key
	function hasPortugueseKeys(obj: unknown): boolean {
		if (obj === null || typeof obj !== "object") return false;
		if (Array.isArray(obj)) {
			return obj.some(item => hasPortugueseKeys(item));
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

/**
 * Process a single collection: read all docs, transform, write back.
 */
async function migrateCollection(
	collectionName: string,
	dryRun: boolean,
): Promise<MigrationReport> {
	const report: MigrationReport = {
		collection: collectionName,
		docsProcessed: 0,
		fieldsRenamed: 0,
		valuesTranslated: 0,
		docsWritten: 0,
		docIdsRenamed: 0,
	};

	const collectionRef = admin.firestore().collection(collectionName);
	const snapshot = await collectionRef.get();

	if (snapshot.empty) {
		console.log(`[${collectionName}] No documents found — skipping.`);
		return report;
	}

	let batch = admin.firestore().batch();
	let batchOpCount = 0;
	const batches: FirebaseFirestore.WriteBatch[] = [batch];

	for (const doc of snapshot.docs) {
		report.docsProcessed++;
		const data = doc.data();

		// Check if this document ID itself needs translation (e.g. admin/permissoes → admin/permissions)
		const idMap = DOC_ID_MAP[collectionName] ?? {};
		const newDocId: string | undefined = idMap[doc.id];

		// Idempotency: if new ID already exists, this rename was already done — just clean up old doc
		if (newDocId) {
			const newDocSnap = await admin
				.firestore()
				.doc(`${collectionName}/${newDocId}`)
				.get();
			if (newDocSnap.exists) {
				console.log(
					`[${collectionName}/${doc.id}] Already renamed to ${newDocId} — deleting old doc.`,
				);
				if (!dryRun) {
					batch.delete(doc.ref);
					batchOpCount++;
					if (batchOpCount >= 500) {
						batch = admin.firestore().batch();
						batches.push(batch);
						batchOpCount = 0;
					}
				}
				continue;
			}
		}

		if (isAlreadyTranslated(data)) {
			console.log(`[${collectionName}/${doc.id}] Already translated — skipping.`);
			continue;
		}

		const transformed = transformObject(data, `_root_${collectionName}`);

		if (transformed.fieldsRenamed === 0 && transformed.valuesTranslated === 0) {
			console.log(
				`[${collectionName}/${doc.id}] No changes needed — skipping.`,
			);
			continue;
		}

		report.fieldsRenamed += transformed.fieldsRenamed;
		report.valuesTranslated += transformed.valuesTranslated;

		if (dryRun) {
			const renameNote = newDocId
				? ` (doc ID: ${doc.id} → ${newDocId})`
				: "";
			console.log(
				`[DRY RUN] [${collectionName}/${doc.id}] ` +
					`${transformed.fieldsRenamed} fields renamed, ` +
					`${transformed.valuesTranslated} values translated.${renameNote}`,
			);
			console.log(`  Old keys: ${Object.keys(data).join(", ")}`);
			console.log(
				`  New keys: ${Object.keys(transformed.result as Record<string, unknown>).join(", ")}`,
			);
			continue;
		}

		// If doc ID needs renaming, write to new ID and delete old
		if (newDocId) {
			// Document ID rename: write to new ID, delete old ID
			const newDocRef = admin.firestore().doc(`${collectionName}/${newDocId}`);
			batch.set(newDocRef, transformed.result as FirebaseFirestore.DocumentData);
			batch.delete(doc.ref);
			batchOpCount += 2;
			report.docsWritten++;
			report.docIdsRenamed++;
			console.log(
				`[${collectionName}] Doc ID renamed: ${doc.id} → ${newDocId}`,
			);
		} else {
			// Write: set with merge=false replaces the entire document
			batch.set(doc.ref, transformed.result as FirebaseFirestore.DocumentData);
			batchOpCount++;
			report.docsWritten++;
		}

		// Firestore batch limit is 500 operations
		if (batchOpCount >= 500) {
			batch = admin.firestore().batch();
			batches.push(batch);
			batchOpCount = 0;
		}
	}

	// Commit all batches
	if (!dryRun) {
		console.log(
			`[${collectionName}] Committing ${batches.length} batch(es) ` +
				`(${report.docsWritten} writes)...`,
		);
		for (let i = 0; i < batches.length; i++) {
			await batches[i].commit();
			console.log(`[${collectionName}] Batch ${i + 1}/${batches.length} committed.`);
		}
	}

	return report;
}

/**
 * Process protected subcollections under viagens and gastos.
 * These use the pattern: {parent}/{tripId}/protected/{pin}/{tripId}
 * We need to read protecido/{tripId} to discover the pin for each trip.
 */
async function migrateProtectedSubcollections(
	dryRun: boolean,
): Promise<MigrationReport[]> {
	const reports: MigrationReport[] = [];

	// Read all protected metadata docs
	const protectedSnapshot = await admin
		.firestore()
		.collection("protegido")
		.get();

	const tripPins: Record<string, string> = {};
	protectedSnapshot.forEach((doc) => {
		const pin = doc.data()?.pin;
		if (pin) tripPins[doc.id] = pin;
	});

	console.log(
		`[protected-subcollections] Found ${Object.keys(tripPins).length} trip PINs.`,
	);

	// For each trip with a PIN, process viagens/protected/{pin}/{tripId}
	for (const [tripId, pin] of Object.entries(tripPins)) {
		const viagensPath = `viagens/protected/${pin}/${tripId}`;
		try {
			const docRef = admin.firestore().doc(viagensPath);
			const docSnap = await docRef.get();

			if (!docSnap.exists) {
				console.log(`[${viagensPath}] Not found — skipping.`);
				continue;
			}

			const data = docSnap.data();
			if (!data || isAlreadyTranslated(data)) {
				console.log(`[${viagensPath}] Already translated — skipping.`);
				continue;
			}

			const transformed = transformObject(data, "_root_viagens_protected");
			if (
				transformed.fieldsRenamed === 0 &&
				transformed.valuesTranslated === 0
			) {
				continue;
			}

			if (dryRun) {
				console.log(
					`[DRY RUN] [${viagensPath}] ` +
						`${transformed.fieldsRenamed} fields renamed, ` +
						`${transformed.valuesTranslated} values translated.`,
				);
			} else {
				await docRef.set(
					transformed.result as FirebaseFirestore.DocumentData,
				);
				console.log(`[${viagensPath}] Written.`);
			}

			reports.push({
				collection: viagensPath,
				docsProcessed: 1,
				fieldsRenamed: transformed.fieldsRenamed,
				valuesTranslated: transformed.valuesTranslated,
				docsWritten: dryRun ? 0 : 1,
				docIdsRenamed: 0,
			});
		} catch (err) {
			console.warn(`[${viagensPath}] Error: ${(err as Error).message}`);
		}

		// Same for gastos/protected/{pin}/{tripId}
		const gastosPath = `gastos/protected/${pin}/${tripId}`;
		try {
			const docRef = admin.firestore().doc(gastosPath);
			const docSnap = await docRef.get();

			if (!docSnap.exists) {
				console.log(`[${gastosPath}] Not found — skipping.`);
				continue;
			}

			const data = docSnap.data();
			if (!data || isAlreadyTranslated(data)) {
				console.log(`[${gastosPath}] Already translated — skipping.`);
				continue;
			}

			const transformed = transformObject(data, "_root_gastos_protected");
			if (
				transformed.fieldsRenamed === 0 &&
				transformed.valuesTranslated === 0
			) {
				continue;
			}

			if (dryRun) {
				console.log(
					`[DRY RUN] [${gastosPath}] ` +
						`${transformed.fieldsRenamed} fields renamed, ` +
						`${transformed.valuesTranslated} values translated.`,
				);
			} else {
				await docRef.set(
					transformed.result as FirebaseFirestore.DocumentData,
				);
				console.log(`[${gastosPath}] Written.`);
			}

			reports.push({
				collection: gastosPath,
				docsProcessed: 1,
				fieldsRenamed: transformed.fieldsRenamed,
				valuesTranslated: transformed.valuesTranslated,
				docsWritten: dryRun ? 0 : 1,
				docIdsRenamed: 0,
			});
		} catch (err) {
			console.warn(`[${gastosPath}] Error: ${(err as Error).message}`);
		}
	}

	return reports;
}

// ============================================================
// Main Migration Handler
// ============================================================

export const migrate = functions.https.onRequest(async (req, res) => {
	const dryRun = req.query.dryRun === "true";
	const mode = dryRun ? "DRY RUN" : "LIVE";

	console.log(`[migrate-english-fields] Starting ${mode}...`);
	console.log(
		`[migrate-english-fields] Collections to process: ${TOP_COLLECTIONS.join(", ")}`,
	);

	const allReports: MigrationReport[] = [];

	try {
		// Step 1: Process all top-level collections
		for (const collectionName of TOP_COLLECTIONS) {
			console.log(`\n[migrate-english-fields] Processing "${collectionName}"...`);
			const report = await migrateCollection(collectionName, dryRun);
			allReports.push(report);
			console.log(
				`[${collectionName}] Done: ${report.docsProcessed} scanned, ` +
					`${report.fieldsRenamed} fields renamed, ` +
					`${report.valuesTranslated} values translated, ` +
					`${report.docsWritten} written, ` +
					`${report.docIdsRenamed} doc IDs renamed.`,
			);
		}

		// Step 2: Process protected subcollections
		console.log(`\n[migrate-english-fields] Processing protected subcollections...`);
		const subReports = await migrateProtectedSubcollections(dryRun);
		allReports.push(...subReports);

		// Summary
		const totalDocs = allReports.reduce(
			(sum, r) => sum + r.docsProcessed,
			0,
		);
		const totalRenamed = allReports.reduce(
			(sum, r) => sum + r.fieldsRenamed,
			0,
		);
		const totalTranslated = allReports.reduce(
			(sum, r) => sum + r.valuesTranslated,
			0,
		);
		const totalWritten = allReports.reduce(
			(sum, r) => sum + r.docsWritten,
			0,
		);
		const totalDocIdsRenamed = allReports.reduce(
			(sum, r) => sum + r.docIdsRenamed,
			0,
		);

		const summary =
			`\n========================================\n` +
			`[migrate-english-fields] ${mode} COMPLETE\n` +
			`  Collections processed: ${allReports.length}\n` +
			`  Documents scanned:     ${totalDocs}\n` +
			`  Fields renamed:        ${totalRenamed}\n` +
			`  Values translated:     ${totalTranslated}\n` +
			`  Documents written:     ${totalWritten}\n` +
			`  Doc IDs renamed:       ${totalDocIdsRenamed}\n` +
			`========================================`;

		console.log(summary);

		res.status(200).send(
			dryRun
				? `DRY RUN complete. ${totalRenamed} fields would be renamed, ${totalTranslated} values would be translated across ${totalDocs} documents. Remove ?dryRun=true to execute.`
				: `Migration complete. ${totalRenamed} fields renamed, ${totalTranslated} values translated across ${totalDocs} documents (${totalWritten} written).`,
		);
	} catch (error) {
		console.error("[migrate-english-fields] Fatal error:", error);
		res.status(500).send(`Migration failed: ${(error as Error).message}`);
	}
});
