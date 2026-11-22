#!/usr/bin/env node
/**
 * scripts/images-backfill.mjs — unattended Google-Maps image backfill.
 *
 * Runs the local Docker scraper (gosom/google-maps-scraper) once per place,
 * collects/validates photos and either patches Firestore entry-by-entry or
 * writes a patch file for manual review.
 *
 * Designed to run for hours without an agent:
 *  - resume state (never re-scrapes a resolved place)
 *  - retries with exponential backoff + global cooldown on rate-limit
 *  - per-entry Firestore PATCH (`<category>.<entryId>`), never category maps
 *  - automatic backup + post-write integrity check (restores on any loss)
 *  - SIGINT-safe (finishes the current place, saves state, exits)
 *
 * Usage:
 *   node scripts/images-backfill.mjs                      # all destinations, write
 *   node scripts/images-backfill.mjs --dest <id>          # one destination
 *   node scripts/images-backfill.mjs --to-file patch.json # don't write, dump JSON
 *   node scripts/images-backfill.mjs --limit 5 --dry-run  # sample, no writes
 *
 * Options:
 *   --dest <id>        destination id (repeatable); default: all
 *   --limit <n>        stop after n resolved places overall
 *   --max <n>          images per entry (default 1)
 *   --retries <n>      attempts per place before marking it failed (default 3)
 *   --cooldown <min>   wait after a rate-limit hit (default 10)
 *   --delay <seconds>  pause between places, with ±25% jitter (default 0)
 *   --to-file <path>   write {"destId": {category: {entryId: entry}}} JSON instead of patching
 *   --queries <path>   per-entry input overrides {"<destId>/<cat>/<entryId>": {url?, query?}}
 *   --dry-run          scrape nothing, only list what is missing
 *   --skip-failed      never retry a place marked failed in the state file
 *   --no-guard         skip the title/name check (curated names in another language)
 *   --project <id>     Firestore project (default trip-viewer-prd)
 *
 * Files (gitignored):
 *   tmp/image-backfill/state.json               progress + results
 *   tmp/image-backfill/backups/<dest>-<ts>.json pre-write document copies
 *   tmp/image-backfill/run-<timestamp>.log      full log
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

// ------------------------------------------------------------------ options

const argv = process.argv.slice(2);
const has = (name) => argv.includes(name);
const val = (name, fallback = '') => {
	const i = argv.indexOf(name);
	return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const allVal = (name) => argv.flatMap((a, i) => (a === name && argv[i + 1] ? [argv[i + 1]] : []));

const PROJECT = val('--project', process.env.FIREBASE_PROJECT || 'trip-viewer-prd');
const DESTS = allVal('--dest');
const LIMIT = Number(val('--limit', '0')) || Infinity;
const MAX_IMAGES = Number(val('--max', '1'));
const RETRIES = Number(val('--retries', '3'));
const COOLDOWN_MIN = Number(val('--cooldown', '10'));
const SCRAPE_TIMEOUT_MS = Number(val('--timeout', '150')) * 1000;
const DELAY_S = Number(val('--delay', '0')) || 0;
const TO_FILE = val('--to-file');
const DRY_RUN = has('--dry-run');
const SKIP_FAILED = has('--skip-failed');
const NO_GUARD = has('--no-guard');
const QUERIES_FILE = val('--queries');
const ONLY_OVERRIDES = has('--only-overrides');
const QUERY_OVERRIDES =
	QUERIES_FILE && fs.existsSync(QUERIES_FILE) ? JSON.parse(fs.readFileSync(QUERIES_FILE, 'utf-8')) : {};

const CATS = ['tourism', 'restaurants', 'snacks', 'nightlife', 'shopping'];
const DOCKER_IMAGE = process.env.GMAPS_SCRAPER_IMAGE || 'gosom/google-maps-scraper';
const DOCKER_VOLUME = process.env.GMAPS_SCRAPER_VOLUME || 'gmaps-playwright-cache';
const DOCKER_CONCURRENCY = process.env.GMAPS_SCRAPER_CONCURRENCY || '2';
const UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const WIKI_UA = 'TripViewerDestinations/1.0 (personal trip planner; https://trip-viewer.com)';

const WORK_DIR = path.join('tmp', 'image-backfill');
const STATE_PATH = path.join(WORK_DIR, 'state.json');
const BACKUP_DIR = path.join(WORK_DIR, 'backups');
fs.mkdirSync(BACKUP_DIR, { recursive: true });

const RUN_TS = new Date().toISOString().replace(/[:.]/g, '-');
const LOG_PATH = path.join(WORK_DIR, `run-${RUN_TS}.log`);
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' });

function log(...args) {
	const line = `[${new Date().toISOString()}] ${args.join(' ')}`;
	console.log(line);
	logStream.write(`${line}\n`);
}

// ------------------------------------------------------------------ state

const state = fs.existsSync(STATE_PATH) ? JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8')) : { entries: {} };
state.entries ||= {};
function saveState() {
	fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 1));
}

// ------------------------------------------------------------------ firestore

function readFirebaseToolsConfig() {
	const candidates = [
		path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json'),
		path.join(process.env.APPDATA || '', 'configstore', 'firebase-tools.json'),
		path.join(process.env.LOCALAPPDATA || '', 'configstore', 'firebase-tools.json'),
	];
	for (const p of candidates) if (p && fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
	throw new Error('firebase-tools config not found — run `firebase login` first.');
}

const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
let TOKEN = '';
let TOKEN_AT = 0;
const TOKEN_TTL_MS = 45 * 60 * 1000; // refresh well before the 1 h expiry

async function getToken(force = false) {
	if (!force && TOKEN && Date.now() - TOKEN_AT < TOKEN_TTL_MS) return TOKEN;
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
	TOKEN = json.access_token;
	TOKEN_AT = Date.now();
	return TOKEN;
}

/** fetch with auth + one automatic token refresh on 401. */
async function authedFetch(url, options = {}) {
	const doFetch = async (token) =>
		fetch(url, {
			...options,
			headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
		});
	let res = await doFetch(await getToken());
	if (res.status === 401) {
		log('    token expired — refreshing and retrying');
		res = await doFetch(await getToken(true));
	}
	return res;
}

