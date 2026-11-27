const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const { transformSync } = require('esbuild');
const colors = JSON.parse(fs.readFileSync('public/assets/json/colors.json', 'utf8'));

function setup() {
	const elements = new Map();
	function element(id = '') {
		const classes = new Set();
		const listeners = {};
		let html = '';
		const node = {
			get id() { return id; },
			set id(value) { id = value; elements.set(value, node); },
			style: {
				setProperty(name, value) { this[name] = value; },
				removeProperty(name) { delete this[name]; },
				getPropertyValue(name) { return this[name] || ''; },
			}, children: [], listeners,
			classList: {
				add: (...names) => names.forEach((name) => classes.add(name)),
				remove: (...names) => names.forEach((name) => classes.delete(name)),
				contains: (name) => classes.has(name),
			},
			addEventListener: (name, callback) => { listeners[name] = callback; },
			appendChild: (child) => node.children.push(child),
			get innerHTML() { return html; },
			set innerHTML(value) {
				html = value;
				node.children = [];
				for (const tag of value.matchAll(/<[^>]+id="([^"]+)"[^>]*>/g)) {
					const child = element(tag[1]);
					const classNames = tag[0].match(/class="([^"]+)"/);
					if (classNames) child.classList.add(...classNames[1].split(' '));
				}
			},
		};
		if (id) elements.set(id, node);
		return node;
	}
	const getID = (id) => elements.get(id) || element(id);
	const document = {
		addEventListener() {},
		createElement: () => element(),
		createTextNode: (text) => ({ text }),
		querySelectorAll: () => [],
		getElementsByClassName: (name) => [...elements.values()].filter((node) => node.classList.contains(name)),
	};
	const date = (day, month = 2) => ({ year: 2027, month, day });
	const trip = {
		modules: { itinerary: true, destinations: true },
		start: date(12), end: date(2, 3),
		destinations: [
			{ id: 'osaka', title: 'Osaka', categories: { tourism: false } },
			{ id: 'tokyo', title: 'Tokyo', categories: { tourism: true } },
		],
		itinerary: [
			{ date: date(1, 3), destinationIds: ['osaka'] },
			{ date: date(12), destinationIds: ['tokyo'] },
		],
	};
	const state = {
		getState: () => trip,
		DESTINATIONS: [],
		setDestinations(value) { state.DESTINATIONS = value; },
	};
	const customSelect = {
		CUSTOM_SELECTS: {},
		loadCustomSelect(settings) {
			customSelect.CUSTOM_SELECTS[settings.id] = settings;
			settings.action(settings.activeOption);
		},
	};
	const modules = {
		'static-mode.js': { isStaticMode: () => false },
		'state.js': state,
		'dom.js': { getID, getChildIDs: () => [], getURLParam: () => null },
		'dates.js': {
			convertFromDateObject: (value) => new Date(Date.UTC(value.year, value.month - 1, value.day)),
			getDateNoTime: (value) => value.getTime(),
			getTodayDateObject: () => ({ year: 2026, month: 11, day: 26 }),
			getMonth: (month) => String(month),
		},
		'translation.js': { translate: (key) => key },
		'custom-select.js': customSelect,
		'config.js': { getColors: () => colors, getDestinations: () => ({
			categories: { general: ['tourism'] }, translation: { tourism: 'tourism' },
			boxes: [{ color: 'blue', d: '' }], icons: { tourism: '' },
		}) },
	};
	function load(name, path, extra = '') {
		const module = { exports: {} };
		modules[name] = module.exports;
		const code = transformSync(fs.readFileSync(path, 'utf8') + extra, { loader: 'ts', format: 'cjs' }).code;
		vm.runInNewContext(code, {
			module, document, window: { addEventListener() {} }, console,
			require: (specifier) => new Proxy({}, {
				get: (_, key) => modules[specifier.split('/').pop()]?.[key],
			}),
		});
		modules[name] = module.exports;
		return module.exports;
	}
	const root = 'public/assets/ts/';
	load('colors.js', root + 'theme/colors.ts');
	load('schedule-destinations.js', root + 'utils/schedule-destinations.ts');
	// Live bindings for the calendar/view circular imports.
	for (const name of ['view.js', 'calendar.js', 'itinerary-module.js']) modules[name] = {};
	const schedule = load('itinerary-module.js', root + 'pages/trip-detail/categories/itinerary-module/itinerary-module.ts');
	const calendar = load('calendar.js', root + 'pages/trip-detail/categories/itinerary-module/calendar.ts');
	load('destination.js', root + 'pages/trip-detail/categories/destination.ts');
	const view = load('view.js', root + 'pages/trip-detail/view.ts', '\nmodule.exports.renderModules = loadModules;');
	view.START_DATE.date = new Date(Date.UTC(2027, 1, 12));
	view.END_DATE.date = new Date(Date.UTC(2027, 2, 2));
	return { view, schedule, calendar, trip, state, getID, elements, customSelect };
}

