// ============================================================
// gmaps-scraper — local HTTP server (the "route we can always point to")
// ============================================================
// A tiny zero-dependency Node server that wraps gosom/google-maps-scraper
// (running in local Docker) behind one stable endpoint:
//
//   POST /scrape   { urls: string[], lang?: string }
//                  -> { places: GmapsScrapeResult[] }
//   GET  /health   -> { ok: true }
//
// Every scrape runs ONE `docker run` per language (en + pt-BR) for all supplied
// URLs — exactly what the edit-destination "Import with maps" flow needs for
// both the per-item import (one URL) and the bulk "Update all" (many URLs).
// Descriptions are fetched in BOTH languages and merged as `{ en, pt }`
// (place.descriptions) while `place.description` stays the requested language.
// The scraper output is normalized here into the same PlaceDetails shape the
// app already consumes (see public/assets/ts/models/places-api.model.ts +
// workers/places-api/src/normalize.js), so the frontend only has to fetch + adapt, never
// parse raw scraper JSON.
//
// The server is CORS-open to localhost so the app served on :5000 can call it
// from :8788. Started by `npm run dev` (see package.json); the image is pulled
// lazily on first scrape if missing.
//
// References:
// - scripts/gmaps-scraper/run.ps1 (the one-shot CLI this wraps)
// - docs/analysis/20260810-google-maps-local-scraping-research.md
// - workers/places-api/src/normalize.js (the PlaceDetails normalization it mirrors)

import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HOST = process.env.GMAPS_SCRAPER_HOST ?? '127.0.0.1';
const PORT = Number(process.env.GMAPS_SCRAPER_PORT ?? 8788);
const DOCKER_IMAGE = process.env.GMAPS_SCRAPER_IMAGE ?? 'gosom/google-maps-scraper';
const PLAYWRIGHT_VOLUME = process.env.GMAPS_SCRAPER_VOLUME ?? 'gmaps-playwright-cache';
const DEFAULT_LANG = 'en';
/** Scraper language codes — the server ALWAYS scrapes the description in both. */
const LANG_EN = 'en';
const LANG_PT = 'pt-BR';
/** App language pack code ('en' | 'pt') → scraper language code. */
const SCRAPER_LANG = { en: LANG_EN, pt: LANG_PT };
/**
 * Delay between the two language runs (ms). Google rate-limits back-to-back
 * scrapes, so a small pause here lowers the chance the second (best-effort)
 * language run gets blocked. 0 keeps single-imports fast; raise it if you see
 * 'No place data could be parsed' on the secondary run (GMAPS_SCRAPER_LANG_DELAY_MS).
 */
const LANG_DELAY_MS = Number(process.env.GMAPS_SCRAPER_LANG_DELAY_MS ?? 0);
/** Concurrency for the scraper (-c). Kept low: high concurrency risks blocking. */
const CONCURRENCY = Number(process.env.GMAPS_SCRAPER_CONCURRENCY ?? 2);
/** Working directory of this script (for the temp output folder). */
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

// ------------------------------------------------------------
// URL validation + normalization
// ------------------------------------------------------------

/** True when the string starts with http:// or https://. */
function isHttp(value) {
	return value.startsWith('http://') || value.startsWith('https://');
}

/**
 * Pure check that a link is a Google Maps / Apple Maps link (mirrors
 * public/assets/ts/ui/fields.ts → validateMapLink).
 */
export function isValidMapLink(value) {
	const link = String(value ?? '').trim();
	const isGoogleMaps =
		(link.includes('google') && link.includes('maps')) ||
		link.includes('goo.gl/maps') ||
		link.includes('maps.app.goo.gl');
	const isAppleMaps = link.includes('maps.apple.com');
	return isHttp(link) && (isGoogleMaps || isAppleMaps);
}

/**
 * Query params that must NOT reach the scraper. VERIFIED 2026-08-12: when the
 * input URL already carries params (Google's Share button appends
 * `?entry=ttu&g_ep=...`), the scraper rewrites it as `...?hl=en?entry=ttu&...`
 * (double `?`), so `hl` never sticks and Google falls back to geo-localized
 * (pt-BR for a Brazilian IP). Stripping them lets the scraper's own `-lang`
 * produce a clean `?hl=en` and the requested language actually applies.
 * `hl` is stripped too — the server now forces BOTH languages (see runScrapeBoth),
 * so a stale `hl=` in the pasted link must not override that.
 */