const fromValue = (v) => {
	if (!v || typeof v !== 'object') return null;
	if ('nullValue' in v) return null;
	if ('booleanValue' in v) return v.booleanValue;
	if ('integerValue' in v) return Number(v.integerValue);
	if ('doubleValue' in v) return v.doubleValue;
	if ('stringValue' in v) return v.stringValue;
	if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
	if ('mapValue' in v) {
		const o = {};
		for (const [k, val] of Object.entries(v.mapValue.fields || {})) o[k] = fromValue(val);
		return o;
	}
	return null;
};
const fromFields = (f) => Object.fromEntries(Object.entries(f || {}).map(([k, v]) => [k, fromValue(v)]));
const toValue = (v) => {
	if (v === null || v === undefined) return { nullValue: null };
	if (typeof v === 'boolean') return { booleanValue: v };
	if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
	if (typeof v === 'string') return { stringValue: v };
	if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
	return { mapValue: { fields: toFields(v) } };
};
const toFields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toValue(v)]));

async function getDoc(destId) {
	const res = await authedFetch(`${BASE}/destinations/${destId}`);
	if (!res.ok) throw new Error(`GET destinations/${destId}: HTTP ${res.status}`);
	const json = await res.json();
	return { id: destId, data: fromFields(json.fields), updateTime: json.updateTime };
}

/** Firestore field paths need backticks for keys that are not simple identifiers (ids can start with a digit). */
const fieldSegment = (segment) =>
	/^[a-zA-Z_][a-zA-Z_0-9]*$/.test(segment) ? segment : `\`${segment.replace(/`/g, '\\`')}\``;

