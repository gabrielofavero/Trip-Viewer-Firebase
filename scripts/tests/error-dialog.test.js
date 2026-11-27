const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { test } = require('node:test');
const { transformSync } = require('esbuild');

const code = transformSync(fs.readFileSync('public/assets/ts/utils/messages.ts', 'utf8'), {
	loader: 'ts',
	format: 'cjs',
}).code;

function setup(online) {
	const sandbox = {
		module: { exports: {} },
		Error,
		navigator: { onLine: online },
		require: () => ({ translate: (key) => key }),
		document: {
			createElement: () => ({
				appendChild() {},
				setAttribute() {},
				addEventListener(type, callback) { this[type] = callback; },
			}),
		},
		window: { location: { reload() { sandbox.reloaded = true; } } },
	};
	vm.runInNewContext(code, sandbox);
	return { ...sandbox.module.exports, sandbox };
}

test('Firestore offline wording while online reports service failure and preserves diagnostics', () => {
	const dialog = setup(true);
	const error = Object.assign(new Error('Failed to get document because the client is offline.'), {
		code: 'unavailable',
	});
	assert.equal(dialog.isOfflineError(error), false);
	assert.equal(dialog.isSystemFault(error), true);
	assert.equal(dialog.getErrorMessage(error), 'messages.errors.service_unavailable');
});

test('a network failure when the browser reports offline shows the connection message', () => {
	const dialog = setup(false);
	const error = Object.assign(new Error('Network request failed'), { code: 'auth/network-request-failed' });
	assert.equal(dialog.isOfflineError(error), true);
	assert.equal(dialog.isSystemFault(error), false);
	assert.equal(dialog.getErrorMessage(error), 'messages.errors.offline');
	assert.equal(dialog.isOfflineError(new Error('Invalid data')), false);
});

test('both retry identifiers create a working reload action', () => {
	for (const type of ['tryAgain', 'try-again']) {
		const dialog = setup(true);
		const button = dialog.getButton({ type });
		assert.equal(button.id, 'message-try-again');
		assert.match(button.innerHTML, /labels.try_again/);
		button.click();
		assert.equal(dialog.sandbox.reloaded, true);
	}
});