test('cold trip load renders city legend before the destination selector initializes', () => {
	const app = setup();
	app.view.renderModules();
	assert.match(app.getID('pill-box').innerHTML, /Tokyo/);
	assert.match(app.getID('pill-box').innerHTML, /Osaka/);
	assert.equal(app.getID('pill-box').style.display, '');
	assert.equal(app.getID('pill-circle-tokyo').style.getPropertyValue('--schedule-color-light'), colors.options[0].hex);
	assert.equal(app.getID('pill-circle-osaka').style.getPropertyValue('--schedule-color-dark'), colors.options[1].dark);
});

test('legend interactions color the matching dates and survive changing month', () => {
	const app = setup();
	app.view.renderModules();
	app.getID('pill-tokyo').listeners.mouseenter();
	assert.equal(app.getID('calendarTrip-12-2-2027').classList.contains('active-calendar'), true);
	assert.equal(app.getID('calendarTrip-12-2-2027').style.getPropertyValue('--schedule-color-light'), colors.options[0].hex);
	assert.equal(app.getID('calendarTrip-13-2-2027').classList.contains('active-calendar'), false);
	app.getID('pill-tokyo').listeners.mouseleave();
	assert.equal(app.getID('calendarTrip-12-2-2027').classList.contains('active-calendar'), false);
	app.getID('pill-tokyo').listeners.mouseenter();
	assert.equal(app.getID('pill-circle-tokyo').classList.contains('active-circle'), true);
	assert.equal(app.getID('pill-circle-tokyo').classList.contains('pill-circle'), true);
	app.getID('pill-tokyo').listeners.mouseleave();
	app.getID('pill-osaka').listeners.click();
	app.calendar.calendarNext();
	assert.equal(app.getID('calendarTrip-1-3-2027').classList.contains('active-calendar'), true);
	assert.equal(app.getID('calendarTrip-1-3-2027').style.getPropertyValue('--schedule-color-dark'), colors.options[1].dark);
	app.calendar.calendarPrevious();
	app.calendar.calendarNext();
	assert.equal(app.getID('calendarTrip-1-3-2027').classList.contains('active-calendar'), true);
	app.getID('pill-osaka').listeners.click();
	assert.equal(app.getID('calendarTrip-1-3-2027').classList.contains('active-calendar'), false);
});

test('shared dates keep a pinned city color when another city stops hovering', () => {
	const app = setup();
	app.trip.itinerary.push({ date: { year: 2027, month: 2, day: 12 }, destinationIds: ['osaka'] });
	app.view.renderModules();
	app.getID('pill-tokyo').listeners.click();
	app.getID('pill-osaka').listeners.mouseenter();
	const day = app.getID('calendarTrip-12-2-2027');
	assert.equal(day.style.getPropertyValue('--schedule-color-light'), colors.options[1].hex);
	app.getID('pill-osaka').listeners.mouseleave();
	assert.equal(day.classList.contains('active-calendar'), true);
	assert.equal(day.style.getPropertyValue('--schedule-color-light'), colors.options[0].hex);
	app.getID('pill-tokyo').listeners.click();
	assert.equal(day.classList.contains('active-calendar'), false);
});

test('every configured palette color highlights dates and repeats after the last preset', () => {
	const app = setup();
	app.trip.destinations = colors.options.concat(colors.options[0]).map((color, index) => ({ id: `city-${index}`, title: color.color }));
	app.trip.itinerary = app.trip.destinations.map((city) => ({ date: { year: 2027, month: 2, day: 12 }, destinationIds: [city.id] }));
	app.view.renderModules();
	const day = app.getID('calendarTrip-12-2-2027');
	for (let index = 0; index < app.trip.destinations.length; index++) {
		const color = colors.options[index % colors.options.length];
		const pill = app.getID(`pill-city-${index}`);
		pill.listeners.mouseenter();
		assert.equal(day.classList.contains('active-calendar'), true);
		assert.equal(day.style.getPropertyValue('--schedule-color-light'), color.hex);
		assert.equal(day.style.getPropertyValue('--schedule-color-dark'), color.dark);
		pill.listeners.mouseleave();
		assert.equal(day.classList.contains('active-calendar'), false);
	}
});

test('first scheduled destination remains selected and its categories are rendered', () => {
	const app = setup();
	app.view.renderModules();
	const select = app.customSelect.CUSTOM_SELECTS['destinations-select'];
	assert.equal(select.activeOption, 'tokyo');
	assert.match(app.getID('destinationsBox').innerHTML, /destination.tourism.title/);
});
