/**
 * scripts/build/gen-iconify-bundle.js
 *
 * Scans public/ for every Iconify icon name used by the app, resolves each
 * `prefix:name` to its SVG body via the Iconify API, and emits
 * dist/assets/json/iconify-icons.json in Iconify collection format (grouped by
 * prefix). This is the self-hosted icon set the static-export builder registers
 * with Iconify.addCollection() so the exported page makes zero requests to
 * code.iconify.design.
 *
 * Sources scanned (see docs/implementation-plans/20260815-static-web-export.md,
 * Prompt 1-D):
 *   - `data-icon="…"` / `data-icon='…'` literal attributes in HTML and TS
 *   - plain string literals in TS whose entire value is an icon name
 *     (covers `icon = 'mdi:youtube'`, `setAttribute('data-icon', '…')`,
 *     `dataset.icon = '…'`, and constants like GOOGLE_MAPS_ICON)
 *   - string values in every non-vendor JSON under public/ (covers
 *     assets/json/icons.json + assets/json/transportation.json)
 *
 * Resolutions are cached in tmp/iconify-cache.json so subsequent builds are
 * deterministic and work offline. The build fails if any collected name cannot
 * be resolved (or is unreachable when not cached).
 *
 * Usage:
 *   node scripts/build/gen-iconify-bundle.js
 *   node scripts/build/gen-iconify-bundle.js --refresh   # ignore cache
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const DIST_DIR = path.join(ROOT, 'dist');
const CACHE_FILE = path.join(ROOT, 'tmp', 'iconify-cache.json');
const OUT_FILE = path.join(DIST_DIR, 'assets', 'json', 'iconify-icons.json');

const ICONIFY_API = 'https://api.iconify.design';
const REFRESH = process.argv.includes('--refresh');

// Icon names are lowercase `prefix:name`. Requiring the prefix to start with a
// letter and the name to contain at least one letter deliberately excludes
// false positives such as time literals ("08:00"), URLs, and data: URIs.
const ICON_NAME_RE = /^[a-z][a-z0-9-]*:[a-z0-9-]*[a-z][a-z0-9-]*$/;

// "assets/vendor" is third-party code; nothing in it is an app icon.
const VENDOR_DIR = path.join(PUBLIC_DIR, 'assets', 'vendor');

/**
 * Recursively list all files under a directory (relative paths), skipping the
 * given excluded absolute directory.
 */
function listFiles(dir, excludedDir) {
	const out = [];
	const walk = (current) => {
		for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
			const full = path.join(current, entry.name);
			if (entry.isDirectory()) {
				if (full === excludedDir) continue;
				walk(full);
			} else {
				out.push(full);
			}
		}
	};
	walk(dir);
	return out;
}

/**
 * Collect every unique icon name referenced under public/ (excluding vendor).
 */
