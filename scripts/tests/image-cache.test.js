/**
 * scripts/tests/image-cache.test.js
 *
 * Unit tests for public/sw.js (the cross-origin image cache worker). The
 * service worker is plain browser JS, so it runs inside a `vm` sandbox with an
 * in-memory Cache API, a fake fetch and a fake Request/Response pair.
 *
 * Run: node --test scripts/tests/image-cache.test.js
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const SW_CODE = fs.readFileSync(path.resolve('public/sw.js'), 'utf8');
const ORIGIN = 'https://tripviewer.test';
const IMAGE_URL = 'https://1drv.ms/i/c/abc/def?height=256';

class FakeRequest {
	constructor(input) {
		this.url = typeof input === 'string' ? input : input.url;
		this.method = 'GET';
	}
}

class FakeResponse {
	constructor(body = '', init = {}) {
		this.body = body;
		this.status = init.status ?? 200;
		this.type = init.type ?? 'basic';
		this.ok = this.status >= 200 && this.status < 300;
	}
	clone() {
		return new FakeResponse(this.body, { status: this.status, type: this.type });
	}
	async text() {
		return typeof this.body === 'string' ? this.body : '';
	}
}

class FakeCache {
	constructor() {
		this.map = new Map();
	}
	async match(request) {
		return this.map.get(request.url);
	}
	async put(request, response) {
		this.map.set(request.url, response);
	}
	async delete(request) {
		return this.map.delete(request.url);
	}
	async keys() {
		return [...this.map.keys()].map((url) => new FakeRequest(url));
	}
}

/**
 * @param {(request: FakeRequest) => Promise<FakeResponse>} [fetchImpl]
 */
function createWorker(fetchImpl) {
	const stores = new Map();
	const listeners = {};
	const fetches = [];
	const waiting = [];

	const caches = {
		async open(name) {
			if (!stores.has(name)) stores.set(name, new FakeCache());
			return stores.get(name);
		},
		async keys() {
			return [...stores.keys()];
		},
		async delete(name) {
			return stores.delete(name);
		},
	};

	const self = {
		location: new URL(ORIGIN + '/sw.js'),
		addEventListener(type, handler) {
			listeners[type] = handler;
		},
		skipWaiting() {},
		clients: { async claim() {} },
	};

	const defaultFetch = async (request) => {
		fetches.push(request.url);
		return new FakeResponse('image-bytes', { status: 200, type: 'opaque' });
	};

	const sandbox = {
		self,
		caches,
		Request: FakeRequest,
		Response: FakeResponse,
		URL,
		Date,
		Number,
		Promise,
		console,
		fetch: fetchImpl ?? defaultFetch,
	};
	vm.runInNewContext(SW_CODE, sandbox);

	/**
	 * Dispatch a fetch event and return { intercepted, response, waited }.
	 * `waited` resolves all waitUntil promises (background work).
	 */
	async function dispatchFetch(url, destination = 'image') {
		let responded = null;
		let intercepted = false;
		const event = {
			request: Object.assign(new FakeRequest(url), { destination }),
			respondWith(promise) {
				intercepted = true;
				responded = promise;
			},
			waitUntil(promise) {
				waiting.push(promise);
			},
		};
		listeners.fetch(event);
		const response = intercepted ? await responded : null;
		await Promise.allSettled(waiting.splice(0));
		return { intercepted, response };
	}

	function dispatchMessage(data) {
		const event = {
			data,
			waitUntil(promise) {
				waiting.push(promise);
			},
		};
		listeners.message(event);
	}

	async function flushWaiting() {
		await Promise.allSettled(waiting.splice(0));
	}

	return { stores, fetches, caches, dispatchFetch, dispatchMessage, flushWaiting, listeners };
}

test('caches a cross-origin image on first load and serves it from cache afterwards', async () => {
	const worker = createWorker();

	const first = await worker.dispatchFetch(IMAGE_URL);
	assert.equal(first.intercepted, true);
	assert.equal(first.response.body, 'image-bytes');
	assert.deepEqual(worker.fetches, [IMAGE_URL]);

	const cache = worker.stores.get('tripviewer-media-v1');
	assert.ok(cache, 'image cache was created');
	assert.ok(await cache.match(new FakeRequest(IMAGE_URL)), 'image stored under its original URL');

	const second = await worker.dispatchFetch(IMAGE_URL);
	assert.equal(second.response.body, 'image-bytes');
	assert.deepEqual(worker.fetches, [IMAGE_URL], 'cache hit does not re-download');
});

