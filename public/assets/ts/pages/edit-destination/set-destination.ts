import { getDestinations } from '../../app/config.js';
import { firstCharToUpperCase, getChildIDs, getID, getJ, getOrCreateCategoryID } from '../../utils/dom.js';
import { getUID } from '../../data/firebase/auth.js';
import { displayError, displayMessage } from '../../utils/messages.js';
import { translate } from "../../i18n/translation.js";
import { getDescription } from "./categories/description.js";
import { FIRESTORE_DESTINATIONS_DATA, FIRESTORE_DESTINATIONS_NEW_DATA, setFirestoreDestinationsNewData } from '../../data/state.js';

export async function buildDestinosObject() {
	setFirestoreDestinationsNewData({
		lanches: buildDestinoCategoryObject("lanches"),
		lojas: buildDestinoCategoryObject("lojas"),
		restaurantes: buildDestinoCategoryObject("restaurantes"),
		saidas: buildDestinoCategoryObject("saidas"),
		turismo: buildDestinoCategoryObject("turismo"),
		titulo: getID("title").value,
		moeda:
			getID("currency").value == "outra"
				? getID("other-currency").value
				: getID("currency").value,
		myMaps: getID("map-link").value,
		modulos: {
			lanches: getID(`enabled-lanches`).checked,
			lojas: getID(`enabled-lojas`).checked,
			mapa: getID("map-enabled").checked,
			restaurantes: getID(`enabled-restaurantes`).checked,
			saidas: getID(`enabled-saidas`).checked,
			turismo: getID(`enabled-turismo`).checked,
		},
		compartilhamento: {
			ativo: true,
			dono:
				FIRESTORE_DESTINATIONS_DATA?.compartilhamento?.dono || (await getUID()),
		},
		versao: {
			ultimaAtualizacao: new Date().toISOString(),
		},
	});
}

function buildDestinoCategoryObject(categoria) {
	const childIDs = getChildIDs(`${categoria}-box`);

	let result = {};

	for (let i = 0; i < childIDs.length; i++) {
		const item: Record<string, any> = {};
		const j = getJ(childIDs[i]);

		const id = getOrCreateCategoryID(categoria, j);
		item.novo = getID(`${categoria}-novo-${j}`).checked;
		item.criadoEm = getID(`${categoria}-criadoEm-${j}`).value;
		item.nome = getID(`${categoria}-nome-${j}`).value;
		item.emoji = getID(`${categoria}-emoji-${j}`).value;
		item.descricao = getDescription(categoria, j);
		item.website = getID(`${categoria}-website-${j}`).value;
		item.instagram = getID(`${categoria}-instagram-${j}`).value;
		item.regiao = getID(`${categoria}-regiao-select-${j}`).value;
		item.mapa = getID(`${categoria}-map-${j}`).value;
		item.midia = getID(`${categoria}-midia-${j}`).value;
		item.nota = getID(`${categoria}-rating-${j}`).value;

		const valor = getID(`${categoria}-valor-${j}`);
		item.valor =
			valor.innerHTML && valor.value != "outro"
				? valor.value
				: getID(`${categoria}-outro-valor-${j}`).value;

		result[id] = item;
	}

	return result;
}

export async function updateTikTokLinks() {
	let toUpdate = false;
	const urls = {};

	const destinationsConfig = getDestinations();
	for (const category of destinationsConfig.categories.tours) {
		const entries = Object.entries(FIRESTORE_DESTINATIONS_NEW_DATA[category]);
		const midias = entries.map(([id, item]: [string, any]) => ({
			id,
			midia: item.midia,
		}));

		if (
			!toUpdate &&
			midias.length > 0 &&
			midias.some((m) => m.midia && isMobileLink(m.midia))
		) {
			toUpdate = true;
		}

		urls[category] = midias;
	}

	if (!toUpdate) return;

	const data = {};
	const unableToConvert = {};

	const CONCURRENCY = 5;
	async function runPool(tasks) {
		const results = [];
		const pool = [];

		for (const task of tasks) {
			const p = task().then((r) => results.push(r));
			pool.push(p);

			if (pool.length >= CONCURRENCY) {
				await Promise.race(pool);
				for (let i = pool.length - 1; i >= 0; i--) {
					if (pool[i].status === "fulfilled" || pool[i].status === "rejected") {
						pool.splice(i, 1);
					}
				}
			}
		}

		await Promise.allSettled(pool);
		return results;
	}

	try {
		for (const categoria of Object.keys(urls)) {
			const newURLs = {};
			const tasks = [];

			for (const { id, midia } of urls[categoria]) {
				tasks.push(async () => {
					let newURL = midia;

					if (midia && isMobileLink(midia)) {
						try {
							const res = await fetch(
								`https://www.tiktok.com/oembed?url=${midia}`,
								{ method: "GET" },
							);

							const innerData = await res.json();

							if (innerData.author_unique_id && innerData.embed_product_id) {
								newURL = `https://www.tiktok.com/@${innerData.author_unique_id}/video/${innerData.embed_product_id}`;
							} else {
								throw new Error("TikTok embed not found");
							}
						} catch (err) {
							unableToConvert[categoria] = unableToConvert[categoria] || [];
							unableToConvert[categoria].push(id);
						}
					}

					newURLs[id] = newURL;
				});
			}
			await runPool(tasks);

			data[categoria] = newURLs;
		}

		if (Object.keys(unableToConvert).length > 0) {
			displayTikTokError(unableToConvert);
			return;
		}

		const destinationsConfig = getDestinations();
		for (const category of destinationsConfig.categories.tours) {
			for (const [id, item] of Object.entries(
				FIRESTORE_DESTINATIONS_NEW_DATA[category],
			) as [string, any][]) {
			if (data[category][id]) {
				item.midia = data[category][id];
				}
			}
		}
	} catch (error) {
		displayError(error);
		console.error(error);
	}

	function isMobileLink(link) {
		return (
			link.startsWith("https://vm.tiktok.com/") ||
			link.startsWith("https://vt.tiktok.com/")
		);
	}

	function displayTikTokError(unableToConvert) {
		const titulo = `${translate("destination.errors.tiktok.conversion")} <i class="iconify" data-icon="mdi:instagram"></i>`;
		let conteudo = `${translate("destination.errors.tiktok.conversion_message")}<br><br>`;
		for (const categoria in unableToConvert) {
			const categoriaTitle = firstCharToUpperCase(categoria);
			conteudo += `<strong>${categoriaTitle}:</strong><br>`;
			for (const index of unableToConvert[categoria]) {
				const item =
					FIRESTORE_DESTINATIONS_NEW_DATA[categoria][index]?.nome ||
					`Item ${index + 1}`;
				conteudo += `${item}<br>`;
			}
		}
		displayMessage(titulo, conteudo);
	}
}
