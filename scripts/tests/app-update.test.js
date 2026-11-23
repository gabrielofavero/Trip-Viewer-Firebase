const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { buildSync } = require('esbuild');
const { hashAssets } = require('../build/hash-assets.js');

function build(t, files) {
	const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tripviewer-update-'));
	t.after(() => {
		assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
		fs.rmSync(root, { recursive: true, force: true });
	});
	for (const [file, text] of Object.entries(files)) {
		const target = path.join(root, file);
		fs.mkdirSync(path.dirname(target), { recursive: true });
		fs.writeFileSync(target, text);
	}
	hashAssets(root);
	const result = {};
	for (const file of fs.readdirSync(root, { recursive: true })) {
		if (fs.statSync(path.join(root, file)).isFile()) {
			result[file.replaceAll(path.sep, '/')] = fs.readFileSync(path.join(root, file), 'utf8');
		}
	}
	return result;
}

function filename(files, stem) {
	return Object.keys(files).find((file) => file.startsWith(stem + '.'));
}

test('JSON-only deploy invalidates config, its importers and all rewritten cache keys', (t) => {
	const files = {
		'entry.js': 'import "./config.js";',
		'config.js':
			'export const load = () => fetch("/assets/json/colors.json"); const cache = {}; cache["/assets/json/colors.json"] = 1;',
		'assets/json/colors.json': '{"color":"old"}',
		'unrelated.js': 'console.log("unchanged");',
	};
	const before = build(t, files);
	const after = build(t, { ...files, 'assets/json/colors.json': '{"color":"new"}' });
	for (const stem of ['config', 'entry', 'assets/json/colors']) {
		assert.notEqual(filename(before, stem), filename(after, stem), stem);
	}
	const config = after[filename(after, 'config')];
	assert.equal(config.split(filename(after, 'assets/json/colors')).length - 1, 2);
	assert.equal(filename(before, 'unrelated'), filename(after, 'unrelated'));
	assert.deepEqual(build(t, files), before, 'identical input produces identical output');
});

test('circular importers all change when a dependency on one side changes', (t) => {
	const files = {
		'a.js': 'import "./b.js"; import "./c.js";',
		'b.js': 'import "./a.js";',
		'c.js': 'export const value = 1;',
	};
	const before = build(t, files);
	const after = build(t, { ...files, 'c.js': 'export const value = 2;' });
	for (const stem of ['a', 'b', 'c']) {
		assert.notEqual(filename(before, stem), filename(after, stem), stem);
	}
	for (const file of Object.keys(before)) {
		if (file in after)
			assert.equal(before[file], after[file], 'immutable URLs must keep identical bytes');
	}
});

const configCode = buildSync({
	entryPoints: [path.resolve('public/assets/ts/app/config.ts')],
	bundle: true,
	write: false,
	platform: 'node',
	format: 'cjs',
}).outputFiles[0].text;

function loadConfig(fetch, staticMode = false) {
	const sandbox = {
		exports: {},
		module: { exports: {} },
		fetch,
		window: { TRIPVIEWER_STATIC: staticMode },
	};
	vm.runInNewContext(configCode, sandbox);
	return sandbox.module.exports;
}

test('a cached HTML response is retried from network before accepting valid JSON', async () => {
	const requests = [];
	const config = loadConfig(async (url, options) => {
		requests.push({ url, options });
		return requests.length === 1
			? new Response('<html>home</html>', { headers: { 'content-type': 'text/html' } })
			: Response.json({ theme: 'new' });
	});
	assert.equal((await config.loadColors()).theme, 'new');
	assert.equal(requests[1].options.cache, 'reload');
	assert.equal(config.getColors().theme, 'new');
	await config.loadColors();
	assert.equal(requests.length, 2, 'successful JSON stays in memory');
});

test('missing, malformed and HTML assets yield actionable startup errors', async () => {
	for (const response of [
		() => new Response('not found', { status: 404 }),
		() => new Response('{broken', { headers: { 'content-type': 'application/json' } }),
		() => new Response('<html>home</html>', { headers: { 'content-type': 'text/html' } }),
		() => Response.json(null),
	]) {
		const config = loadConfig(async () => response());
		await assert.rejects(config.loadColors(), (error) => {
			assert.equal(error.name, 'ConfigLoadError');
			assert.equal(error.startupAssetFailure, true);
			assert.match(error.message, /\/assets\/json\/colors\.json/);
			return true;
		});
		assert.equal(config.getColors(), undefined);
	}
});

test('static config URLs remain relative to the exported page', async () => {
	let requested;
	const config = loadConfig(async (url) => {
		requested = url;
		return Response.json({});
	}, true);
	await config.loadColors();
	assert.equal(requested, 'assets/json/colors.json');
});