const TRACKING_PARAMS = new Set([
	'entry',
	'g_ep',
	'hl',
	'utm_source',
	'utm_medium',
	'utm_campaign',
	'utm_term',
	'utm_content',
	'gclid',
	'gbraid',
	'wbraid',
	'vet',
	'source',
	'authuser',
]);

/**
 * Prepare a Maps URL for the scraper (mirrors scripts/gmaps-scraper/README.md):
 *  - `google.com.br` (or any non-.com) Maps URLs are NOT recognized as direct
 *    place URLs → convert to `google.com` (the `data=` param is domain-neutral).
 *  - Strip tracking/UI query params (`entry`, `g_ep`, `hl`, `utm_*`, …) so the
 *    scraper's `-lang` flag (not the pasted link) controls the output language.
 */
export function normalizeMapUrl(raw) {
	let url = String(raw ?? '').trim();
	// .br / non-.com → .com (same data= param works).
	url = url.replace(/^https?:\/\/(www\.)?google\.com\.br\//i, 'https://www.google.com/');
	if (url.startsWith('https://www.google.com.br/')) {
		url = url.replace('https://www.google.com.br/', 'https://www.google.com/');
	}
	try {
		const parsed = new URL(url);
		for (const key of TRACKING_PARAMS) parsed.searchParams.delete(key);
		url = parsed.toString();
	} catch {
		// Not a parseable URL — validation below will reject it anyway.
	}
	return url;
}

// ------------------------------------------------------------
// Scraper record → PlaceDetails normalization
// ------------------------------------------------------------

const PRICE_LEVELS = ['$', '$$', '$$$', '$$$$'];

/** Split website into { website, instagram } — instagram URLs go to instagram. */
function splitWebsiteInstagram(uri) {
	if (!uri) return { website: '', instagram: '' };
	if (String(uri).toLowerCase().includes('instagram.com')) return { website: '', instagram: uri };
	return { website: uri, instagram: '' };
}

/** Round a numeric rating to a whole-number string (mirrors normalize.js). */
function roundRating(value) {
	if (value === undefined || value === null || value === '') return '';
	const num = Number(value);
	if (Number.isNaN(num)) return '';
	return String(Math.round(num));
}

/** Map the scraper's price string ("$", "$$", "3", "€€") to the app's shape. */
function normalizePrice(value) {
	const raw = String(value ?? '').trim();
	if (!raw) return '-';
	// Numeric (e.g. "2") → index into the bands.
	if (/^\d+$/.test(raw)) {
		const level = PRICE_LEVELS[Number(raw) - 1];
		return level ?? '-';
	}
	// "$" / "$$" / "$$$" / "$$$$" — strip any currency symbols, count the $s.
	const dollars = raw.match(/\$/g);
	if (dollars && dollars.length > 0) {
		return PRICE_LEVELS[Math.min(dollars.length, 4) - 1];
	}
	// Euro-style "€€" → map by count.
	const euros = raw.match(/€/g);
	if (euros && euros.length > 0) {
		return PRICE_LEVELS[Math.min(euros.length, 4) - 1];
	}
	return '-';
}

/**
 * Normalize the scraper's `place_id` into the app's `id`. Google Place IDs
 * look like `ChIJ...` and ARE compatible with the Places API (New) refresh
 * route; the scraper may also return a `places/ChIJ...` prefixed form. Anything
 * that doesn't look like a real place id → `''` (leave blank, per plan).
 */
function normalizePlaceId(value) {
	const raw = String(value ?? '').trim().replace(/^places\//i, '');
	if (!raw) return '';
	// Real Google place ids start with "ChI" (all known ids do). Anything else
	// (e.g. an internal data_id) is not the official id → leave blank.
	return raw.startsWith('ChI') ? raw : '';
}

/** Prefer the scraper's canonical `link`, else build one from the cid. */
function normalizeMapLink(link, cid) {
	const direct = String(link ?? '').trim();
	if (isHttp(direct)) return direct;
	if (cid) return `https://maps.google.com/?cid=${encodeURIComponent(String(cid))}`;
	return '';
}

/** Map the scraper's `status` text to a PlaceBusinessStatus value. */
function normalizeStatus(value) {
	const raw = String(value ?? '').toLowerCase();
	if (/permanently closed/.test(raw)) return 'CLOSED_PERMANENTLY';
	if (/temporarily closed/.test(raw)) return 'CLOSED_TEMPORARILY';
	if (/closed/.test(raw)) return 'CLOSED_TEMPORARILY';
	return 'OPERATIONAL';
}

/** First non-empty string among the given values. */
function firstString(...values) {
	for (const value of values) {
		if (typeof value === 'string' && value.trim() !== '') return value.trim();
	}
	return '';
}

/**
 * Resolve the app's `region` (neighborhood/area) from a scraper record.
 * The scraper returns `address` (full street address) and `complete_address`
 * (an object with borough/street/city/state/...). Prefer the area-level parts
 * (borough → city → state) so the entry's region stays a neighborhood, not a
 * long street address; fall back to the raw address string.
 */
function resolveRegion(record) {
	const ca = record.complete_address;
	if (ca && typeof ca === 'object') {
		return firstString(ca.borough, ca.city, ca.state);
	}
	return firstString(record.address);
}

/** String[] of image URLs from the scraper's `images` (and thumbnail first). */
function collectImageUrls(record) {
	const urls = new Set();
	if (typeof record.thumbnail === 'string' && record.thumbnail.trim() !== '') {
		urls.add(record.thumbnail.trim());
	}
	if (Array.isArray(record.images)) {
		for (const image of record.images) {
			// VERIFIED 2026-08-12: raw gosom output uses `{ "Title": ..., "Image": url }`
			// objects (NOT strings / `{url}`) — the old `image?.url` read dropped them
			// all, leaving only the thumbnail. Accept string, `Image`, `url`, `src`.
			const url =
				typeof image === 'string' ? image : (image?.Image ?? image?.url ?? image?.src ?? '');
			if (typeof url === 'string' && url.trim() !== '') urls.add(url.trim());
		}
	}
	return [...urls];
}

/**
 * Normalize ONE scraper JSONL record into the app's PlaceDetails shape plus
 * the fields the frontend needs for local refresh (sourceUrl) and photo import
 * (imageUrls).
 *
 * Field names verified against real gosom output (2026-08): the website field
 * is `web_site`, `complete_address` is an object, `title` is the name,
 * `review_rating` the rating, `price_range` the price, `place_id` the Google
 * id, `description`/`status` the summary + business status.
 */
export function normalizeRecord(record, lang = DEFAULT_LANG) {
	const website = firstString(record.web_site, record.website);
	const { website: web, instagram } = splitWebsiteInstagram(website);
	const sourceUrl = normalizeMapLink(record.link, record.cid);
	const images = collectImageUrls(record);
	const description = firstString(record.description, record.descriptions);

	const place = {
		id: normalizePlaceId(record.place_id ?? record.data_id),
		name: firstString(record.title, record.name),
		description,
		region: resolveRegion(record),
		website: web,
		instagram,
		rating: roundRating(record.review_rating ?? record.rating),
		price: normalizePrice(record.price_range ?? record.price),
		emoji: '',
		map: sourceUrl,
	};
	if (record.status) place.businessStatus = normalizeStatus(record.status);

	return {
		...place,
		// Extra fields (not part of PlaceDetails) the frontend consumes.
		sourceUrl,
		// No cap — the frontend previews every scraper image (it scrolls after
		// two rows), so the user gets "as much as we can" to pick from.
		imageUrls: images,
	};
}

// ------------------------------------------------------------
// Docker orchestration
// ------------------------------------------------------------

/** Resolve the docker CLI (respecting a possible `docker` on PATH or env). */
function dockerCommand() {
	return process.env.GMAPS_SCRAPER_DOCKER ?? 'docker';
}

/** Promise wrapper around spawn that collects stdout+stderr and resolves exit code. */
function runProcess(command, args, opts = {}) {
	return new Promise((resolve) => {
		const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts });
		let stdout = '';
		let stderr = '';
		child.stdout.on('data', (chunk) => (stdout += chunk));
		child.stderr.on('data', (chunk) => (stderr += chunk));
		child.on('error', (error) => resolve({ code: -1, stdout, stderr, error }));
		child.on('close', (code) => resolve({ code: code ?? -1, stdout, stderr, error: null }));
	});
}

