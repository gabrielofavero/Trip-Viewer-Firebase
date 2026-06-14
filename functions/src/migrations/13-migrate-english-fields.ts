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
	programacoes: "schedule",
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
	lojas: "shops",
	saidas: "nightlife",
	turismo: "attractions",
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
	// Inside schedule entry titulo: valor = the title string, destinos = show flag
	titulo: {
		valor: "value",
		destinos: "showDestinations",
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
	// Direction
	ida: "outbound",
	volta: "return",
	durante: "during",
	// View mode
	"simple-view": "simple",
	"leg-view": "leg",
	// Schedule item type (when stored as a string value)
	destinos: "destination",
	transporte: "transportation",
	hospedagens: "accommodation",
	// User visibility mode
	dinamico: "dynamic",
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
 * We look for a few telltale English fields that only the new schema would have.
 */
function isAlreadyTranslated(data: Record<string, unknown>): boolean {
	// If the doc has "title" instead of "titulo", it's likely already translated
	if (data["title"] !== undefined && data["titulo"] === undefined) return true;
	// If it has "modules" instead of "modulos"
	if (data["modules"] !== undefined && data["modulos"] === undefined) return true;
	// For protected/config docs which may not have title/modules fields,
	// check if any known English field exists without its Portuguese counterpart
	const knownPairs: Array<[string, string]> = [
		["visibility", "visibilidade"],
		["start", "inicio"],
		["end", "fim"],
		["currency", "moeda"],
	];
	for (const [en, pt] of knownPairs) {
		if (data[en] !== undefined && data[pt] === undefined) return true;
	}
	return false;
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
			console.log(
				`[DRY RUN] [${collectionName}/${doc.id}] ` +
					`${transformed.fieldsRenamed} fields renamed, ` +
					`${transformed.valuesTranslated} values translated.`,
			);
			console.log(`  Old keys: ${Object.keys(data).join(", ")}`);
			console.log(
				`  New keys: ${Object.keys(transformed.result as Record<string, unknown>).join(", ")}`,
			);
			continue;
		}

		// Write: set with merge=false replaces the entire document
		batch.set(doc.ref, transformed.result as FirebaseFirestore.DocumentData);
		batchOpCount++;
		report.docsWritten++;

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
					`${report.docsWritten} written.`,
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

		const summary =
			`\n========================================\n` +
			`[migrate-english-fields] ${mode} COMPLETE\n` +
			`  Collections processed: ${allReports.length}\n` +
			`  Documents scanned:     ${totalDocs}\n` +
			`  Fields renamed:        ${totalRenamed}\n` +
			`  Values translated:     ${totalTranslated}\n` +
			`  Documents written:     ${totalWritten}\n` +
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
