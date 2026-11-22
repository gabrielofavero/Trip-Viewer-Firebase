#!/usr/bin/env node
/**
 * resolve-images.mjs — fills missing entry images in a destination document.
 *
 * Tiered, no paid API by default:
 *   Tier 1  Google Maps photos via the local scraper (http://127.0.0.1:8788/scrape) — use --maps
 *   Tier 2  official website og:image / twitter:image
 *   Tier 3  Wikipedia / Wikimedia (keyless REST), thumbnail upgraded to 1280px
 *
 * Usage:
 *   node resolve-images.mjs --dest <destId> [--dry-run | --apply]
 *                           [--maps] [--max 1] [--only tourism|restaurants|snacks|nightlife|shopping]
 *                           [--project trip-viewer-prd]
 *
 * --dry-run (default) prints the plan; --apply patches ONLY the categories that
 * changed (+ version + the user destinationSummary version).
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ------------------------------------------------------------------ args

const argv = process.argv.slice(2);
const arg = (name, fallback = '') => {
	const i = argv.indexOf(name);
	return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const flag = (name) => argv.includes(name);

const PROJECT = arg('--project', process.env.FIREBASE_PROJECT || 'trip-viewer-prd');
const DEST = arg('--dest');
const APPLY = flag('--apply');
const USE_MAPS = flag('--maps');
const WIKI_ALL = flag('--wiki-all');
const MAX_PER_ENTRY = Number(arg('--max', '1'));
const ONLY = arg('--only');
const MAPS_SERVER = process.env.GMAPS_SCRAPER_URL || 'http://127.0.0.1:8788';
const CATEGORIES = ['tourism', 'restaurants', 'snacks', 'nightlife', 'shopping'];

if (!DEST) {
	console.error('Missing --dest <destId>');
	process.exit(1);
}

const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST || '';
const BASE = EMULATOR
	? `http://${EMULATOR}/v1/projects/${PROJECT}/databases/(default)/documents`
	: `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// ------------------------------------------------------------------ auth

function readFirebaseToolsConfig() {
	const candidates = [
		path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json'),
		path.join(process.env.APPDATA || '', 'configstore', 'firebase-tools.json'),
		path.join(process.env.LOCALAPPDATA || '', 'configstore', 'firebase-tools.json'),
	];
	for (const p of candidates) if (p && fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
	throw new Error('firebase-tools config not found — run `firebase login` first.');
}

async function getAccessToken() {
	if (EMULATOR) return 'owner';
	const cfg = readFirebaseToolsConfig();
	const body = new URLSearchParams({
		grant_type: 'refresh_token',
		refresh_token: cfg.tokens.refresh_token,
		client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
		client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
	}).toString();
	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body,
	});
	const json = await res.json();
	if (!json.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(json)}`);
	return json.access_token;
}

let TOKEN = '';
const authHeaders = async () => ({ Authorization: `Bearer ${TOKEN || (TOKEN = await getAccessToken())}` });

// ------------------------------------------------- typed value conversion

const toValue = (v) => {
	if (v === null || v === undefined) return { nullValue: null };
	if (typeof v === 'boolean') return { booleanValue: v };
	if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
	if (typeof v === 'string') return { stringValue: v };
	if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
	return { mapValue: { fields: toFields(v) } };
};
const toFields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toValue(v)]));

const fromValue = (v) => {
	if (!v || typeof v !== 'object') return null;
	if ('nullValue' in v) return null;
	if ('booleanValue' in v) return v.booleanValue;
	if ('integerValue' in v) return Number(v.integerValue);
	if ('doubleValue' in v) return v.doubleValue;
	if ('stringValue' in v) return v.stringValue;
	if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
	if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
	return null;
};
const fromFields = (f) => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, fromValue(v)]));

// ---------------------------------------------------------------- REST

async function rest(method, urlPath, body) {
	const res = await fetch(`${BASE}${urlPath}`, {
		method,
		headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`HTTP ${res.status} ${method} ${urlPath}: ${text.slice(0, 500)}`);
	return text ? JSON.parse(text) : null;
}

async function getDoc(docPath) {
	const res = await rest('GET', `/${docPath}`);
	return { id: res.name.split('/').pop(), data: fromFields(res.fields) };
}

async function patchDoc(docPath, plain) {
	const keys = Object.keys(plain);
	const mask = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
	return rest('PATCH', `/${docPath}?${mask}`, { fields: toFields(plain) });
}

// ---------------------------------------------------------- web helpers

const UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
/** Wikimedia throttles generic browser UAs — it wants a descriptive, contactable one. */
const WIKI_UA = 'TripViewerDestinations/1.0 (personal trip planner; https://trip-viewer.com)';