/** Ensure the scraper image is present (pull on first use, best-effort). */
async function ensureImage() {
	const inspect = await runProcess(dockerCommand(), ['image', 'inspect', DOCKER_IMAGE]);
	if (inspect.code === 0) return;
	console.log(`[gmaps-scraper] image '${DOCKER_IMAGE}' not found — pulling...`);
	await runProcess(dockerCommand(), ['pull', DOCKER_IMAGE]);
}

/**
 * Scrape `urls` in a single docker run and return normalized places.
 * Throws an Error with a human-readable message when scraping fails (e.g.
 * Docker unavailable, empty results → likely rate-limited).
 */
async function runScrape(urls, lang) {
	const langCode = typeof lang === 'string' && lang.trim() !== '' ? lang : DEFAULT_LANG;
	await ensureImage();

	// One temp dir per request: queries.txt (input) + results.json (output).
	const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gmaps-scrape-'));
	try {
		const queriesPath = path.join(workDir, 'queries.txt');
		const outDir = path.join(workDir, 'out');
		fs.mkdirSync(outDir, { recursive: true });
		fs.writeFileSync(queriesPath, urls.join('\n'), 'utf8');

		const resultsFile = 'results.json';
		// Enough inactivity slack: first result ~15-30s, plus per-place budget.
		const inactivitySeconds = Math.min(60 * 20, 90 + urls.length * 25);

		const args = [
			'run', '--rm',
			'-v', `${PLAYWRIGHT_VOLUME}:/opt`,
			'-v', `${queriesPath}:/queries.txt:ro`,
			'-v', `${outDir}:/out`,
			DOCKER_IMAGE,
			'-input', '/queries.txt',
			'-json',
			'-results', `/out/${resultsFile}`,
			'-depth', '1',
			'-c', String(CONCURRENCY),
			'-lang', langCode,
			'-exit-on-inactivity', `${inactivitySeconds}s`,
		];

		console.log(`[gmaps-scraper] docker ${args.join(' ')}`);
		const result = await runProcess(dockerCommand(), args);

		if (result.error) {
			// docker binary missing / daemon not running.
			const detail = result.error?.message ?? '';
			throw new Error(
				`Could not start the scraper container (is Docker Desktop running?). ${detail}`.trim(),
			);
		}
		if (result.code !== 0) {
			const tail = result.stderr.trim().split('\n').slice(-5).join('\n');
			throw new Error(`The scraper container exited with code ${result.code}.\n${tail}`.trim());
		}

		const outputPath = path.join(outDir, resultsFile);
		if (!fs.existsSync(outputPath)) {
			throw new Error(
				'No results were produced. This is usually Google rate-limiting — wait a few minutes and try again (see scripts/gmaps-scraper/README.md).',
			);
		}

		const lines = fs
			.readFileSync(outputPath, 'utf8')
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line !== '');

		const places = lines
			.map((line) => {
				try {
					return normalizeRecord(JSON.parse(line), langCode);
				} catch {
					return null;
				}
			})
			.filter(Boolean);

		if (places.length === 0 || places.every((place) => !place.name)) {
			// Google served a block/challenge page: records come back with empty
			// fields (verified 2026-08) instead of an error. Surface that clearly
			// so the user knows to wait a few minutes rather than re-run blindly.
			throw new Error(
				'No place data could be parsed. This is usually Google rate-limiting — wait a few minutes and try again (see scripts/gmaps-scraper/README.md).',
			);
		}
		return places;
	} finally {
		fs.rmSync(workDir, { recursive: true, force: true });
	}
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Best-effort secondary-language scrape: the primary run already proved the
 * URLs work, so a rate-limit here must never fail the whole import.
 */
