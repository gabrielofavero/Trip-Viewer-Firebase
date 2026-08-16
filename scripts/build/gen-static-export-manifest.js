/**
 * scripts/build/gen-static-export-manifest.js
 *
 * Emits dist/static-export-manifest.json — per exportable entry (view.html,
 * destination.html), the exact set of local files it needs to run standalone
 * (no Firebase). Regenerated every build from the actual import/asset graph so
 * future code changes never require manual manifest edits.
 *
 * Run AFTER esbuild compilation + (in prod) hash-assets.js, so it always sees
 * the final dist/ file names.
 *
 * Schema (see docs/implementation-plans/20260815-static-web-export.md §5.3):
 *   {
 *     "generatedAt": "ISO-8601",
 *     "mode": "prod | dev",
 *     "entries": {
 *       "view": { "html": "view.html", "files": [...] },
 *       "destination": { "html": "destination.html", "files": [...] }
 *     }
 *   }
 */

const fs = require('fs');
const path = require('path');
const {
	collectLocalFiles,
	extractHtmlRefs,
	extractTextRefs,
	extractModuleScripts,
	walkImports,
	walkCss,
} = require('./asset-graph.js');

const ROOT = path.resolve(__dirname, '..', '..');
const DIST_DIR = path.join(ROOT, 'dist');

const ENTRIES = [
	{ key: 'view', html: 'view.html' },
	{ key: 'destination', html: 'destination.html' },
];

// Fixed head-assets from shared/head.html that are NOT discovered by the
// reference walkers (non-asset extensions like .webmanifest/.xml, and favicons
// that only appear as HTML metadata). Filtered to files that actually exist.
const FIXED_HEAD_ASSETS = [
	'apple-touch-icon.png',
	'favicon-32x32.png',
	'favicon-16x16.png',
	'favicon.ico',
	'safari-pinned-tab.svg',
	'site.webmanifest',
	'browserconfig.xml',
	'mstile-150x150.png',
	'android-chrome-192x192.png',
	'android-chrome-512x512.png',
];

// P1-D self-host set — not referenced by the live HTML, so not discovered by
// the walkers. Kept stable (unhashed) so the P2 transform can reference them
// by fixed relative path. Added only when present (P1-D may not have landed).
const SELF_HOST_FILES = [
	'assets/vendor/iconify/iconify.min.js',
	'assets/json/iconify-icons.json',
	'assets/css/fonts.css',
];

// Files that must never appear in the export, even if referenced.
const EXCLUDED_FILES = new Set([
	'index.html',
	'expenses.html',
	'itinerary.html',
	'index.js',
	'firebase-config.js',
	'firebase.json',
	'firebase.dev.json',
	'static-export-manifest.json',
	'reload',
]);

const EXCLUDED_PREFIXES = ['edit/'];

// In prod, hash-assets content-hashes index.js / firebase-config.js, so the
// Firebase bootstrap appears in dist/ as index.<hash10>.js /
// firebase-config.<hash10>.js. Exclude both the stable (dev) and hashed (prod)
// forms — the exported page must never contain the Firebase bootstrap.
const BOOTSTRAP_RE = /^(index|firebase-config)\.[a-f0-9]+\.js$/;

function isFirebaseBootstrapRel(rel) {
	return rel === 'index.js' || rel === 'firebase-config.js' || BOOTSTRAP_RE.test(rel);
}

function fileExists(root, rel) {
	return fs.existsSync(path.join(root, rel.split('/').join(path.sep)));
}

function isExcludedRel(rel) {
	return (
		EXCLUDED_FILES.has(rel) ||
		isFirebaseBootstrapRel(rel) ||
		EXCLUDED_PREFIXES.some((p) => rel === p.slice(0, -1) || rel.startsWith(p))
	);
}

