const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const { transformSync } = require('esbuild');

const clone = (value) => JSON.parse(JSON.stringify(value));
const noop = () => {};

function loadModule(file, dependencies = {}, extra = '') {
	const code = transformSync(fs.readFileSync(`public/assets/ts/${file}`, 'utf8') + extra, {
		loader: 'ts', format: 'cjs',
	}).code;
	const sandbox = {
		module: { exports: {} }, console,
		require: (path) => dependencies[path] || {},
	};
	vm.runInNewContext(code, sandbox);
	return sandbox.module.exports;
}

function editor() {
	const fields = new Map();
	const getID = (id) => {
		if (!fields.has(id)) fields.set(id, {
			value: '', checked: false, style: {}, dataset: {},
			addEventListener: noop, querySelector: () => null,
			setAttribute(name, value) { this[name] = value; },
			removeAttribute(name) { delete this[name]; },
		});
		return fields.get(id);
	};
	return { getID, cloneObject: clone, getChildIDs: () => ['row-1', 'row-2'], getJ: (id) => Number(id.split('-').pop()) };
}

const diff = loadModule('utils/diff.ts');

test('photo-only edits on loaded stays produce independent writes, including after reopening', () => {
	const state = { modules: {}, accommodations: [
		{ id: 'original', name: 'Japan Hotel', images: [{ link: 'original.jpg', description: 'Original' }], dates: {} },
		{ id: 'copy', name: 'Japan Hotel', images: [{ link: 'copy.jpg', description: 'Copy' }], dates: {} },
	] };
	const baseline = clone(state);
	const dom = editor();
	const images = {};
	const existing = loadModule('pages/edit-trip/existing-trip.ts', {
		'../../data/state.js': { getState: () => state },
		'../../utils/dom.js': dom,
		'./new-trip.js': { addAccommodations: noop },
		'./categories/accommodation.js': {
			ACCOMMODATION_IMAGES: images, renderAccommodationImageCarousel: noop,
			loadCheckIn: noop, loadCheckOut: noop,
		},
	}, '\nexport { loadAccommodationData };');
	existing.loadAccommodationData();
	images[1][0].description = 'Updated original';
	images[2].push({ link: 'new-copy.jpg', description: 'New copy' });
	assert.deepEqual(state, baseline, 'editing must preserve the Firestore comparison baseline');
	const edited = state.accommodations.map((stay, i) => ({ ...stay, images: images[i + 1] }));
	assert.deepEqual(clone(diff.computeArrayDiff(state.accommodations, edited).toSet).map((stay) => stay.id), ['original', 'copy']);
	state.accommodations = clone(edited); // simulate the saved data being fetched again
	existing.loadAccommodationData();
	images[1].splice(0, 1);
	assert.equal(state.accommodations[0].images.length, 1);
	assert.deepEqual(clone(diff.computeArrayDiff(state.accommodations,
		state.accommodations.map((stay, i) => ({ ...stay, images: images[i + 1] })),
	).toSet).map((stay) => stay.id), ['original']);
});

