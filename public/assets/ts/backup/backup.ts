import { startLoadingScreen, stopLoadingScreen } from '../utils/loading.js';
import { translate } from '../i18n/translation.js';
import { closeMessage, displayFullMessage, displayPrompt, getContainersInput, openToast, MESSAGE_PROPERTIES } from '../utils/messages.js';
import { cloneObject, getID, getTranslatedDocumentLabel } from '../utils/dom.js';
import { getTimestamp } from '../utils/dates.js';
import { getUID, USER_DATA } from '../data/firebase/auth.js';

const MISSING_ACCOUNT_DATA = { jobs: [], protected: [], failed: [] };

// Backup
export async function backupOnClickAction() {
	MISSING_ACCOUNT_DATA.jobs = [];
	MISSING_ACCOUNT_DATA.protected = [];
	MISSING_ACCOUNT_DATA.failed = [];

	prepareMissingData();

	if (MISSING_ACCOUNT_DATA.protected.length === 0) {
		backupAccountData(false);
		return;
	}

	const titulo = translate("account.backup.title");
	const conteudo = translate("account.backup.prompt");
	displayPrompt({
		titulo,
		conteudo,
		yesAction: displayPinRequestBackup,
		noAction: () => backupAccountData(false),
	});
}

function prepareMissingData() {
	const jobs = [];
	const protectedJobs = [];

	prepareMainData();
	prepareAdditionalData();

	MISSING_ACCOUNT_DATA.jobs = jobs;
	MISSING_ACCOUNT_DATA.protected = protectedJobs;

	function prepareMainData() {
		for (const type of ["viagens", "destinos", "listagens"]) {
			for (const documentID in USER_DATA[type]) {
				const titulo = USER_DATA[type][documentID].titulo;
				jobs.push(getJobObject(titulo, documentID, type));
			}
		}
	}

	function prepareAdditionalData() {
		const viagens = USER_DATA.viagens || {};
		for (const documentID in viagens) {
			const viagem = viagens[documentID];

			switch (viagem.pin) {
				case "no-pin":
					if (viagem?.modulos?.gastos === true)
						jobs.push(getJobObject(viagem.titulo, documentID, "gastos"));
					break;
				case "all-data":
				case "sensitive-only":
					const innerJobs = [];
					if (viagem?.modulos?.gastos === true) {
						innerJobs.push(
							getJobObject(viagem.titulo, documentID, "gastos", "protected"),
						);
						innerJobs.push(
							getJobObject(viagem.titulo, documentID, "protegido"),
						);
					}
					if (
						viagem?.modulos?.hospedagens === true ||
						viagem?.modulos?.transportes === true
					)
						innerJobs.push(
							getJobObject(viagem.titulo, documentID, "viagens", "protected"),
						);
					protectedJobs.push(
						getProtectedJobObject(viagem.titulo, documentID, innerJobs),
					);
			}
		}
	}
}

function getJobObject(title, documentID, collection, subpath = "") {
	return { title, documentID, collection, subpath };
}

function getProtectedJobObject(title, documentID, jobs, pin = "") {
	return { title, documentID, jobs, pin };
}

export function displayPinRequestBackup() {
	stopLoadingScreen();
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.titulo = translate("trip.basic_information.pin.title");
	properties.containers = getContainersInput();
	properties.conteudo = getContent();
	properties.botoes = [
		{ tipo: "cancelar" },
		{ tipo: "confirmar", acao: () => backupAccountData(true) },
	];

	displayFullMessage(properties);

	function getContent() {
		const content = [translate("trip.basic_information.pin.trip_pin.optional")];
		for (const protectedJob of MISSING_ACCOUNT_DATA.protected) {
			content.push(`
                <div class="nice-form-group">
                    <label>${protectedJob.title}</label>
                    <input id="${protectedJob.documentID}" type="password" inputmode="numeric" maxlength="4" autocomplete="one-time-code" pattern="[0-9]*" placeholder="${translate("trip.basic_information.pin.insert")}" />
                </div>
            `);
		}
		return content.join("");
	}
}

export async function backupAccountData(useSensitiveData = false) {
	if (useSensitiveData) {
		getProtectedJobPins();
	}

	closeMessage();
	startLoadingScreen();
	const accountData = await getAccountData(useSensitiveData);
	const jsonStr = JSON.stringify(accountData, null, 2);
	const blob = new Blob([jsonStr], { type: "application/json" });
	const url = URL.createObjectURL(blob);

	const timestamp = getTimestamp();
	const uid = await getUID();

	const link = document.createElement("a");
	link.href = url;
	link.download = `${timestamp}-tripviewer-backup-${uid}.json`;
	document.body.appendChild(link);
	link.click();

	document.body.removeChild(link);
	URL.revokeObjectURL(url);
	stopLoadingScreen();

	if (MISSING_ACCOUNT_DATA.failed.length > 0) {
		displayPartialBackupWarning();
	} else {
		openToast(translate("account.backup.success"));
	}
}