/** Build the file set for one entry (view.html / destination.html). */
function buildEntry(root, entry) {
	const htmlRel = entry.html;
	const htmlPath = path.join(root, htmlRel);
	if (!fs.existsSync(htmlPath)) {
		throw new Error(`[static-export-manifest] ${htmlRel} not found in dist/`);
	}
	const html = fs.readFileSync(htmlPath, 'utf8');
	const baseDirRel = '';

	const files = new Set([htmlRel]);

	// 1. Direct HTML references (script src, link href, img src, meta config).
	for (const ref of extractHtmlRefs(html, baseDirRel)) files.add(ref);

	// 2. Entry JS import closure (module scripts only; the Firebase bootstrap
	// — index.js / firebase-config.js and their hashed prod forms — excluded).
	const entryJs = extractModuleScripts(html, baseDirRel).filter(
		(f) => f.endsWith('.js') && !isFirebaseBootstrapRel(f),
	);
	for (const f of entryJs) files.add(f);
	for (const f of walkImports(root, entryJs)) files.add(f);

	// 3. CSS @import/url() closure (from every CSS referenced so far).
	const cssFiles = [...files].filter((f) => f.endsWith('.css'));
	for (const f of walkCss(root, cssFiles)) files.add(f);

	// 4. Fixed head assets + P1-D self-host set + the self-hosted font dir.
	for (const f of FIXED_HEAD_ASSETS) if (fileExists(root, f)) files.add(f);
	for (const f of SELF_HOST_FILES) if (fileExists(root, f)) files.add(f);
	for (const f of collectLocalFiles(root)) if (f.startsWith('assets/fonts/')) files.add(f);

	// 5. Apply exclusions and sort for determinism.
	const out = [...files].filter((f) => !isExcludedRel(f)).sort();

	return { html: htmlRel, files: out };
}

/**
 * Verification pass: rescan the entry HTML and every non-vendor text asset in
 * the computed set; any reference to a REAL local file that is missing from
 * the set is a gap. Excluded files are intentionally omitted, so references to
 * them are tolerated (e.g. the index.js bootstrap present in every HTML).
 */
function verifyEntry(root, built) {
	const fileSet = new Set(built.files);
	const allFiles = new Set(collectLocalFiles(root));
	const gaps = new Set();

	// HTML — broad scan (any local path in an asset-bearing attribute).
	const html = fs.readFileSync(path.join(root, built.html), 'utf8');
	for (const ref of extractHtmlRefs(html, '')) {
		if (fileExists(root, ref) && !fileSet.has(ref) && !isExcludedRel(ref)) {
			gaps.add(`${built.html} → ${ref}`);
		}
	}

	// App JS/CSS/JSON — narrow scan (vendor is third-party; its internal refs
	// are already covered by walkCss and need not be re-litigated here).
	for (const rel of [...fileSet]) {
		if (rel.startsWith('assets/vendor/')) continue;
		const ext = path.posix.extname(rel).toLowerCase();
		if (ext !== '.js' && ext !== '.css' && ext !== '.json') continue;
		const abs = path.join(root, rel.split('/').join(path.sep));
		if (!fs.existsSync(abs)) {
			gaps.add(`${rel} (missing from disk)`);
			continue;
		}
		const content = fs.readFileSync(abs, 'utf8');
		const base = path.posix.dirname(rel) === '.' ? '' : path.posix.dirname(rel);
		for (const d of extractTextRefs(ext, content, base)) {
			if (allFiles.has(d) && !fileSet.has(d) && !isExcludedRel(d)) {
				gaps.add(`${rel} → ${d}`);
			}
		}
	}

	return [...gaps].sort();
}

/** Generate dist/static-export-manifest.json. Fails the build on any gap. */
function generateStaticExportManifest(distDir, options = {}) {
	const root = path.resolve(distDir);
	if (!fs.existsSync(root)) {
		console.warn('[static-export-manifest] dist/ not found; skipping manifest.');
		return null;
	}

	const mode = options.mode || 'prod';
	const entries = {};
	const allGaps = [];

	for (const entry of ENTRIES) {
		const built = buildEntry(root, entry);
		entries[entry.key] = { html: entry.html, files: built.files };
		allGaps.push(...verifyEntry(root, built));
	}

	if (allGaps.length > 0) {
		console.error(
			'\n[static-export-manifest] ❌ Verification failed — local assets referenced but missing from the manifest:',
		);
		for (const gap of allGaps) console.error(`  • ${gap}`);
		console.error('');
		process.exit(1);
	}

	const manifest = {
		generatedAt: new Date().toISOString(),
		mode,
		entries,
	};

	const outPath = path.join(root, 'static-export-manifest.json');
	fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2) + '\n');
	console.log(
		`[static-export-manifest] Wrote dist/static-export-manifest.json ` +
			`(view: ${entries.view.files.length} files, destination: ${entries.destination.files.length} files).`,
	);
	return manifest;
}

// --- Run (when called directly) ---
if (require.main === module) {
	const mode = process.argv.includes('--mode') ? process.argv[process.argv.indexOf('--mode') + 1] : 'prod';
	generateStaticExportManifest(DIST_DIR, { mode });
}

module.exports = { generateStaticExportManifest };