test('applying one accommodation snapshot twice retains booking identity and isolates every photo list', () => {
	const dom = editor();
	const images = {};
	const template = { accommodation: {
		name: 'Japan Hotel', address: 'Tokyo', description: 'Room',
		times: { checkIn: '15:00', checkOut: '10:00' },
		images: [{ link: 'snapshot.jpg', description: 'Snapshot' }],
	} };
	const savedTemplate = clone(template);
	const templates = loadModule('pages/edit-trip/categories/trip-template.ts', {
		'../../../utils/dom.js': dom,
		'../../../i18n/translation.js': { translate: (key) => key },
		'../../../ui/fields.js': { markStagedChanges: noop },
		'./accommodation.js': { ACCOMMODATION_IMAGES: images, renderAccommodationImageCarousel: noop },
		'./itinerary-module/inner-itinerary/auto-populate.js': { syncAccommodationItinerary: noop },
	}, '\nexport { applyAccommodationTemplate };');
	for (const i of [1, 2]) {
		dom.getID(`accommodations-id-${i}`).value = `stay-${i}`;
		dom.getID(`reservation-accommodations-${i}`).value = `booking-${i}`;
		dom.getID(`check-in-${i}`).value = `2027-02-1${i}`;
		templates.applyAccommodationTemplate(template, i);
	}
	images[1][0].description = 'First stay';
	images[2].push({ link: 'second-stay.jpg' });
	assert.deepEqual(template, savedTemplate);
	assert.equal(images[2][0].description, 'Snapshot');
	assert.equal(images[1].length, 1);
	template.accommodation.images.length = 0; // deleting/editing the stored snapshot
	assert.equal(images[1][0].description, 'First stay');
	assert.equal(images[2].length, 2);
	for (const i of [1, 2]) {
		assert.equal(dom.getID(`accommodations-id-${i}`).value, `stay-${i}`);
		assert.equal(dom.getID(`reservation-accommodations-${i}`).value, `booking-${i}`);
		assert.equal(dom.getID(`check-in-${i}`).value, `2027-02-1${i}`);
	}
});

test('importing from another trip copies photos without reusing its identity or booking fields', () => {
	const dom = editor();
	const images = {};
	const source = { id: 'source', name: 'Japan Hotel', breakfast: true,
		reservation: 'source-booking', link: 'source-booking-link',
		images: [{ link: 'source.jpg', description: 'Source' }],
	};
	const importer = loadModule('pages/edit-trip/categories/accommodation-import.ts', {
		'../../../utils/dom.js': dom,
		'../../../i18n/translation.js': { translate: (key) => key },
		'../../../ui/fields.js': { markStagedChanges: noop },
		'../../../utils/messages.js': { closeMessage: noop },
		'./accommodation.js': { ACCOMMODATION_IMAGES: images, renderAccommodationImageCarousel: noop },
		'./itinerary-module/inner-itinerary/auto-populate.js': { syncAccommodationItinerary: noop },
	}, '\nexport function importStay(source, index) { TARGET_INDEX = index; SOURCE_ACCOMMODATIONS = { source }; SELECTED_SOURCE_ID = "source"; applyAccommodationImport(); }');
	for (const i of [1, 2]) {
		dom.getID(`accommodations-id-${i}`).value = `stay-${i}`;
		dom.getID(`reservation-accommodations-${i}`).value = `booking-${i}`;
		dom.getID(`reservation-accommodations-link-${i}`).value = `booking-link-${i}`;
		importer.importStay(source, i);
	}
	images[1][0].description = 'First stay';
	images[2].splice(0, 1);
	assert.equal(source.images[0].description, 'Source');
	assert.equal(images[1][0].description, 'First stay');
	for (const i of [1, 2]) {
		assert.equal(dom.getID(`accommodations-id-${i}`).value, `stay-${i}`);
		assert.equal(dom.getID(`reservation-accommodations-${i}`).value, `booking-${i}`);
		assert.equal(dom.getID(`reservation-accommodations-link-${i}`).value, `booking-link-${i}`);
	}
});

test('template normalization freezes source values at snapshot time', () => {
	const service = loadModule('data/services/trip-templates.service.ts');
	const source = { id: 'template', name: 'Hotel', type: 'accommodation', accommodation: {
		name: 'Hotel', times: { checkIn: '14:00' }, images: [{ link: 'source.jpg' }],
	} };
	const snapshot = service.normalizeTripTemplates([source])[0];
	source.accommodation.name = 'Changed source';
	source.accommodation.images[0].link = 'changed.jpg';
	assert.equal(snapshot.accommodation.name, 'Hotel');
	assert.equal(snapshot.accommodation.images[0].link, 'source.jpg');
	snapshot.accommodation.images.length = 0;
	assert.equal(source.accommodation.images.length, 1);
});