function getProtectedJobPins() {
	const inputs = getID("message-description").querySelectorAll("input");
	const ids = Array.from(inputs).map((input) => input.id);

	for (const protectedJob of MISSING_ACCOUNT_DATA.protected) {
		const index = ids.indexOf(protectedJob.documentID);
		if (index === -1) {
			continue;
		}

		const pin = inputs[index].value.trim();
		if (!isNaN(Number(pin)) && pin.length === 4) {
			protectedJob.pin = pin;
		} else if (pin === "") {
			console.warn("Skipping. No PIN provided for trip:", protectedJob.title);
		} else {
			console.warn("Invalid PIN for trip:", protectedJob.title);
			for (const job of protectedJob.jobs) {
				newBackupFail(job, "not_found");
			}
		}
	}
}

async function getAccountData(useSensitiveData = false) {
	const data = getInitialBaseStructure();
	const jobs = buildMissingJobs(useSensitiveData);
	await loadJobsConcurrently(jobs, data);
	return data;

	function getInitialBaseStructure() {
		return {
			usuario: {
				destinos: USER_DATA.destinos,
				listagens: USER_DATA.listagens,
				viagens: USER_DATA.viagens,
			},
			destinos: {},
			gastos: { protected: {} },
			listagens: {},
			protegido: {},
			viagens: { protected: {} },
		};
	}

	function buildMissingJobs(includeSensitive) {
		const list = [...MISSING_ACCOUNT_DATA.jobs];

		if (!includeSensitive) return list;

		for (const entry of MISSING_ACCOUNT_DATA.protected) {
			if (!entry.pin) continue;
			for (const job of entry.jobs) {
				list.push({
					title: job.title,
					collection: job.collection,
					documentID: job.documentID,
					subpath:
						job.subpath === "protected"
							? `protected/${entry.pin}`
							: job.subpath,
				});
			}
		}

		return list;
	}

	async function loadJobsConcurrently(jobList, store) {
		const promises = jobList.map(async (job) => {
			try {
				const path = `${job.collection}/${job.subpath ? job.subpath + "/" : ""}${job.documentID}`;
				const result = await get(path, true, false);

				if (!result || Object.keys(result).length === 0)
					return newBackupFail(job, "not_found");

				deepStore(path, result);
			} catch (err) {
				MISSING_ACCOUNT_DATA;
				console.error("Load job failed:", job, err);
				newBackupFail(job, "unknown");
			}
		});

		await Promise.allSettled(promises);

		function deepStore(path, value) {
			const keys = path.split("/");
			let current = store;

			for (let i = 0; i < keys.length - 1; i++) {
				const key = keys[i];
				if (!(key in current)) current[key] = {};
				current = current[key];
			}

			current[keys[keys.length - 1]] = value;
		}
	}
}

function newBackupFail(job, reason) {
	MISSING_ACCOUNT_DATA.failed.push({ job, reason });
}

function displayPartialBackupWarning() {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.titulo = translate("account.backup.partial.title");
	properties.conteudo = getContent();
	properties.botoes = [{ tipo: "fechar" }];

	displayFullMessage(properties);

	function getContent() {
		const list = [translate("account.backup.partial.message")];
		const protectedDataAdded = [];
		const failedItems = [];

		for (const failed of MISSING_ACCOUNT_DATA.failed) {
			const isProtected =
				failed.job.subpath?.includes("protected") ||
				failed.job.collection === "protegido";

			if (isProtected) {
				if (protectedDataAdded.includes(failed.job.documentID)) continue;
				protectedDataAdded.push(failed.job.documentID);
			}

			const label = isProtected ? "viagens/protected" : failed.job.collection;
			const type = getTranslatedDocumentLabel(label);

			failedItems.push(
				`<b>${failed.job.title}</b><br>${translate(
					`account.backup.partial.reason.${failed.reason}`,
					{ type },
				)}`,
			);
		}

		const scrollableContent = `
            <div class="partial-backup-scroll">
                ${failedItems.join("<br><br>")}
            </div>
        `;

// message + scrollable list
		list.push(scrollableContent);

		return list.join("<br><br>");
	}
}