async function fetchText(url, timeoutMs = 15000, attempt = 1, userAgent = UA) {
	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': userAgent, 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' },
			redirect: 'follow',
			signal: AbortSignal.timeout(timeoutMs),
		});
		// Wikimedia/Firestore-adjacent hosts throttle bursts with 429 + Retry-After.
		if ((res.status === 429 || res.status >= 500) && attempt <= 3) {
			const wait = Math.min(Number(res.headers.get('retry-after')) || attempt * 4, 20);
			await new Promise((resolve) => setTimeout(resolve, wait * 1000));
			return fetchText(url, timeoutMs, attempt + 1, userAgent);
		}
		if (!res.ok) return '';
		return await res.text();
	} catch {
		return '';
	}
}

function metaImage(html) {
	if (!html) return '';
	const patterns = [
		/<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
		/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
		/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
		/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
		/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
	];
	for (const p of patterns) {
		const m = html.match(p);
		if (m) return m[1].replace(/&amp;/g, '&').trim();
	}
	return '';
}

function upgradeWikiThumb(url) {
	if (!url) return '';
	const clean = url.split('?')[0];
	return clean.replace(/\/(\d+)px-/, '/1280px-');
}

/**
 * Google place photos come back as `…=w408-h544-k-no` (thumbnail size).
 * Rewriting the size segment to `=w1600-h1200` yields the same photo at a
 * card-friendly resolution (verified: 200 + image/jpeg).
 */
function upgradeGoogleThumb(url) {
	if (!url) return '';
	if (!/googleusercontent\.com|ggpht\.com/.test(url)) return url;
	return url.replace(/=w\d+-h\d+/, '=w1600-h1200');
}

// Serialize Wikipedia traffic: its API returns 429 under bursts, and the
// retry/backoff inside fetchText only works if we stop hammering it.
let wikiChain = Promise.resolve();
function wikiFetch(url) {
	const run = wikiChain.then(() => fetchText(url, 15000, 1, WIKI_UA));
	const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
	wikiChain = run.then(pause, pause);
	return run;
}