/** PATCHes one entry per updateMask path — never a category map. */
async function patchEntries(destId, updates) {
	const maskPaths = [];
	const payload = {};
	for (const { category, entryId, entry } of updates) {
		payload[category] ||= {};
		payload[category][entryId] = entry;
		maskPaths.push(`${fieldSegment(category)}.${fieldSegment(entryId)}`);
	}
	const now = new Date().toISOString();
	payload.version = { lastUpdated: now };
	maskPaths.push('version');

	const mask = maskPaths.map((p) => `updateMask.fieldPaths=${encodeURIComponent(p)}`).join('&');
	const res = await authedFetch(`${BASE}/destinations/${destId}?${mask}`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ fields: toFields(payload) }),
	});
	if (!res.ok) throw new Error(`PATCH ${destId}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
	return now;
}

async function syncSummary(ownerUid, destId) {
	if (!ownerUid) return;
	const now = new Date().toISOString();
	await authedFetch(`${BASE}/users/${ownerUid}/destinationSummaries/${destId}?updateMask.fieldPaths=version`, {
		method: 'PATCH',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ fields: toFields({ version: { lastUpdated: now } }) }),
	});
}

// ------------------------------------------------------------------ docker

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function run(cmd, args, timeoutMs) {
	return new Promise((resolve) => {
		const child = spawn(cmd, args, { windowsHide: true });
		let stdout = '';
		let stderr = '';
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			child.kill('SIGKILL');
		}, timeoutMs);
		child.stdout.on('data', (d) => (stdout += d.toString()));
		child.stderr.on('data', (d) => (stderr += d.toString()));
		child.on('error', (error) => {
			clearTimeout(timer);
			resolve({ code: -1, stdout, stderr, error, timedOut });
		});
		child.on('close', (code) => {
			clearTimeout(timer);
			resolve({ code, stdout, stderr, timedOut });
		});
	});
}

async function dockerReady() {
	const r = await run('docker', ['info', '--format', '{{.ServerVersion}}'], 30000);
	if (r.code !== 0) throw new Error(`Docker is not available: ${r.stderr.trim() || r.error?.message || 'unknown'}`);
	return r.stdout.trim();
}

/**
 * Kills scraper containers left behind by earlier runs.
 * `docker run` keeps running when its Node client is killed at the timeout, and
 * those orphans keep hitting Google in parallel — that is what makes the next
 * scrapes fail, so sweep them before every run.
 */
async function sweepOrphans() {
	const list = await run('docker', ['ps', '-q', '--filter', `ancestor=${DOCKER_IMAGE}`], 30000);
	const ids = list.stdout.split('\n').map((s) => s.trim()).filter(Boolean);
	if (!ids.length) return 0;
	await run('docker', ['rm', '-f', ...ids], 60000);
	return ids.length;
}

/** Upgrades `=w408-h544` to `=w1600-h1200` on Google-hosted photos. */
const upscale = (url) => url.replace(/=w\d+-h\d+/, '=w1600-h1200');

/**
 * Scrapes ONE place. Returns { images: string[], rateLimited: boolean }.
 * `rateLimited` is true when Google answered with an empty/challenge record.
 */
async function scrapePlace(input, attempt = 1, geo = '') {
	const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-backfill-'));
	const containerName = `img-backfill-${process.pid}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
	try {
		const queriesPath = path.join(workDir, 'queries.txt');
		const outDir = path.join(workDir, 'out');
		fs.mkdirSync(outDir, { recursive: true });
		fs.writeFileSync(queriesPath, input, 'utf8');

		const args = [
			'run',
			'--rm',
			'--name',
			containerName,
			'-v',
			`${DOCKER_VOLUME}:/opt`,
			'-v',
			`${queriesPath}:/queries.txt:ro`,
			'-v',
			`${outDir}:/out`,
			DOCKER_IMAGE,
			'-input',
			'/queries.txt',
			'-json',
			'-results',
			'/out/results.json',
			'-depth',
			'1',
			'-c',
			DOCKER_CONCURRENCY,
			'-lang',
			'en',
			'-exit-on-inactivity',
			'120s',
		];
		if (geo) args.push('-geo', geo);

		const started = Date.now();
		const result = await run('docker', args, SCRAPE_TIMEOUT_MS);
		const elapsed = Math.round((Date.now() - started) / 1000);
		if (result.timedOut) {
			// The client is gone but the container is not: kill it, or it becomes an orphan.
			await run('docker', ['rm', '-f', containerName], 60000);
			log(`    scraper: ${elapsed}s, TIMEOUT — container removed`);
		}

		const resultsPath = path.join(outDir, 'results.json');
		const records = [];
		if (fs.existsSync(resultsPath)) {
			for (const line of fs.readFileSync(resultsPath, 'utf8').split('\n')) {
				const trimmed = line.trim();
				if (!trimmed) continue;
				try {
					records.push(JSON.parse(trimmed));
				} catch {
					/* ignore malformed line */
				}
			}
		}

		const named = records.filter((r) => r && typeof r.title === 'string' && r.title.trim() !== '');
		if (!named.length) {
			log(`    scraper: ${elapsed}s, no record (input=${input.slice(0, 70)}, code=${result.code})`);
			return { images: [], rateLimited: true, error: result.code !== 0 ? result.stderr.slice(-200) : '' };
		}

		const record = named[0];
		const urls = new Set();
		if (typeof record.thumbnail === 'string' && record.thumbnail) urls.add(record.thumbnail);
		for (const img of record.images || []) {
			const url = typeof img === 'string' ? img : img?.Image || img?.url || img?.src;
			if (url) urls.add(url);
		}
		log(`    scraper: ${elapsed}s, "${record.title}", ${urls.size} photo(s)`);
		return { images: [...urls].map(upscale), rateLimited: false, name: record.title };
	} finally {
		fs.rmSync(workDir, { recursive: true, force: true });
	}
}

