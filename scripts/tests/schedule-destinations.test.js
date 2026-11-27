const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const { transformSync } = require('esbuild');

const code = transformSync(fs.readFileSync('public/assets/ts/utils/schedule-destinations.ts', 'utf8'), {
	loader: 'ts',
	format: 'cjs',
}).code;
const sandbox = { module: { exports: {} } };
vm.runInNewContext(code, sandbox);
const { getScheduleDestinations, getScheduleDestinationOrder } = sandbox.module.exports;
const plain = (value) => JSON.parse(JSON.stringify(value));
const day = (date, destinationIds) => ({ date, destinationIds });

test('calendar recognizes string, current and legacy destination references', () => {
	const itinerary = [day({ year: 2027, month: 2, day: 12 }, [
		'tokyo', { id: 'kyoto', title: 'Kyoto' }, { destinationId: 'osaka', title: 'Osaka' },
		'', null, {}, 'tokyo',
	])];
	assert.deepEqual(plain(getScheduleDestinations(itinerary)), {
		20270212: [{ id: 'tokyo' }, { id: 'kyoto' }, { id: 'osaka' }],
	});
	assert.equal(itinerary[0].destinationIds[0], 'tokyo');
});

test('multiple schedules on one date retain every city without duplicate indicators', () => {
	const date = { year: 2027, month: 2, day: 12 };
	assert.deepEqual(plain(getScheduleDestinations([
		day(date, ['tokyo']), day(date, ['kyoto', 'tokyo']), day(date, []),
	])), { 20270212: [{ id: 'tokyo' }, { id: 'kyoto' }] });
});

test('destination order follows the first visit across months and years', () => {
	const itinerary = [
		day({ year: 2027, month: 3, day: 1 }, ['osaka', 'tokyo']),
		day({ year: 2027, month: 2, day: 12 }, [{ id: 'kyoto' }]),
		day({ year: 2026, month: 12, day: 31 }, [{ destinationId: 'tokyo' }]),
	];
	assert.deepEqual(plain(getScheduleDestinationOrder(itinerary)), ['tokyo', 'kyoto', 'osaka']);
	assert.equal(itinerary[0].date.month, 3);
});

test('an empty or reloaded schedule does not retain previous cities', () => {
	getScheduleDestinations([day({ year: 2027, month: 2, day: 12 }, ['tokyo'])]);
	assert.deepEqual(plain(getScheduleDestinations()), {});
	assert.deepEqual(plain(getScheduleDestinations([
		day({ year: 2027, month: 2, day: 13 }),
	])), { 20270213: [] });
	assert.deepEqual(plain(getScheduleDestinationOrder()), []);
});