async function wikipediaImage(name, regions) {
	const queries = [
		[`${name} ${regions?.[0] || ''}`.trim(), 'en'],
		[name, 'en'],
		[name, 'pt'],
	];
	for (const [query, lang] of queries) {
		const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json`;
		const raw = await wikiFetch(searchUrl);
		if (!raw) continue;
		let title = '';
		try {
			title = JSON.parse(raw)?.query?.search?.[0]?.title || '';
		} catch {
			continue;
		}
		if (!title) continue;
		const summary = await wikiFetch(
			`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`,
		);
		if (!summary) continue;
		let json;
		try {
			json = JSON.parse(summary);
		} catch {
			continue;
		}
		const thumb = json?.thumbnail?.source || json?.originalimage?.source || '';
		if (thumb) return { url: upgradeWikiThumb(thumb), source: `Wikipedia (${lang}) — ${json.title}` };
	}
	return null;
}

async function mapsImages(mapUrl) {
	if (!mapUrl) return [];
	try {
		const health = await fetch(`${MAPS_SERVER}/health`, { signal: AbortSignal.timeout(3000) });
		if (!health.ok) return [];
	} catch {
		return []; // Docker/scraper not running — Tier 1 unavailable
	}
	try {
		const res = await fetch(`${MAPS_SERVER}/scrape`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ urls: [mapUrl], lang: 'en' }),
			signal: AbortSignal.timeout(180000),
		});
		if (!res.ok) return [];
		const json = await res.json();
		const raw = json?.places?.[0]?.imageUrls || [];
		return [...new Set(raw.map(upgradeGoogleThumb))];
	} catch {
		return [];
	}
}

async function validateImage(url) {
	if (!url || !/^https:/i.test(url)) return null;
	try {
		const res = await fetch(url, {
			headers: { 'User-Agent': UA, Accept: 'image/*,*/*' },
			redirect: 'follow',
			signal: AbortSignal.timeout(20000),
		});
		if (!res.ok) return null;
		const type = res.headers.get('content-type') || '';
		const bytes = (await res.arrayBuffer()).byteLength;
		if (!type.startsWith('image/')) return null;
		if (bytes < 10000) return null; // tracking pixel / placeholder
		return { url, type, bytes };
	} catch {
		return null;
	}
}

// ------------------------------------------------------------------ main

// Resumable progress cache: a full Maps pass takes ~1 min/place, so a
// crash/interrupt must not redo the work already paid for.
const CACHE_PATH = path.join(process.env.TMP || os.tmpdir(), `resolve-images-${DEST}.cache.json`);
function loadCache() {
	try {
		return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
	} catch {
		return {};
	}
}
function saveCache(cache) {
	try {
		fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
		fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 1));
	} catch {
		/* cache is best-effort */
	}
}

async function main() {
	const { data: doc } = await getDoc(`destinations/${DEST}`);
	const owner = doc.sharing?.owner || '';
	const resolved = loadCache();
	const usedUrls = new Set([
		...CATEGORIES.flatMap((c) =>
			Object.values(doc[c] || {}).flatMap((e) => (e.images || []).map((i) => i.link)),
		),
		...Object.values(resolved).flatMap((images) => (images || []).map((i) => i.link)),
	]);

	const targets = [];
	for (const category of CATEGORIES) {
		if (ONLY && ONLY !== category) continue;
		for (const [id, entry] of Object.entries(doc[category] || {})) {
			if (Array.isArray(entry.images) && entry.images.length > 0) continue;
			if (resolved[`${category}/${id}`]?.length) continue; // already resolved in a previous run
			targets.push({ category, id, entry });
		}
	}

	console.log(
		`Destination ${DEST} — ${targets.length} pending, ${Object.keys(resolved).length} already resolved (cache: ${CACHE_PATH})\n`,
	);
	if (!targets.length) {
		console.log('Nothing left to resolve.');
		await applyResolved();
		return;
	}

	const unresolved = [];
	const rows = [];
	// Tier 1 (Maps) is rate-limited and must stay sequential; tiers 2/3 are plain
	// HTTP and can be fanned out.
	const CONCURRENCY = Math.max(1, Number(arg('--concurrency', USE_MAPS ? '1' : '6')));

	// Phase A — fetch + validate candidates. Parallel when no Maps tier is used.
	async function gather(target) {
		const { entry } = target;
		const candidates = [];

		if (USE_MAPS) {
			for (const url of (await mapsImages(entry.map)).slice(0, MAX_PER_ENTRY + 2)) {
				candidates.push({ url, source: 'Google Maps (local scraper)' });
			}
		}
		if (entry.website) {
			const og = metaImage(await fetchText(entry.website));
			if (og) candidates.push({ url: og, source: 'site oficial (og:image)' });
		}
		// Wikipedia is reliable for landmarks/shops and unreliable for food & bars
		// (a chain or a same-named dish can win the search). Opt back in with --wiki-all.
		const wikiAllowed = WIKI_ALL || target.category === 'tourism' || target.category === 'shopping';
		if (wikiAllowed) {
			const wiki = await wikipediaImage(entry.name, entry.regions);
			if (wiki) candidates.push({ url: wiki.url, source: wiki.source });
		}

		const valid = [];
		for (const candidate of candidates) {
			if (valid.length >= MAX_PER_ENTRY + 2) break;
			const checked = await validateImage(candidate.url);
			if (checked) valid.push({ url: checked.url, source: candidate.source });
		}
		return valid;
	}

	const gathered = new Array(targets.length);
	let cursor = 0;
	let done = 0;
	const worker = async () => {
		while (cursor < targets.length) {
			const index = cursor++;
			gathered[index] = await gather(targets[index]);
			done++;
			if (process.stdout.isTTY) process.stdout.write(`\r${done}/${targets.length}…`);
		}
	};
	await Promise.all(Array.from({ length: CONCURRENCY }, worker));

	// Phase B — pick + cache, sequential so the dedupe set stays deterministic.
	for (const [index, target] of targets.entries()) {
		const { category, id, entry } = target;
		const picked = [];
		for (const candidate of gathered[index] || []) {
			if (picked.length >= MAX_PER_ENTRY) break;
			if (usedUrls.has(candidate.url)) continue;
			picked.push({ description: `${entry.name} — ${candidate.source}`, link: candidate.url });
			usedUrls.add(candidate.url);
		}

		if (picked.length) {
			resolved[`${category}/${id}`] = picked;
			saveCache(resolved);
			rows.push({ category, name: entry.name, source: picked[0].description.split(' — ')[1] });
		} else {
			unresolved.push({ category, name: entry.name, website: entry.website || '(none)' });
		}
	}

	console.log('\n');
	if (rows.length) console.table(rows);
	if (unresolved.length) {
		console.log(`\nNo image found for ${unresolved.length} entries:`);
		console.table(unresolved);
	}

	if (!APPLY) {
		console.log('\nDry run — nothing written. Re-run with --apply to patch.');
		return;
	}
	await applyResolved();

	/** Firestore field paths need backticks for keys that are not simple identifiers. */
	const fieldSegment = (segment) =>
		/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(segment) ? segment : `\`${segment.replace(/`/g, '\\`')}\``;

	async function applyResolved() {
		// CRITICAL: patch one entry at a time (`<category>.<entryId>`), never the
		// category map. `updateMask.fieldPaths=<category>` REPLACES the whole map
		// and silently deletes every entry that is not in the payload.
		// (Verified: `<category>.<entryId>` → 200 and sibling entries untouched.)
		const maskPaths = [];
		const payload = {};
		let changed = 0;
		for (const [key, images] of Object.entries(loadCache())) {
			const [category, id] = key.split('/');
			const entry = doc[category]?.[id];
			if (!entry || !images?.length) continue;
			if (JSON.stringify(entry.images || []) === JSON.stringify(images)) continue;
			payload[category] ||= {};
			payload[category][id] = { ...entry, images };
			maskPaths.push(`${fieldSegment(category)}.${fieldSegment(id)}`);
			changed++;
		}
		if (!changed) {
			console.log('Nothing to apply.');
			return;
		}

		const now = new Date().toISOString();
		payload.version = { lastUpdated: now };
		maskPaths.push('version');

		const mask = maskPaths.map((p) => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');
		await rest('PATCH', `/destinations/${DEST}?${mask}`, { fields: toFields(payload) });
		console.log(`\nPatched images for ${changed} entries + version`);

		if (owner) {
			try {
				await patchDoc(`users/${owner}/destinationSummaries/${DEST}`, { version: { lastUpdated: now } });
				console.log(`Summary version synced for ${owner}`);
			} catch (err) {
				console.log(`Summary sync skipped (${err.message.slice(0, 120)})`);
			}
		}

		// Never leave corrupted text behind
		const serialized = JSON.stringify(payload);
		if (serialized.includes('\uFFFD')) console.warn('⚠ U+FFFD found in the payload — re-check the data.');
	}
}

main().catch((err) => {
	console.error(`[ERROR] ${err.message}`);
	process.exit(1);
});
