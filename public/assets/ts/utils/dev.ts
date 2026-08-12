/**
 * Dev Mode utility.
 *
 * When running on localhost, a global `dev` object is exposed on `window`.
 * It supports nested namespaces — just assign: `dev.page.myVar = ...`
 *
 * Built-in namespaces:
 *   dev.firestore.get("path")         — read a Firestore document
 *   dev.firestore.set("path", {})     — write a Firestore document
 *   dev.messages.show(title, content)  — show a message modal
 *   dev.messages.error(err)           — show an error message
 *   dev.messages.close()              — close the current message
 *   dev.messages.toast(text)          — show a toast notification
 *
 * Usage in console:
 *   dev.help()     — show commands
 *   dev.list()     — list all dev variables (recursive)
 *   dev.page.foo   — inspect any variable directly
 */

// ---------- internal sentinel ----------
const BUILTINS = new Set(['help', 'list', 'isEnabled', 'host', 'firestore', 'messages', 'places']);
const STORE_KEY = Symbol('store');
const GETTER_KEY = Symbol('getter');

// ---------- helpers ----------
function typeLabel(val: any): string {
	const t = typeof val;
	if (t !== 'object' || val === null) return t;
	if (Array.isArray(val)) return `array(${val.length})`;
	if (val instanceof Map) return `Map(${val.size})`;
	if (val instanceof Set) return `Set(${val.size})`;
	if (typeof (val as any)[STORE_KEY] === 'object') return 'namespace';
	return 'object';
}

// ---------- localhost detection ----------
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function isLocalhost(): boolean {
	const host = window.location.hostname;
	if (LOCAL_HOSTS.has(host)) return true;
	if (
		host.startsWith('192.168.') ||
		host.startsWith('10.') ||
		/^172\.(1[6-9]|2\d|3[01])\./.test(host)
	)
		return true;
	return false;
}

// ---------- recursive namespace proxy factory ----------
interface Namespace {
	[STORE_KEY]: Record<string, any>;
}

function createNamespace(parentPath: string): Namespace & { [key: string]: any } {
	const store: Record<string | symbol, any> = {};

	const proxy = new Proxy({} as any, {
		get(_target, prop: string | symbol) {
			if (prop === STORE_KEY) return store;
			// resolve getter wrapper
			const raw = store[prop];
			if (raw && typeof raw === 'object' && GETTER_KEY in raw) {
				return (raw as any)[GETTER_KEY]();
			}
			// already a leaf value? return it
			if (prop in store && !(raw && typeof raw === 'object' && STORE_KEY in raw)) {
				return raw;
			}
			// auto-create nested namespace
			if (!(prop in store) && typeof prop === 'string') {
				store[prop] = createNamespace(parentPath ? `${parentPath}.${prop}` : prop);
			}
			return store[prop];
		},
		set(_target, prop: string | symbol, value: any) {
			if (prop === STORE_KEY) return true;
			store[prop] = value;
			return true;
		},
		defineProperty(_target, prop: string, descriptor: PropertyDescriptor) {
			if (typeof descriptor.get === 'function') {
				store[prop] = { [GETTER_KEY]: descriptor.get };
			} else if ('value' in descriptor) {
				store[prop] = descriptor.value;
			}
			return true;
		},
		has(_target, prop: string | symbol) {
			if (prop === STORE_KEY) return true;
			return prop in store;
		},
		ownKeys() {
			return Object.keys(store);
		},
		getOwnPropertyDescriptor() {
			return { enumerable: true, configurable: true };
		},
		apply(_target, _thisArg, _args: any[]) {
			const label = parentPath || 'dev';
			const keys = Object.keys(store);
			if (keys.length === 0) {
				console.log(
					`%c[DEV]%c %c${label}%c — no variables set yet.`,
					'color:#f0c040;font-weight:bold;',
					'',
					'font-weight:bold;',
					'',
				);
				return;
			}
			console.group(
				`%c[DEV]%c %c${label}%c variables`,
				'color:#f0c040;font-weight:bold;',
				'',
				'font-weight:bold;',
				'',
			);
			listTree(store, parentPath || '', 0);
			console.groupEnd();
			console.log(
				`%c💡 Tip: %ctype %c${label}.<name>%c to inspect any value.`,
				'color:#f0c040;',
				'',
				'font-weight:bold;',
				'',
			);
		},
	});

	return proxy;
}