test('ignores same-origin and non-image requests', async () => {
	const worker = createWorker();

	const local = await worker.dispatchFetch(ORIGIN + '/assets/thing.png');
	assert.equal(local.intercepted, false);

	const script = await worker.dispatchFetch(IMAGE_URL, 'script');
	assert.equal(script.intercepted, false);

	const post = {
		request: Object.assign(new FakeRequest(IMAGE_URL), { destination: 'image', method: 'POST' }),
		respondWith() {
			throw new Error('must not intercept POST');
		},
		waitUntil() {},
	};
	worker.listeners.fetch(post);

	assert.deepEqual(worker.fetches, []);
});

test('serves stale entries immediately and revalidates in the background', async () => {
	const worker = createWorker();
	await worker.dispatchFetch(IMAGE_URL);

	// Age the entry so the worker considers it stale (> 30 days).
	const meta = worker.stores.get('tripviewer-media-meta-v1');
	await meta.put(new FakeRequest(IMAGE_URL), new FakeResponse('0'));

	const stale = await worker.dispatchFetch(IMAGE_URL);
	assert.equal(stale.response.body, 'image-bytes', 'stale copy answers instantly');
	assert.deepEqual(worker.fetches, [IMAGE_URL, IMAGE_URL], 'revalidation refetched once');

	const stamp = await meta.match(new FakeRequest(IMAGE_URL));
	assert.ok(Number(await stamp.text()) > 0, 'timestamp refreshed after revalidation');
});

test('revalidates when no timestamp metadata exists', async () => {
	const worker = createWorker();
	await worker.dispatchFetch(IMAGE_URL);

	// Drop the metadata, keep the image: must revalidate rather than cache forever.
	const meta = worker.stores.get('tripviewer-media-meta-v1');
	await meta.delete(new FakeRequest(IMAGE_URL));

	await worker.dispatchFetch(IMAGE_URL);
	assert.deepEqual(worker.fetches, [IMAGE_URL, IMAGE_URL]);
});

test('does not cache opaqueredirect or partial (206) responses', async () => {
	let mode = 'redirect';
	const worker = createWorker(async () => {
		return mode === 'redirect'
			? new FakeResponse('', { status: 0, type: 'opaqueredirect' })
			: new FakeResponse('partial', { status: 206, type: 'basic' });
	});

	await worker.dispatchFetch(IMAGE_URL);
	let keys = await worker.stores.get('tripviewer-media-v1').keys();
	assert.equal(keys.length, 0, 'redirect not stored');

	mode = 'partial';
	await worker.dispatchFetch(IMAGE_URL);
	keys = await worker.stores.get('tripviewer-media-v1').keys();
	assert.equal(keys.length, 0, '206 not stored');
});

test('evicts a single image on EVICT_IMAGE', async () => {
	const worker = createWorker();
	await worker.dispatchFetch(IMAGE_URL);

	const cache = worker.stores.get('tripviewer-media-v1');
	assert.ok(await cache.match(new FakeRequest(IMAGE_URL)));

	worker.dispatchMessage({ type: 'EVICT_IMAGE', url: IMAGE_URL });
	await worker.flushWaiting();

	assert.equal(await cache.match(new FakeRequest(IMAGE_URL)), undefined, 'image evicted');
});

test('clears every image cache on CLEAR_IMAGE_CACHE', async () => {
	const worker = createWorker();
	await worker.dispatchFetch(IMAGE_URL);
	assert.ok(worker.stores.get('tripviewer-media-v1'));

	worker.dispatchMessage({ type: 'CLEAR_IMAGE_CACHE' });
	await worker.flushWaiting();

	assert.equal(worker.stores.has('tripviewer-media-v1'), false);
	assert.equal(worker.stores.has('tripviewer-media-meta-v1'), false);
});

test('falls back to a plain fetch when cache storage is unavailable', async () => {
	const worker = createWorker();
	worker.caches.open = async () => {
		throw new Error('storage blocked');
	};

	const result = await worker.dispatchFetch(IMAGE_URL);
	assert.equal(result.intercepted, true);
	assert.equal(result.response.body, 'image-bytes');
	assert.deepEqual(worker.fetches, [IMAGE_URL]);
});

test('bounds the cache with FIFO eviction', async () => {
	const worker = createWorker();

	for (let i = 0; i < 401; i++) {
		await worker.dispatchFetch(`https://1drv.ms/i/c/abc/img-${i}`);
	}

	const imageCache = worker.stores.get('tripviewer-media-v1');
	const keys = await imageCache.keys();
	assert.equal(keys.length, 400, 'never grows past MAX_ENTRIES');
	assert.equal(keys.some((key) => key.url.endsWith('img-0')), false, 'oldest entry evicted');
	assert.ok(keys.some((key) => key.url.endsWith('img-400')), 'newest entry kept');
});