function collectIcons() {
	const names = new Set();
	const addName = (value) => {
		const v = String(value).trim();
		if (ICON_NAME_RE.test(v)) names.add(v);
	};

	const files = listFiles(PUBLIC_DIR, VENDOR_DIR);
	for (const file of files) {
		const ext = path.extname(file).toLowerCase();
		let content;
		try {
			content = fs.readFileSync(file, 'utf8');
		} catch {
			continue; // binary or unreadable — not an icon source
		}

		if (ext === '.json') {
			// Recursively collect JSON string values that look like icon names.
			try {
				walkJson(JSON.parse(content), addName);
			} catch {
				// Invalid JSON — ignore; the JSON hasher/tooling will report it.
			}
			continue;
		}

		// `data-icon` attribute literals (works for HTML and TS string literals
		// that embed HTML, e.g. `<i class="iconify" data-icon="mdi:youtube">`).
		const attrRe = /data-icon=["']([^"']+)["']/g;
		let m;
		while ((m = attrRe.exec(content)) !== null) addName(m[1]);

		if (ext === '.ts') {
			// setAttribute('data-icon', '…') / setAttribute("data-icon", "…")
			const setAttrRe = /setAttribute\(\s*["']data-icon["']\s*,\s*["']([^"']+)["']\s*\)/g;
			while ((m = setAttrRe.exec(content)) !== null) addName(m[1]);

			// Icon-name variables assigned a plain string literal, e.g.
			// `icon = 'mdi:youtube'`, `GOOGLE_MAPS_ICON = 'simple-icons:googlemaps'`,
			// and `icon.dataset.icon = 'mdi:drag'` (the identifier contains "icon").
			const iconVarRe = /\b\w*icon\w*\s*=\s*["']([^"']+)["']/gi;
			while ((m = iconVarRe.exec(content)) !== null) addName(m[1]);

			// Return statements that hand back a literal icon name, e.g. the
			// rating icons in pages/destination/categories.ts.
			const returnRe = /return\s+["']([^"']+)["']/g;
			while ((m = returnRe.exec(content)) !== null) addName(m[1]);
		}
	}
	return [...names].sort();
}

function walkJson(node, addName) {
	if (Array.isArray(node)) {
		for (const item of node) walkJson(item, addName);
	} else if (node && typeof node === 'object') {
		for (const value of Object.values(node)) walkJson(value, addName);
	} else if (typeof node === 'string') {
		addName(node);
	}
}

/**
 * Minimal HTTPS GET returning the response body as a string. Follows a single
 * redirect. Rejects on non-2xx status or network errors.
 */
function httpGet(url, redirects = 0) {
	return new Promise((resolve, reject) => {
		https
			.get(url, (res) => {
				const status = res.statusCode || 0;
				if (status >= 300 && status < 400 && res.headers.location) {
					res.resume();
					if (redirects >= 3) {
						reject(new Error(`Too many redirects fetching ${url}`));
						return;
					}
					resolve(httpGet(res.headers.location, redirects + 1));
					return;
				}
				if (status !== 200) {
					res.resume();
					reject(new Error(`HTTP ${status} fetching ${url}`));
					return;
				}
				let data = '';
				res.on('data', (chunk) => (data += chunk));
				res.on('end', () => resolve(data));
			})
			.on('error', reject);
	});
}

function loadCache() {
	try {
		return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
	} catch {
		return {};
	}
}

function saveCache(cache) {
	fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
	fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, '\t') + '\n');
}

/**
 * Ensure an icon carries explicit `width`/`height`. The Iconify API returns
 * collection-level default dimensions (e.g. FontAwesome collections are
 * 512×512) that per-icon fields override (e.g. fa-solid:plane sets only
 * `width: 576`, inheriting the 512 height). Without the collection default, a
 * width-only icon renders with Iconify's internal 16px fallback height, which
 * distorts the aspect ratio massively (576:16 → the plane renders 36:1 wide).
 * Falls back to 24 (Iconify's default grid) when neither source provides one.
 */
function normalizeIcon(icon, defaultWidth, defaultHeight) {
	const width = icon.width ?? defaultWidth ?? 24;
	const height = icon.height ?? defaultHeight ?? 24;
	return { ...icon, width, height };
}

/**
 * Resolve a set of `prefix:name` icons to Iconify icon objects, using the
 * cache first and fetching only what's missing (grouped by prefix).
 */
async function resolveIcons(names) {
	const cache = REFRESH ? {} : loadCache();
	const resolved = {};
	const missingByPrefix = new Map();

	for (const name of names) {
		if (cache[name] && !REFRESH) {
			resolved[name] = cache[name];
		} else {
			const idx = name.indexOf(':');
			const prefix = name.slice(0, idx);
			const iconName = name.slice(idx + 1);
			if (!missingByPrefix.has(prefix)) missingByPrefix.set(prefix, []);
			missingByPrefix.get(prefix).push(iconName);
		}
	}

	for (const [prefix, iconNames] of missingByPrefix) {
		const url = `${ICONIFY_API}/${encodeURIComponent(prefix)}.json?icons=${encodeURIComponent(iconNames.join(','))}`;
		const data = JSON.parse(await httpGet(url));
		const defaultWidth = data.width;
		const defaultHeight = data.height;
		for (const iconName of iconNames) {
			const full = `${prefix}:${iconName}`;
			let icon = data.icons && data.icons[iconName];
			if (!icon && data.aliases && data.aliases[iconName]) {
				// Aliases point at a parent icon; the API includes the parent.
				const parent = data.aliases[iconName].parent;
				icon = data.icons && data.icons[parent];
			}
			if (!icon) {
				throw new Error(
					`[gen-iconify-bundle] Icon "${full}" could not be resolved via ${url}`,
				);
			}
			// Normalize dimensions BEFORE caching so future offline builds carry
			// the corrected data too.
			const normalized = normalizeIcon(icon, defaultWidth, defaultHeight);
			resolved[full] = normalized;
			cache[full] = normalized;
		}
	}

	saveCache(cache);
	return resolved;
}

/**
 * Group a {name: iconObject} map into Iconify collection objects keyed by
 * prefix: { prefix: { prefix, icons: { name: iconObject } } }.
 */
function groupByPrefix(resolved) {
	const grouped = {};
	for (const [full, icon] of Object.entries(resolved)) {
		const idx = full.indexOf(':');
		const prefix = full.slice(0, idx);
		const name = full.slice(idx + 1);
		if (!grouped[prefix]) grouped[prefix] = { prefix, icons: {} };
		grouped[prefix].icons[name] = icon;
	}
	return grouped;
}

async function main() {
	const names = collectIcons();
	if (names.length === 0) {
		console.warn('[gen-iconify-bundle] No icons found in public/ — writing empty bundle.');
	} else {
		console.log(`[gen-iconify-bundle] Collected ${names.length} icon name(s).`);
	}

	const resolved = await resolveIcons(names);
	const grouped = groupByPrefix(resolved);

	fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
	fs.writeFileSync(OUT_FILE, JSON.stringify(grouped) + '\n');

	const totalIcons = Object.values(grouped).reduce((n, c) => n + Object.keys(c.icons).length, 0);
	console.log(
		`[gen-iconify-bundle] Wrote ${totalIcons} icon(s) across ${Object.keys(grouped).length} collection(s) to ${path.relative(ROOT, OUT_FILE)}.`,
	);
}

main().catch((err) => {
	console.error(err && err.message ? err.message : err);
	process.exit(1);
});