// ---- list helpers ----
function listTree(store: Record<string, any>, prefix: string, indent: number): void {
	const keys = Object.keys(store).sort();
	const pad = '  '.repeat(indent);
	for (const key of keys) {
		const val = store[key];
		if (val && typeof val === 'object' && GETTER_KEY in val) {
			const resolved = (val as any)[GETTER_KEY]();
			console.log(
				`${pad}%c${key}%c : %c${typeLabel(resolved)}%c =`,
				'font-weight:bold;',
				'',
				'color:#4caf50;',
				'',
				resolved,
			);
		} else if (val && typeof val === 'object' && STORE_KEY in val) {
			console.log(`${pad}%c${key}/%c`, 'font-weight:bold;color:#f0c040;', '');
			listTree(val[STORE_KEY], prefix ? `${prefix}.${key}` : key, indent + 1);
		} else {
			console.log(`${pad}%c${key}%c : %c${typeLabel(val)}`, 'font-weight:bold;', '', 'color:#888;');
		}
	}
}

// ---------- message helpers ----------
import {
	displayMessage,
	displayError,
	closeMessage,
	openToast,
	displayPrompt,
	displayFullMessage,
} from './messages.js';

function createMessagesNs(): any {
	const ns = createNamespace('messages');

	ns.show = function (title?: string, content?: string): void {
		displayMessage(title, content);
	};

	ns.error = function (err: any, tryAgain = false): void {
		displayError(err, tryAgain);
	};

	ns.close = function (): void {
		closeMessage();
	};

	ns.toast = function (text: string): void {
		openToast(text);
	};

	ns.prompt = function (options?: any): void {
		displayPrompt(options);
	};

	ns.full = function (properties?: any): void {
		displayFullMessage(properties);
	};

	return ns;
}

// ---------- firestore helpers ----------
import { getStats, resetCounters } from '../data/firebase/counter.js';

function createFirestoreNs(): any {
	const ns = createNamespace('firestore');

	ns.get = async function (path: string): Promise<any> {
		try {
			const snapshot = await firebase.firestore().doc(path).get();
			if (snapshot.exists) {
				console.log('%c[FS GET]%c', 'color:#4caf50;font-weight:bold;', '', path);
				return snapshot.data();
			}
			console.warn(`%c[FS GET]%c not found: ${path}`, 'color:#f0c040;font-weight:bold;', '');
			return undefined;
		} catch (err: any) {
			console.error(`%c[FS GET]%c ${path}`, 'color:red;font-weight:bold;', '', err);
			throw err;
		}
	};

	ns.set = async function (path: string, data: Record<string, any>): Promise<void> {
		try {
			await firebase.firestore().doc(path).set(data, { merge: true });
			console.log('%c[FS SET]%c', 'color:#4caf50;font-weight:bold;', '', path, data);
		} catch (err: any) {
			console.error(`%c[FS SET]%c ${path}`, 'color:red;font-weight:bold;', '', err);
			throw err;
		}
	};

	// Firestore read/write counter (accessible via dev.firestore.stats)
	Object.defineProperty(ns, 'stats', {
		get() {
			return getStats();
		},
		enumerable: true,
		configurable: true,
	});

	ns.resetStats = resetCounters;

	return ns;
}

// ---------- places helpers (Places API + gmaps-scraper call counter) ----------
import {
	getPlacesStats,
	resetPlacesStats,
} from '../data/services/places-counter.js';
import type { PlacesApiCall, GscraperCall } from '../data/services/places-counter.js';

/**
 * Per-route Places API breakdown: how many times each route was called and,
 * for search/details, how many asked for photos (true) vs not (false). The
 * dedicated 'photos' route always returns photos — it sends no flag, so it
 * only counts toward the route total, never the photos buckets.
 */