test('renaming a saved template preserves its snapshot even if its source changed or was deleted', async () => {
	const dom = editor();
	// No fields exist yet: the creator generates its HTML before binding them.
	const creatorDOM = { ...dom, getID: () => null };
	let reads = 0;
	const sourceTrip = { id: 'source', title: 'Japan', modules: { accommodations: true } };
	const manager = loadModule('pages/home/support/templates.ts', {
		'../../../utils/dom.js': creatorDOM,
		'../../../i18n/translation.js': { translate: (key) => key },
		'../../../data/services/auth.service.js': {
			getUserDestinations: async () => [], getUserTrips: async () => [sourceTrip],
		},
		'../../../data/services/trip.service.js': { getTripRaw: async () => { reads++; return sourceTrip; } },
		'../../../utils/messages.js': { MESSAGE_PROPERTIES: {}, getContainersInput: () => [], displayFullMessage: noop },
		'../../../data/services/trip-templates.service.js': { getCachedTripTemplates: () => [snapshot] },
	}, '\nexport { openTemplateCreator, getTemplateCreatorContent, buildTripSkeletonTemplate, buildAccommodationTemplate };');
	const snapshot = { id: 'template', type: 'trip', name: 'Before', sourceTripId: 'source',
		destinationIds: ['tokyo'], colors: { light: 'saved' }, image: {}, visibility: {} };
	await manager.openTemplateCreator('trip', 'template');
	const html = manager.getTemplateCreatorContent('trip', snapshot);
	assert.match(html, /value=""/);
	assert.doesNotMatch(html, /value="Japan"/);
	const renamed = await manager.buildTripSkeletonTemplate('After', '', ['tokyo'], snapshot);
	assert.equal(renamed.colors.light, 'saved');
	assert.equal(reads, 0, 'metadata edits must not refetch the original');
	const stay = { ...snapshot, type: 'accommodation', accommodation: { images: [{ link: 'saved.jpg' }] } };
	const renamedStay = await manager.buildAccommodationTemplate('After', '', ['tokyo'], '', stay);
	assert.deepEqual(clone(renamedStay.accommodation), stay.accommodation);
});

test('one import icon chooses a menu for two sources and opens a sole source directly', async () => {
	for (const [hasTrips, hasTemplates] of [[true, true], [true, false], [false, true], [false, false]]) {
		const dom = editor();
		let pickedTemplate = 0;
		let pickedTrip = 0;
		const importer = loadModule('pages/edit-trip/categories/accommodation-import.ts', {
			'../../../utils/dom.js': dom,
			'../../../i18n/translation.js': { translate: (key) => key },
			'../../../data/services/auth.service.js': { getUserTrips: async () => hasTrips ? [{ id: 'other', modules: { accommodations: true } }] : [] },
			'../../../data/services/trip-templates.service.js': { getAccommodationTemplates: () => hasTemplates ? [{}] : [] },
			'./trip-template.js': { openAccommodationTemplatePicker: () => pickedTemplate++ },
			'../../../utils/messages.js': { MESSAGE_PROPERTIES: {}, getContainersInput: () => [], displayFullMessage: () => pickedTrip++ },
		});
		await importer.refreshAccommodationImportButtons();
		const button = dom.getID('accommodation-import-button-1');
		button.dataset.index = '1';
		assert.equal(button.style.display, hasTrips || hasTemplates ? '' : 'none');
		assert.equal(button['data-bs-toggle'], hasTrips && hasTemplates ? 'dropdown' : undefined);
		if (hasTemplates && !hasTrips) {
			importer.openAccommodationSource(button);
			assert.equal(pickedTemplate, 1);
		} else if (hasTrips && hasTemplates) {
			importer.openAccommodationSource(button);
			assert.equal(pickedTemplate + pickedTrip, 0);
		} else if (hasTrips) {
			importer.openAccommodationSource(button);
			assert.equal(pickedTrip, 1);
		}
	}
});
