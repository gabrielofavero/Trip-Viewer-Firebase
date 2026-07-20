import { startLoadingScreen, stopLoadingScreen } from '../utils/loading.js';
import { translate } from '../i18n/translation.js';
import {
	closeMessage,
	displayFullMessage,
	displayPrompt,
	getContainersInput,
	openToast,
	MESSAGE_PROPERTIES,
} from '../utils/messages.js';
import { cloneObject, getID, getTranslatedDocumentLabel } from '../utils/dom.js';
import { getTimestamp } from '../utils/dates.js';
import { get } from '../data/firebase/database.js';
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

	const title = translate('account.backup.title');
	const content = translate('account.backup.prompt');
	displayPrompt({
		title,
		content,
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
		for (const type of ['trips', 'destinations', 'listings']) {
			for (const documentID in USER_DATA[type]) {
				const title = USER_DATA[type][documentID].title;
				jobs.push(getJobObject(title, documentID, type));
			}
		}
	}

	function prepareAdditionalData() {
		const trips = USER_DATA.trips || {};
		for (const documentID in trips) {
			const trip = trips[documentID];

			switch (trip.pin) {
				case 'no-pin':
					if (trip?.modules?.expenses === true)
						jobs.push(getJobObject(trip.title, documentID, 'expenses'));
					break;
				case 'all-data':
				case 'sensitive-only':
					const innerJobs = [];
					if (trip?.modules?.expenses === true) {
						innerJobs.push(getJobObject(trip.title, documentID, 'expenses', 'protected'));
						innerJobs.push(getJobObject(trip.title, documentID, 'protected'));
					}
					if (trip?.modules?.accommodations === true || trip?.modules?.transportation === true)
						innerJobs.push(getJobObject(trip.title, documentID, 'trips', 'protected'));
					protectedJobs.push(getProtectedJobObject(trip.title, documentID, innerJobs));
			}
		}
	}
}

function getJobObject(title, documentID, collection, subpath = '') {
	return { title, documentID, collection, subpath };
}

function getProtectedJobObject(title, documentID, jobs, pin = '') {
	return { title, documentID, jobs, pin };
}