function buildPlacesApiBreakdown(calls: PlacesApiCall[]): {
	total: number;
	routes: Record<
		string,
		{
			count: number;
			photosTrue: number;
			photosFalse: number;
			calls: { subject: string; photos: boolean }[];
		}
	>;
} {
	const routes: Record<
		string,
		{
			count: number;
			photosTrue: number;
			photosFalse: number;
			calls: { subject: string; photos: boolean }[];
		}
	> = {
		search: { count: 0, photosTrue: 0, photosFalse: 0, calls: [] },
		details: { count: 0, photosTrue: 0, photosFalse: 0, calls: [] },
		photos: { count: 0, photosTrue: 0, photosFalse: 0, calls: [] },
	};
	for (const call of calls) {
		const bucket = routes[call.route];
		if (!bucket) continue;
		bucket.count += 1;
		if (call.route !== 'photos') {
			if (call.photos) bucket.photosTrue += 1;
			else bucket.photosFalse += 1;
		}
		bucket.calls.push({ subject: call.subject, photos: call.photos });
	}
	return { total: calls.length, routes };
}

/**
 * gmaps-scraper breakdown: how many scrape requests were made and what they
 * were (each request carries the Google Maps URLs it scraped).
 */
function buildGscraperBreakdown(calls: GscraperCall[]): {
	total: number;
	routes: { urls: string[] }[];
	urlCount: number;
	urls: string[];
} {
	return {
		total: calls.length,
		routes: calls.map((call) => ({ urls: [...call.urls] })),
		urlCount: calls.reduce((sum, call) => sum + call.urls.length, 0),
		urls: calls.flatMap((call) => call.urls),
	};
}

function createPlacesNs(): any {
	const ns = createNamespace('places');

	// All recorded calls (raw — see data/services/places-counter.ts).
	Object.defineProperty(ns, 'stats', {
		get() {
			return getPlacesStats();
		},
		enumerable: true,
		configurable: true,
	});

	// Places API breakdown: the routes called + photos true/false counts.
	Object.defineProperty(ns, 'placesApi', {
		get() {
			return buildPlacesApiBreakdown(getPlacesStats().placesApi);
		},
		enumerable: true,
		configurable: true,
	});

	// gmaps-scraper breakdown: how many requests and what was scraped.
	Object.defineProperty(ns, 'gscraper', {
		get() {
			return buildGscraperBreakdown(getPlacesStats().gscraper);
		},
		enumerable: true,
		configurable: true,
	});

	ns.reset = resetPlacesStats;

	return ns;
}

// ---------- public interface ----------
export interface DevHost {
	isEnabled: true;
	host: string;
	firestore: {
		get(path: string): Promise<any>;
		set(path: string, data: Record<string, any>): Promise<void>;
		stats: {
			reads: number;
			writes: number;
			readPaths: string[];
			writeOps: { type: string; path: string }[];
		};
		resetStats(): void;
		[key: string]: any;
	};
	places: {
		stats: {
			placesApi: { route: string; photos: boolean; subject: string }[];
			gscraper: { urls: string[] }[];
		};
		placesApi: {
			total: number;
			routes: Record<
				string,
				{
					count: number;
					photosTrue: number;
					photosFalse: number;
					calls: { subject: string; photos: boolean }[];
				}
			>;
		};
		gscraper: {
			total: number;
			routes: { urls: string[] }[];
			urlCount: number;
			urls: string[];
		};
		reset(): void;
		[key: string]: any;
	};
	messages: {
		show(title?: string, content?: string): void;
		error(err: any, tryAgain?: boolean): void;
		close(): void;
		toast(text: string): void;
		prompt(options?: any): void;
		full(properties?: any): void;
	};
	help(): void;
	list(): void;
	[key: string]: any;
}