/** Tier 2: social card of the place's own website (exact by definition). */
async function fetchOgImage(siteUrl) {
	if (!siteUrl || !/^https?:/i.test(siteUrl)) return null;
	try {
		const res = await fetch(siteUrl, {
			headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
			redirect: 'follow',
			signal: AbortSignal.timeout(20000),
		});
		if (!res.ok) return null;
		const html = (await res.text()).slice(0, 400_000);
		const patterns = [
			/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
			/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
			/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
		];
		for (const re of patterns) {
			const m = html.match(re);
			if (!m) continue;
			const raw = m[1].replace(/&amp;/g, '&').trim();
			try {
				return new URL(raw, siteUrl).toString();
			} catch {
				/* keep looking */
			}
		}
	} catch {
		/* no card */
	}
	return null;
}

async function validateImage(url) {
	if (!url || !/^https:/i.test(url)) return null;
	try {
		// Wikimedia rejects generic browser UAs; Google's CDN does not care.
		const ua = /wikimedia\.org/i.test(url) ? WIKI_UA : UA;
		const res = await fetch(url, {
			headers: { 'User-Agent': ua, Accept: 'image/*,*/*' },
			redirect: 'follow',
			signal: AbortSignal.timeout(25000),
		});
		if (!res.ok) return null;
		const type = res.headers.get('content-type') || '';
		const bytes = (await res.arrayBuffer()).byteLength;
		if (!type.startsWith('image/') || bytes < 10000) return null;
		return { url, type, bytes };
	} catch {
		return null;
	}
}

// ------------------------------------------------------------------ main

let STOP = false;
process.on('SIGINT', () => {
	STOP = true;
	log('SIGINT — finishing the current place then exiting…');
});

async function listDestinations() {
	const res = await authedFetch(`${BASE}/destinations?pageSize=300`);
	const json = await res.json();
	return (json.documents || []).map((d) => {
		const data = fromFields(d.fields);
		return { id: d.name.split('/').pop(), title: data.title };
	});
}