export function displayPinRequestBackup() {
	stopLoadingScreen();
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('trip.basic_information.pin.title');
	properties.containers = getContainersInput();
	properties.content = getContent();
	properties.buttons = [
		{ type: 'cancel' },
		{ type: 'confirm', action: () => backupAccountData(true) },
	];

	displayFullMessage(properties);

	function getContent() {
		const rows: string[] = [];
		for (const protectedJob of MISSING_ACCOUNT_DATA.protected) {
			rows.push(`
				<tr>
					<td class="pin-backup-label">${protectedJob.title}</td>
					<td class="pin-backup-input-cell">
						<input id="${protectedJob.documentID}" type="password" inputmode="numeric" maxlength="4" autocomplete="one-time-code" pattern="[0-9]*" placeholder="0000" class="pin-backup-input" />
					</td>
				</tr>
			`);
		}
		return `
			<p class="pin-backup-instruction">${translate('trip.basic_information.pin.trip_pin.optional')}</p>
			<table class="pin-backup-table">
				${rows.join('')}
			</table>
		`;
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
	const blob = new Blob([jsonStr], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const timestamp = getTimestamp();
	const uid = await getUID();

	const link = document.createElement('a');
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
		openToast(translate('account.backup.success'));
	}
}

function getProtectedJobPins() {
	const inputs = getID('message-description').querySelectorAll('input');
	const ids = Array.from(inputs).map((input) => input.id);

	for (const protectedJob of MISSING_ACCOUNT_DATA.protected) {
		const index = ids.indexOf(protectedJob.documentID);
		if (index === -1) {
			continue;
		}

		const pin = inputs[index].value.trim();
		if (!isNaN(Number(pin)) && pin.length === 4) {
			protectedJob.pin = pin;
		} else if (pin === '') {
			console.warn('Skipping. No PIN provided for trip:', protectedJob.title);
		} else {
			console.warn('Invalid PIN for trip:', protectedJob.title);
			for (const job of protectedJob.jobs) {
				newBackupFail(job, 'not_found');
			}
		}
	}
}

async function getAccountData(useSensitiveData = false) {
	const data = getInitialBaseStructure();
	const jobs = buildMissingJobs(useSensitiveData);
	await loadJobsConcurrently(jobs, data);
	// Load subcollections (accommodations, transportation, itinerary) for each trip
	await loadTripSubcollections(data, useSensitiveData);
	return data;

	function getInitialBaseStructure() {
		return {
			user: {
				destinations: USER_DATA.destinations,
				listings: USER_DATA.listings,
				trips: USER_DATA.trips,
			},
			destinations: {},
			expenses: { protected: {} },
			listings: {},
			protected: {},
			trips: { protected: {} },
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
					subpath: job.subpath === 'protected' ? `protected/${entry.pin}` : job.subpath,
				});
			}
		}

		return list;
	}

	async function loadJobsConcurrently(jobList, store) {
		const promises = jobList.map(async (job) => {
			try {
				const path = `${job.collection}/${job.subpath ? job.subpath + '/' : ''}${job.documentID}`;
				const result = await get(path, true, false);

				if (!result || Object.keys(result).length === 0) return newBackupFail(job, 'not_found');

				deepStore(path, result);
			} catch (err) {
				MISSING_ACCOUNT_DATA;
				console.error('Load job failed:', job, err);
				newBackupFail(job, 'unknown');
			}
		});

		await Promise.allSettled(promises);

		function deepStore(path, value) {
			const keys = path.split('/');
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

/**
 * Fetch all documents from a Firestore collection path.
 * Returns a map of docId → data, or empty object if collection is empty/missing.
 */
async function getCollectionDocs(collectionPath: string): Promise<Record<string, any>> {
	try {
		const snap = await firebase.firestore().collection(collectionPath).get();
		const result: Record<string, any> = {};
		snap.forEach((doc) => {
			result[doc.id] = doc.data();
		});
		return result;
	} catch {
		// Collection may not exist or permission denied — that's OK
		return {};
	}
}

/**
 * After loading all top-level trip documents, also fetch their subcollections
 * (accommodations, transportation, itinerary) and store them under
 * data._subcollections.trips[tripId].
 */
async function loadTripSubcollections(data: Record<string, any>, useSensitiveData: boolean) {
	const scTrips: Record<string, any> = {};

	// Helper to load subs for a trip doc
	async function loadForTrip(tripId: string) {
		const [accommodations, transportation, itinerary] = await Promise.all([
			getCollectionDocs(`trips/${tripId}/accommodations`),
			getCollectionDocs(`trips/${tripId}/transportation`),
			getCollectionDocs(`trips/${tripId}/itinerary`),
		]);

		const entry: Record<string, any> = {};
		if (Object.keys(accommodations).length > 0) entry.accommodations = accommodations;
		if (Object.keys(transportation).length > 0) entry.transportation = transportation;
		if (Object.keys(itinerary).length > 0) entry.itinerary = itinerary;

		if (Object.keys(entry).length > 0) {
			scTrips[tripId] = entry;
		}
	}

	// Public trips
	const tripsData = data.trips;
	if (tripsData && typeof tripsData === 'object') {
		const tripIds = Object.keys(tripsData).filter((k) => k !== 'protected');
		await Promise.allSettled(tripIds.map(loadForTrip));
	}

	// Protected trips
	if (useSensitiveData && tripsData?.protected) {
		for (const [pin, pinData] of Object.entries(tripsData.protected as Record<string, any>)) {
			if (!pinData || typeof pinData !== 'object') continue;
			const protTripIds = Object.keys(pinData);
			await Promise.allSettled(protTripIds.map(loadForTrip));
		}
	}

	if (Object.keys(scTrips).length > 0) {
		if (!data._subcollections) data._subcollections = {};
		data._subcollections.trips = scTrips;
	}
}

function newBackupFail(job, reason) {
	MISSING_ACCOUNT_DATA.failed.push({ job, reason });
}

function displayPartialBackupWarning() {
	const properties = cloneObject(MESSAGE_PROPERTIES);
	properties.title = translate('account.backup.partial.title');
	properties.content = getContent();
	properties.buttons = [{ type: 'close' }];

	displayFullMessage(properties);

	function getContent() {
		const list = [translate('account.backup.partial.message')];
		const protectedDataAdded = [];
		const failedItems = [];

		for (const failed of MISSING_ACCOUNT_DATA.failed) {
			const isProtected =
				failed.job.subpath?.includes('protected') || failed.job.collection === 'protected';

			if (isProtected) {
				if (protectedDataAdded.includes(failed.job.documentID)) continue;
				protectedDataAdded.push(failed.job.documentID);
			}

			const label = isProtected ? 'trips/protected' : failed.job.collection;
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
                ${failedItems.join('<br><br>')}
            </div>
        `;

		// message + scrollable list
		list.push(scrollableContent);

		return list.join('<br><br>');
	}
}