async function runScrapeWithFallback(urls, lang) {
	if (LANG_DELAY_MS > 0) await sleep(LANG_DELAY_MS);
	try {
		return await runScrape(urls, lang);
	} catch (error) {
		console.warn(`[gmaps-scraper] '${lang}' scrape failed (best-effort): ${error.message}`);
		return [];
	}
}

/**
 * Scrape `urls` in BOTH languages (en + pt-BR) and merge per URL.
 *
 * The app stores descriptions as `{ pt, en }`, and Google localizes the same
 * editorial summary per `hl`. One docker run can only request one language, so
 * this runs the scraper twice — once for the requested language (its failure
 * is fatal: rate-limited/blocked), once for the other language (best-effort,
 * skipped entirely when no place returned a description, since most
 * restaurants/bars have none and there's nothing to translate).
 *
 * Each result gets:
 *   - `description`   — the REQUESTED language's text (what the dialog shows).
 *   - `descriptions`  — `{ en, pt }` raw texts for BOTH languages (the apply
 *                       step writes both into the entry's description object).
 *   - `imageUrls`     — union of both runs' images (deduped).
 *
 * If Google serves the SAME text for both `hl=en` and `hl=pt-BR` (short
 * `maps.app.goo.gl` links drop `hl` on redirect → geo-localized), only the
 * requested language is kept so the other field is never mislabeled.
 */