function missingTargets(doc) {
	const targets = [];
	for (const category of CATS) {
		for (const [entryId, entry] of Object.entries(doc[category] || {})) {
			if (Array.isArray(entry.images) && entry.images.length > 0) continue;
			if (!entry.name) continue;
			targets.push({ category, entryId, entry });
		}
	}
	return targets;
}

/**
 * Builds the Google Maps search query for one entry.
 *
 * The scraper CANNOT follow `https://maps.google.com/?cid=…` links: it rewrites
 * every URL input into `https://www.google.com/maps/search/<encoded url>`, which
 * renders an empty page (Playwright `scrollHeight` of null) and yields no record.
 * Short links (`maps.app.goo.gl/…`) do work, but may resolve to an area/list page.
 * A city-anchored text search is the only input shape that works for every entry.
 */
function buildQuery(entry, destinationTitle) {
	const name = String(entry.name || '').replace(/["“”]/g, ' ').replace(/\s+/g, ' ').trim();
	const city = String(destinationTitle || '').replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
	if (!name) return city;
	return city ? `"${name}" ${city}` : `"${name}"`;
}

function isShortMapsLink(url) {
	return /^https:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)/i.test(String(url || ''));
}

/**
 * Ordered list of scraper inputs for one entry: an explicit override (short link
 * or hand-written query) wins, then the city-anchored text query, then the entry's
 * own short link if it has one.
 */
function buildInputs(entry, destinationTitle, key) {
	const override = QUERY_OVERRIDES[key] || {};
	const inputs = [];
	if (override.url) inputs.push(override.url);
	if (override.query) inputs.push(override.query);
	if (!inputs.length) inputs.push(buildQuery(entry, destinationTitle));
	if (isShortMapsLink(entry.map)) inputs.push(entry.map);
	return [...new Set(inputs.filter(Boolean))];
}

// Words that carry no identity: dropping them lets "The Slice Hut" match "Slice Hut".
const WEAK_TOKENS = new Set([
	'the', 'and', 'de', 'da', 'do', 'la', 'le', 'el', 'del', 'los', 'las', 'of',
	'bar', 'pub', 'restaurant', 'restaurante', 'cafe', 'café', 'coffee', 'lounge',
	'pizzeria', 'pizza', 'pizzaria', 'bistro', 'bistrot', 'house', 'shop', 'store',
	'grill', 'kitchen', 'bakery', 'padaria', 'club', 'company', 'co', 'inc',
]);

const nameTokens = (value) =>
	String(value || '')
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/['’`]/g, '')
		.replace(/[^a-z0-9]+/g, ' ')
		.split(' ')
		.filter((t) => t && !WEAK_TOKENS.has(t));

/**
 * Guards against storing the photo of a different place: Google happily returns
 * "Belo Horizonte" for "Koctus Pizza". Unjudgeable pairs (no tokens) pass.
 */
function titleMatches(entryName, returnedTitle) {
	const a = nameTokens(entryName);
	const b = nameTokens(returnedTitle);
	if (!a.length || !b.length) return true;
	const hit = a.filter((t) => b.some((x) => x === t || x.startsWith(t) || t.startsWith(x)));
	return hit.length / a.length >= 0.34;
}

async function main() {
	log(`images-backfill start — project=${PROJECT} dests=${DESTS.length ? DESTS.join(',') : 'ALL'} limit=${LIMIT}`);
	const dockerVersion = await dockerReady();
	log(`Docker OK (server ${dockerVersion})`);
	const orphans = await sweepOrphans();
	if (orphans) log(`removed ${orphans} orphan scraper container(s) left by earlier runs`);

	let destinations = DESTS.length
		? DESTS.map((id) => ({ id, title: id }))
		: await listDestinations();
	destinations = destinations.filter((d) => d.id);

	let resolvedCount = 0;
	let rateLimitHits = 0;
	let consecutiveMisses = 0;
	const patchFile = TO_FILE ? {} : null;

	for (const dest of destinations) {
		if (STOP || resolvedCount >= LIMIT) break;
		try {
		const { data: doc, updateTime } = await getDoc(dest.id);
		const owner = doc.sharing?.owner || '';
		let targets = missingTargets(doc);
		if (ONLY_OVERRIDES) {
			// Re-resolve exactly the entries listed in --queries, even if they already
			// have an image (that is the point: the stored image matched the wrong place).
			targets = [];
			for (const category of CATS) {
				for (const [entryId, entry] of Object.entries(doc[category] || {})) {
					if (QUERY_OVERRIDES[`${dest.id}/${category}/${entryId}`]) {
						targets.push({ category, entryId, entry });
					}
				}
			}
		}
		if (SKIP_FAILED) {
			targets = targets.filter((t) => state.entries[`${dest.id}/${t.category}/${t.entryId}`]?.status !== 'failed');
		}
		if (!targets.length) {
			log(`${dest.title}: nothing missing`);
			continue;
		}
		log(`\n=== ${dest.title} (${dest.id}) — ${targets.length} place(s) without images`);

		const updates = [];
		for (const target of targets) {
			if (STOP || resolvedCount >= LIMIT) break;
			const key = `${dest.id}/${target.category}/${target.entryId}`;
			const known = state.entries[key];
			if (known?.status === 'ok' && known.images?.length) {
				// Already resolved in a previous run: keep it for the patch build.
				updates.push({ ...target, images: known.images });
				continue;
			}

			log(`→ ${target.entry.name} [${target.category}]`);
			let images = [];
			let status = 'failed';
			const override = QUERY_OVERRIDES[key] || {};
			if (override.image) {
				// Explicit image (e.g. Wikimedia) for places Maps cannot identify.
				const checked = await validateImage(override.image);
				if (checked) {
					images.push({ description: `${target.entry.name} — curated`, link: checked.url });
					log(`    curated image ok — ${checked.url.slice(0, 70)}`);
				} else {
					log('    curated image not usable — falling back');
				}
			}
			if (!images.length && override.og && target.entry.website) {
				const og = await fetchOgImage(target.entry.website);
				const checked = og ? await validateImage(og) : null;
				if (checked) {
					images.push({ description: `${target.entry.name} — official site`, link: checked.url });
					log(`    og:image ok — ${checked.url.slice(0, 70)}`);
				} else {
					log(`    og:image not usable — falling back to Maps`);
				}
			}
			const inputs = buildInputs(target.entry, doc.title || dest.title, key);
			for (let attempt = 1; !images.length && attempt <= RETRIES; attempt++) {
				if (STOP) break;
				let result = { images: [], rateLimited: true };
				for (const input of inputs) {
					result = await scrapePlace(input, attempt, override.geo);
					if (!result.rateLimited && !NO_GUARD && !titleMatches(target.entry.name, result.name)) {
						// Wrong place (Google answered with a different business): treat as a miss.
						log(`    rejected "${result.name}" — does not look like "${target.entry.name}"`);
						result = { images: [], rateLimited: true };
						continue;
					}
					if (!result.rateLimited) break;
					if (inputs.length > 1) log('    trying the next input…');
				}
				if (result.rateLimited) {
					// A clean miss is deterministic (wrong place / no such listing): retrying it
					// in the same run only burns time, so move on. Hard errors do get retried.
					rateLimitHits++;
					status = 'deferred';
					log(`    no usable record (#${rateLimitHits})`);
					if (!result.error) break;
					const backoff = Math.min(20_000 * attempt, 60_000);
					log(`    scraper error — retrying in ${Math.round(backoff / 1000)}s`);
					await sleep(backoff);
					continue;
				}
				consecutiveMisses = 0;
				for (const url of result.images) {
					if (images.length >= MAX_IMAGES) break;
					const ok = await validateImage(url);
					if (ok) images.push({ description: `${target.entry.name} — Google Maps`, link: ok.url });
				}
				if (images.length) {
					status = 'ok';
					break;
				}
				status = result.error ? 'error' : 'empty';
				const backoff = Math.min(20_000 * attempt, 60_000);
				log(`    attempt ${attempt}/${RETRIES} found no image (${status}) — waiting ${Math.round(backoff / 1000)}s`);
				await sleep(backoff);
			}

			state.entries[key] = {
				status,
				images,
				attempts: (state.entries[key]?.attempts || 0) + 1,
				updatedAt: new Date().toISOString(),
				name: target.entry.name,
			};
			saveState();

			if (images.length) {
				consecutiveMisses = 0;
				resolvedCount++;
				updates.push({ ...target, images });
				log(`    ✓ ${images.length} image(s) [${resolvedCount} resolved]`);
			} else {
				log(`    ✗ no image (${status})`);
				// Several places in a row with nothing usable means the IP is throttled,
				// not that the queries are bad — cool down once and keep going.
				consecutiveMisses++;
				if (consecutiveMisses >= 3) {
					const waitMs = COOLDOWN_MIN * 60000;
					log(`    ${consecutiveMisses} places in a row without a usable record — cooling down ${Math.round(waitMs / 60000)} min`);
					await sleep(waitMs);
					consecutiveMisses = 0;
				}
			}

			// Gentle mode (`--delay`): jitter keeps the request cadence from looking robotic.
			if (DELAY_S > 0) {
				const waitMs = Math.round(DELAY_S * 1000 * (0.75 + Math.random() * 0.5));
				log(`    delaying ${(waitMs / 1000).toFixed(0)}s`);
				await sleep(waitMs);
			}
		}

		if (!updates.length) continue;

		if (DRY_RUN) {
			log(`dry-run: ${updates.length} entries ready to patch in ${dest.title}`);
			continue;
		}
		if (patchFile) {
			patchFile[dest.id] = {};
			for (const u of updates) {
				patchFile[dest.id][u.category] ||= {};
				patchFile[dest.id][u.category][u.entryId] = { ...u.entry, images: u.images };
			}
			fs.writeFileSync(TO_FILE, JSON.stringify(patchFile, null, 1));
			log(`written to ${TO_FILE}`);
			continue;
		}

		// Safety: back up the document, patch per entry, verify nothing vanished.
		const backupPath = path.join(BACKUP_DIR, `${dest.id}-${RUN_TS}.json`);
		fs.writeFileSync(backupPath, JSON.stringify(doc, null, 1));
		const before = CATS.map((c) => [c, Object.keys(doc[c] || {}).length]);

		try {
			await patchEntries(
				dest.id,
				updates.map((u) => ({ category: u.category, entryId: u.entryId, entry: { ...u.entry, images: u.images } })),
			);
			await syncSummary(owner, dest.id);
			const { data: after } = await getDoc(dest.id);
			const lost = before.filter(([c, n]) => Object.keys(after[c] || {}).length < n);
			if (lost.length) {
				log(`!! INTEGRITY FAILURE in ${dest.title}: ${lost.map(([c, n]) => `${c} ${n}→${Object.keys(after[c] || {}).length}`).join(', ')}`);
				log(`!! restoring ${backupPath}`);
				const restoreMask = CATS.map((c) => `updateMask.fieldPaths=${c}`).join('&');
				await authedFetch(`${BASE}/destinations/${dest.id}?${restoreMask}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ fields: toFields(Object.fromEntries(CATS.map((c) => [c, doc[c] || {}]))) }),
				});
				throw new Error('integrity check failed — document restored from backup');
			}
			log(`${dest.title}: patched ${updates.length} entries (verified, counts unchanged)`);
		} catch (error) {
			log(`!! write failed for ${dest.title}: ${error.message}`);
		}
		} catch (error) {
			log(`!! ${dest.title} skipped: ${error.message}`);
		}
	}

	log(`\nDONE — resolved ${resolvedCount} place(s); rate-limit hits ${rateLimitHits}`);
	log(`state: ${STATE_PATH}`);
	log(`log:   ${LOG_PATH}`);
	logStream.end();
}

main().catch((error) => {
	log(`FATAL: ${error.message}`);
	logStream.end();
	process.exit(1);
});