const recoveryCode = fs.readFileSync('public/assets/js/startup-recovery.js', 'utf8');
function recovery({
	attempted = false,
	blockedStorage = false,
	staticMode = false,
	offline = false,
	cacheRejects = false,
} = {}) {
	const listeners = {};
	const elements = [];
	const navigations = [];
	const storage = new Map();
	const deleted = [];
	let unregistered = 0;
	const element = () => ({
		children: [],
		style: {},
		setAttribute() {},
		appendChild(child) {
			this.children.push(child);
		},
		addEventListener(name, action) {
			this[name] = action;
		},
		replaceChildren(child) {
			this.children = [child];
		},
	});
	const host = element();
	const window = {
		TRIPVIEWER_STATIC: staticMode,
		caches: {
			keys: async () => {
				if (cacheRejects) throw new Error('blocked');
				return ['old-app'];
			},
			delete: async (key) => deleted.push(key),
		},
		addEventListener(name, callback) {
			listeners[name] = callback;
		},
	};
	const location = {
		href: 'https://tripviewer.test/edit/trip?t=trip-id#details',
		replace(url) {
			navigations.push(url);
		},
	};
	if (attempted) {
		const url = new URL(location.href);
		url.searchParams.set('__tv_recovery', '1');
		location.href = url.href;
	}
	const sandbox = {
		window,
		location,
		URL,
		console: { error() {} },
		setTimeout(callback) {
			callback();
		},
		navigator: {
			language: 'pt-BR',
			onLine: !offline,
			serviceWorker: {
				getRegistrations: async () => [
					{
						unregister: async () => {
							unregistered++;
						},
					},
				],
			},
		},
		localStorage: { getItem: () => null },
		sessionStorage: {
			getItem(key) {
				if (blockedStorage) throw new Error('blocked');
				return storage.get(key);
			},
			setItem(key, value) {
				if (blockedStorage) throw new Error('blocked');
				storage.set(key, value);
			},
			removeItem(key) {
				storage.delete(key);
			},
		},
		history: {
			state: {},
			replaceState(_state, _title, url) {
				location.href = url;
			},
		},
		document: {
			body: host,
			getElementById: () => host,
			createElement() {
				const node = element();
				elements.push(node);
				return node;
			},
		},
	};
	vm.runInNewContext(recoveryCode, sandbox);
	return {
		api: window.TripViewerStartup,
		sandbox,
		navigations,
		storage,
		deleted,
		elements,
		listeners,
		unregistered: () => unregistered,
	};
}

test('recovery clears browser caches and reloads once while preserving trip params', async () => {
	const context = recovery();
	await context.api.recover(new Error('obsolete JSON'));
	assert.deepEqual(context.deleted, ['old-app']);
	assert.equal(context.unregistered(), 1);
	const url = new URL(context.navigations[0]);
	assert.ok(url.searchParams.has('__tv_recovery'));
	assert.equal(url.searchParams.get('t'), 'trip-id');
	assert.equal(url.hash, '#details');
	await context.api.recover(new Error('another concurrent failure'));
	assert.equal(context.navigations.length, 1);
});

test('repeated failure stops the loop and provides a localized, working manual retry', async () => {
	const context = recovery({ attempted: true, blockedStorage: true });
	await context.api.recover(new Error('still broken'));
	assert.equal(context.navigations.length, 0);
	const button = context.elements.find((node) => node.type === 'button');
	assert.equal(button.textContent, 'Limpar cache e tentar novamente');
	await button.click();
	assert.equal(context.navigations.length, 1);
});

test('blocked storage and failed Cache API cannot prevent recovery navigation', async () => {
	const context = recovery({ blockedStorage: true, cacheRejects: true });
	await context.api.recover(new Error('broken'));
	assert.equal(context.navigations.length, 1);
});

test('offline failures and static exports never trigger automatic cache clearing', async () => {
	for (const options of [{ offline: true }, { staticMode: true }]) {
		const context = recovery(options);
		await context.api.recover(new Error('offline'));
		assert.equal(context.navigations.length, 0);
		assert.deepEqual(context.deleted, []);
	}
});

test('successful startup removes recovery markers; module failures are caught before startup', async () => {
	const context = recovery({ attempted: true });
	context.api.complete();
	assert.equal(new URL(context.sandbox.location.href).searchParams.has('__tv_recovery'), false);
	context.listeners.error({ target: { tagName: 'SCRIPT', type: 'module', src: 'old-entry.js' } });
	assert.equal(
		context.navigations.length,
		0,
		'later runtime errors do not trigger startup recovery',
	);
	const failed = recovery();
	failed.listeners.error({ target: { tagName: 'SCRIPT', type: 'module', src: 'old-entry.js' } });
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(failed.navigations.length, 1);
});