async function runScrapeBoth(urls, requestedLang) {
	const primaryLang = SCRAPER_LANG[requestedLang] ?? LANG_EN;
	const secondaryLang = primaryLang === LANG_EN ? LANG_PT : LANG_EN;

	// Primary run — requested language (fatal on failure).
	const primary = await runScrape(urls, primaryLang);

	// Secondary run — the other language, only when a description actually exists.
	const secondary = primary.some((place) => place.description)
		? await runScrapeWithFallback(urls, secondaryLang)
		: null;

	const count = Math.max(primary.length, secondary?.length ?? 0);
	return Array.from({ length: count }, (_, i) => {
		const p = primary[i] ?? {};
		const s = secondary?.[i];

		let descriptions = {
			en: primaryLang === LANG_EN ? (p.description ?? '') : (s?.description ?? ''),
			pt: primaryLang === LANG_PT ? (p.description ?? '') : (s?.description ?? ''),
		};
		// Identical text for both hl values → language forcing failed (geo URL).
		if (descriptions.en && descriptions.pt && descriptions.en === descriptions.pt) {
			descriptions =
				primaryLang === LANG_EN
					? { en: descriptions.en, pt: '' }
					: { en: '', pt: descriptions.pt };
		}

		return {
			...p,
			description: p.description ?? '',
			descriptions,
			imageUrls: [...new Set([...(p.imageUrls ?? []), ...(s?.imageUrls ?? [])])],
		};
	});
}

// ------------------------------------------------------------
// HTTP server
// ------------------------------------------------------------

function sendJson(res, status, body) {
	const payload = JSON.stringify(body);
	res.writeHead(status, {
		'Content-Type': 'application/json; charset=utf-8',
		'Content-Length': Buffer.byteLength(payload),
	});
	res.end(payload);
}

function setCors(res, origin) {
	res.setHeader('Access-Control-Allow-Origin', origin || '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
	res.setHeader('Access-Control-Max-Age', '600');
}

function readBody(req) {
	return new Promise((resolve, reject) => {
		let data = '';
		req.on('data', (chunk) => {
			data += chunk;
			if (data.length > 1_000_000) {
				req.destroy();
				reject(new Error('Request body too large'));
			}
		});
		req.on('end', () => {
			try {
				resolve(data ? JSON.parse(data) : {});
			} catch {
				reject(new Error('Invalid JSON body'));
			}
		});
		req.on('error', reject);
	});
}

const server = http.createServer(async (req, res) => {
	const origin = req.headers.origin;
	setCors(res, origin);

	if (req.method === 'OPTIONS') {
		res.writeHead(204);
		res.end();
		return;
	}

	const url = new URL(req.url ?? '/', `http://${req.headers.host ?? `${HOST}:${PORT}`}`);

	try {
		if (req.method === 'GET' && url.pathname === '/health') {
			sendJson(res, 200, { ok: true });
			return;
		}

		if (req.method === 'POST' && url.pathname === '/scrape') {
			const body = await readBody(req);
			const rawUrls = Array.isArray(body?.urls) ? body.urls : [];
			const lang = String(body?.lang ?? '').trim();

			const urls = rawUrls
				.map((u) => String(u ?? '').trim())
				.filter((u) => u !== '')
				.map((u) => normalizeMapUrl(u));

			if (urls.length === 0) {
				sendJson(res, 400, { error: { code: 'gmaps/invalid-url', message: 'No URLs provided' } });
				return;
			}
			const invalid = urls.filter((u) => !isValidMapLink(u));
			if (invalid.length > 0) {
				sendJson(res, 400, {
					error: {
						code: 'gmaps/invalid-url',
						message: `Not a Google Maps link: ${invalid[0]}`,
					},
				});
				return;
			}

			const places = await runScrapeBoth(urls, lang);
			sendJson(res, 200, { places });
			return;
		}

		sendJson(res, 404, { error: { code: 'gmaps/not-found', message: 'Not found' } });
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Unknown error';
		console.error(`[gmaps-scraper] ${message}`);
		sendJson(res, 500, { error: { code: 'gmaps/scrape-failed', message } });
	}
});

server.listen(PORT, HOST, () => {
	console.log(`[gmaps-scraper] HTTP server ready → http://${HOST}:${PORT}`);
	console.log(`[gmaps-scraper] POST /scrape { urls, lang }  ·  GET /health`);
});
