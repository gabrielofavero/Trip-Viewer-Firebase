import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
admin.initializeApp();

interface Hospedagem {
	id: string;
	reserva?: string;
	link?: string;
}
interface Transporte {
	id: string;
	reserva?: string;
	link?: string;
}

interface ViagemData {
	gastosPin?: boolean;
	hospedagens?: Hospedagem[];
	transportes?: { dados?: Transporte[] };
	pin?: "sensitive-only" | "no-pin";
}

export const migrate = functions.https.onRequest(
	async (_req, res): Promise<void> => {
		const batch = admin.firestore().batch();

		try {
			await migrateViagens(batch);
			await migrateGastos(batch);
			await batch.commit();

			res.status(200).send("Migration completed");
		} catch (err) {
			console.error(err);
			res.status(500).send("Migration failed — nothing committed");
		}
	},
);

async function migrateViagens(batch: FirebaseFirestore.WriteBatch) {
	const collection = admin.firestore().collection("viagens");
	const snap = await collection.get();

	for (const doc of snap.docs) {
		const data = doc.data() as ViagemData;
		const gastosPin = data.gastosPin ?? false;

		delete data.gastosPin;
		data.pin = gastosPin ? "sensitive-only" : "no-pin";

		if (data.pin == "sensitive-only") {
			const pin = await _getPinForTrip(doc.id);
			if (!pin) {
				throw new Error(
					`Trip ${doc.id} has gastosPin true but no pin found in gastos collection`,
				);
			}
			const sensitive = getSensitiveTripObject(data);

			const protectedRef = admin
				.firestore()
				.collection("viagens")
				.doc("protected")
				.collection(pin)
				.doc(doc.id);

			batch.set(protectedRef, sensitive);
			deleteSensitiveTripData(data);
		}

		batch.set(collection.doc(doc.id), data, { merge: false });
	}
}

async function _getPinForTrip(tripId: string): Promise<string> {
	const gastosRef = admin.firestore().collection("gastos").doc(tripId);
	const gastosDoc = await gastosRef.get();
	const gastosData = gastosDoc.data();
	return gastosData?.pin ?? "";
}

async function migrateGastos(batch: FirebaseFirestore.WriteBatch) {
	const collection = admin.firestore().collection("gastos");
	const snap = await collection.get();

	snap.forEach((doc) => {
		const data = doc.data();
		const pin = data.pin ?? "";

		const gastosDurante = data.gastosDurante ?? [];
		const gastosPrevios = data.gastosPrevios ?? [];

		if (pin) {
			const protectedRef = admin
				.firestore()
				.collection("protegido")
				.doc(doc.id);
			batch.set(protectedRef, { pin });
		}

		if (!gastosDurante.length && !gastosPrevios.length) {
			batch.delete(collection.doc(doc.id));
		} else if (pin) {
			delete data.pin;
			batch.set(collection.doc(doc.id), data);
		}
	});
}

function getSensitiveTripObject(data: ViagemData) {
	const hospedagens: Record<string, any> = {};
	const transportes: Record<string, any> = {};

	for (const h of data.hospedagens ?? [])
		hospedagens[h.id] = { reserva: h.reserva, link: h.link };
	for (const t of data.transportes?.dados ?? [])
		transportes[t.id] = { reserva: t.reserva, link: t.link };

	if (!Object.keys(hospedagens).length && !Object.keys(transportes).length)
		return {};
	return { hospedagens, transportes, pin: data.pin };
}

function deleteSensitiveTripData(data: ViagemData) {
	if (data.hospedagens) {
		data.hospedagens = data.hospedagens.map((h) => ({
			...h,
			reserva: "",
			link: "",
		}));
	}

	if (data.transportes?.dados) {
		data.transportes.dados = data.transportes.dados.map((t) => ({
			...t,
			reserva: "",
			link: "",
		}));
	}
}