export function initDev(): DevHost | null {
	if (!isLocalhost()) return null;

	const rootNs = createNamespace('');

	// ---- pre-populate namespaces ----
	(rootNs as any).firestore = createFirestoreNs();
	(rootNs as any).messages = createMessagesNs();
	(rootNs as any).places = createPlacesNs();

	const rootStore = (rootNs as any)[STORE_KEY] as Record<string, any>;

	const helpFn = function (): void {
		console.log(
			`%c🔧 TripViewer Dev Mode %cACTIVE %c(on ${window.location.hostname})`,
			'font-size:14px;font-weight:bold;',
			'color:#4caf50;font-weight:bold;',
			'color:#aaa;',
		);
		console.log('  %cdev.help()%c            — show this message', 'font-weight:bold;', '');
		console.log(
			'  %cdev.list()%c            — list all dev variables (recursive)',
			'font-weight:bold;',
			'',
		);
		console.log('  %cdev.page.foo%c          — inspect a page variable', 'font-weight:bold;', '');
		console.log('  %cdev.firestore.get()%c   — read a Firestore document', 'font-weight:bold;', '');
		console.log(
			'  %cdev.firestore.set()%c   — write a Firestore document',
			'font-weight:bold;',
			'',
		);
		console.log(
			'  %cdev.firestore.stats%c   — show read/write counts for this page',
			'font-weight:bold;',
			'',
		);
		console.log(
			'  %cdev.firestore.resetStats()%c — reset read/write counters',
			'font-weight:bold;',
			'',
		);
		console.log(
			'  %cdev.places.stats%c       — all Places API + gmaps-scraper calls',
			'font-weight:bold;',
			'',
		);
		console.log(
			'  %cdev.places.placesApi%c   — Places API routes + photos true/false',
			'font-weight:bold;',
			'',
		);
		console.log(
			'  %cdev.places.gscraper%c    — gmaps-scraper requests + what was scraped',
			'font-weight:bold;',
			'',
		);
		console.log(
			'  %cdev.places.reset()%c     — reset Places call counters',
			'font-weight:bold;',
			'',
		);
		console.log('  %cdev.messages.show()%c  — show a message modal', 'font-weight:bold;', '');
		console.log('  %cdev.messages.error()%c — show an error message', 'font-weight:bold;', '');
		console.log('  %cdev.messages.close()%c — close the current message', 'font-weight:bold;', '');
		console.log('  %cdev.messages.toast()%c — show a toast', 'font-weight:bold;', '');
	};

	const listFn = function (): void {
		const keys = Object.keys(rootStore).filter((k) => !BUILTINS.has(k));
		if (keys.length === 0) {
			console.log('%c[DEV]%c No variables set yet.', 'color:#f0c040;font-weight:bold;', '');
			return;
		}
		// Build a filtered store excluding built-in namespaces (firestore, messages, etc.)
		const filtered: Record<string, any> = {};
		for (const k of keys) filtered[k] = rootStore[k];

		console.group(`%c[DEV]%c variables`, 'color:#f0c040;font-weight:bold;', '');
		listTree(filtered, '', 0);
		console.groupEnd();
		console.log(
			'%c💡 Tip: %ctype %cdev.<name>%c to inspect any value.',
			'color:#f0c040;',
			'',
			'font-weight:bold;',
			'',
			'font-weight:bold;',
			'',
		);
	};

	const dev = new Proxy(rootNs as any, {
		get(_target, prop: string) {
			if (prop === 'isEnabled') return true;
			if (prop === 'host') return window.location.hostname;
			if (prop === 'help') return helpFn;
			if (prop === 'list') return listFn;
			return (rootNs as any)[prop];
		},
		set(_target, prop: string, value: any) {
			if (BUILTINS.has(prop)) return true;
			(rootNs as any)[prop] = value;
			return true;
		},
	});

	(window as any).dev = dev;

	console.log(
		`%c🔧 DEV MODE %c• ${window.location.hostname} %c• type %cdev.help()%c for commands`,
		'color:#f0c040;font-weight:bold;',
		'color:#aaa;',
		'',
		'font-weight:bold;color:#4caf50;',
		'',
	);

	return dev as any;
}
