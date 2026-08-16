/**
 * scripts/build/asset-graph.js
 *
 * Reference parsers for the static-export manifest. This is intentionally
 * DECOUPLED from hash-assets.js: the hashing pass's rename/rewrite loop is
 * load-bearing, so this module copies the reference patterns it needs rather
 * than sharing code with it (a cross-cutting refactor would risk the hashing
 * pass's byte-identical behavior for no real benefit).
 *
 * What it parses (mirrors hash-assets.js, plus the HTML reference types the
 * hasher does not touch today):
 *   JS:   import / export ... from "...", side-effect import "...",
 *         dynamic import("..."), string-literal fetch("..."), and any other
 *         quoted string that resolves to a local asset (fetch targets,
 *         cache keys, image URLs).
 *   CSS:  @import "...", url(...) references to images/fonts.
 *   JSON: asset-path string values (root-relative).
 *   HTML: <script src>, <link href>, <img src>, <link rel="preload" href>,
 *         <link rel="manifest" href>, <meta name="msapplication-config"
 *         content> (the last three the hasher does not parse).
 *
 * Exports:
 *   collectLocalFiles(root)           — every local asset file (project-relative)
 *   walkImports(root, entryFiles)     — transitive JS/JSON closure from entries
 *   walkCss(root, cssFiles)           — transitive CSS @import/url() closure
 *   extractHtmlRefs(html, baseDirRel) — normalized local paths from HTML
 *   extractModuleScripts(html, base)  — normalized local .js module entries
 *   extractTextRefs(ext, content, base) — normalized refs from JS/CSS/JSON text
 *   isLocalSpec(spec) / isLocalPath(spec) / normalizeSpec(...) / normalizePath(...)
 */

const fs = require('fs');
const path = require('path');

// Extensions that may be the target of a local asset reference.
const LOCAL_REF_RE = /\.(?:js|css|png|jpe?g|webp|svg|gif|ico|woff2?|ttf|otf|json)$/i;

// CSS url(...) with quoted or unquoted payloads.
const URL_RE = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)"'\s]+))\s*\)/gi;

// Extensions treated as local assets (mirrors hash-assets.js ASSET_EXTS).
const ASSET_EXTS = new Set([
	'.js',
	'.css',
	'.png',
	'.jpg',
	'.jpeg',
	'.webp',
	'.svg',
	'.gif',
	'.ico',
	'.woff',
	'.woff2',
	'.ttf',
	'.otf',
	'.json',
]);

function toRel(root, abs) {
	return path.relative(root, abs).split(path.sep).join('/');
}

/**
 * Narrow local-reference test (extension required). Mirrors hash-assets.js so
 * the manifest's asset inventory is byte-identical in scope to the hasher's.
 */
function isLocalSpec(spec) {
	return (
		typeof spec === 'string' &&
		spec.length > 0 &&
		!spec.startsWith('http://') &&
		!spec.startsWith('https://') &&
		!spec.startsWith('//') &&
		!spec.startsWith('data:') &&
		!spec.startsWith('mailto:') &&
		!spec.startsWith('/__/') &&
		!spec.startsWith('#') &&
		LOCAL_REF_RE.test(spec.split('?')[0])
	);
}

/**
 * Broad local-path test (no extension requirement) — used only for HTML
 * attributes, where non-asset files like site.webmanifest and browserconfig.xml
 * are legitimate references.
 */
function isLocalPath(spec) {
	return (
		typeof spec === 'string' &&
		spec.length > 0 &&
		!spec.startsWith('http://') &&
		!spec.startsWith('https://') &&
		!spec.startsWith('//') &&
		!spec.startsWith('data:') &&
		!spec.startsWith('mailto:') &&
		!spec.startsWith('/__/') &&
		!spec.startsWith('#')
	);
}

/**
 * Resolve a spec to a project-relative path (no file-set gating), or null.
 * Narrow: requires an asset extension.
 */
function normalizeSpec(spec, baseDirRel) {
	if (!isLocalSpec(spec)) return null;
	const clean = spec.split('?')[0];
	let joined;
	if (clean.startsWith('/')) joined = clean.replace(/^\/+/, '');
	else joined = path.posix.normalize(path.posix.join(baseDirRel || '', clean));
	joined = joined.replace(/^\/+/, '');
	return joined === '' || joined === '.' ? null : joined;
}

/**
 * Resolve a spec to a project-relative path (no file-set gating), or null.
 * Broad: any non-external, non-anchor path (for HTML attributes).
 */
function normalizePath(spec, baseDirRel) {
	if (!isLocalPath(spec)) return null;
	const clean = spec.split('?')[0].split('#')[0];
	let joined;
	if (clean.startsWith('/')) joined = clean.replace(/^\/+/, '');
	else joined = path.posix.normalize(path.posix.join(baseDirRel || '', clean));
	joined = joined.replace(/^\/+/, '');
	return joined === '' || joined === '.' ? null : joined;
}

/** Recursively collect files under `root` with the given extensions. */
function collectFiles(root, exts) {
	const out = [];
	const walk = (dir) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (exts.has(path.extname(entry.name).toLowerCase())) out.push(full);
		}
	};
	walk(root);
	return out;
}

/** Every local asset file under root, as sorted project-relative paths. */
function collectLocalFiles(root) {
	return collectFiles(root, ASSET_EXTS).map((f) => toRel(root, f)).sort();
}

function readText(root, rel) {
	const abs = path.join(root, rel.split('/').join(path.sep));
	return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
}

function baseDirOf(rel) {
	return path.posix.dirname(rel) === '.' ? '' : path.posix.dirname(rel);
}

/**
 * Direct local references from a JS module / CSS file / JSON config.
 * Returns normalized project-relative paths (no file-set gating — callers
 * decide whether a resolved path actually exists).
 */
function extractTextRefs(ext, content, baseDirRel) {
	const refs = new Set();
	const add = (spec) => {
		const n = normalizeSpec(spec, baseDirRel);
		if (n) refs.add(n);
	};
	const addRoot = (spec) => {
		const n = normalizeSpec(spec, '');
		if (n) refs.add(n);
	};

	if (ext === '.js') {
		content.replace(/\b(import|export)\b([^;]*?)\bfrom\s*["']([^"']+)["']/g, (_m, _k, _mid, s) => {
			add(s);
			return _m;
		});
		content.replace(/\bimport\s*["']([^"']+)["']/g, (_m, s) => {
			add(s);
			return _m;
		});
		content.replace(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g, (_m, s) => {
			add(s);
			return _m;
		});
		content.replace(/\bfetch\s*\(\s*["']([^"']+)["']\s*\)/g, (_m, s) => {
			add(s);
			return _m;
		});
		// Any remaining quoted string that resolves to a local asset
		// (e.g. loadJSON("/assets/json/colors.json"), _cache[...] keys).
		content.replace(/["']([^"'\n]+)["']/g, (_m, s) => {
			add(s);
			return _m;
		});
	} else if (ext === '.css') {
		content.replace(/@import\s*["']([^"']+)["']/g, (_m, s) => {
			add(s);
			return _m;
		});
		content.replace(URL_RE, (_m, dq, sq, bare) => {
			add(dq !== undefined ? dq : sq !== undefined ? sq : bare);
			return _m;
		});
	} else if (ext === '.json') {
		content.replace(/"([^"\n]+)"/g, (_m, val) => {
			if (isLocalSpec(val)) addRoot(val);
			return _m;
		});
	}

	return [...refs];
}

/**
 * Normalized local references from HTML asset-bearing attributes.
 * Covers <script src>, <link href> (stylesheet/preload/manifest/icon/...),
 * <img src>, and <meta name="msapplication-config" content>.
 */
function extractHtmlRefs(html, baseDirRel) {
	const refs = new Set();
	const add = (spec) => {
		const n = normalizePath(spec, baseDirRel);
		if (n) refs.add(n);
	};

	html.replace(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, (_m, s) => {
		add(s);
		return _m;
	});
	html.replace(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi, (_m, s) => {
		add(s);
		return _m;
	});
	html.replace(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi, (_m, s) => {
		add(s);
		return _m;
	});
	// Both attribute orders for <meta name="msapplication-config" content="...">
	html.replace(
		/<meta\b[^>]*\bname=["']msapplication-config["'][^>]*\bcontent=["']([^"']+)["'][^>]*>/gi,
		(_m, s) => {
			add(s);
			return _m;
		},
	);
	html.replace(
		/<meta\b[^>]*\bcontent=["']([^"']+)["'][^>]*\bname=["']msapplication-config["'][^>]*>/gi,
		(_m, s) => {
			add(s);
			return _m;
		},
	);

	return [...refs];
}

/**
 * Normalized local .js entries of <script type="module" src="..."> tags.
 * Attribute-order agnostic (src and type may appear in any order).
 */
function extractModuleScripts(html, baseDirRel) {
	const out = [];
	html.replace(/<script\b([^>]*)>/gi, (_m, attrs) => {
		if (!/\btype=["']module["']/i.test(attrs)) return _m;
		const src = attrs.match(/\bsrc=["']([^"']+)["']/i);
		if (!src) return _m;
		const n = normalizePath(src[1], baseDirRel);
		if (n) out.push(n);
		return _m;
	});
	return out;
}

/**
 * Transitive closure of JS module imports (and JSON asset-path values) from
 * the given entry files. Only recurses into .js/.json files; CSS is walked
 * separately via walkCss. Returns sorted project-relative paths.
 */
function walkImports(root, entryFiles) {
	const allFiles = new Set(collectLocalFiles(root));
	const seen = new Set();
	const queue = entryFiles.filter((f) => allFiles.has(f));
	const out = new Set(queue);

	while (queue.length) {
		const rel = queue.shift();
		if (seen.has(rel)) continue;
		seen.add(rel);

		const ext = path.posix.extname(rel).toLowerCase();
		if (ext !== '.js' && ext !== '.json') continue;

		const content = readText(root, rel);
		if (content == null) continue;

		for (const d of extractTextRefs(ext, content, baseDirOf(rel))) {
			if (!allFiles.has(d)) continue;
			out.add(d);
			const dext = path.posix.extname(d).toLowerCase();
			if (dext === '.js' || dext === '.json') queue.push(d);
		}
	}

	return [...out].sort();
}

/**
 * Transitive closure of CSS @import/url() references from the given CSS files.
 * Only recurses into .css files; images/fonts are added without recursion.
 * Returns sorted project-relative paths.
 */
function walkCss(root, cssFiles) {
	const allFiles = new Set(collectLocalFiles(root));
	const seen = new Set();
	const queue = cssFiles.filter(
		(f) => allFiles.has(f) && path.posix.extname(f).toLowerCase() === '.css',
	);
	const out = new Set(queue);

	while (queue.length) {
		const rel = queue.shift();
		if (seen.has(rel)) continue;
		seen.add(rel);

		const content = readText(root, rel);
		if (content == null) continue;

		for (const d of extractTextRefs('.css', content, baseDirOf(rel))) {
			if (!allFiles.has(d)) continue;
			out.add(d);
			if (path.posix.extname(d).toLowerCase() === '.css') queue.push(d);
		}
	}

	return [...out].sort();
}

module.exports = {
	collectLocalFiles,
	isLocalSpec,
	isLocalPath,
	normalizeSpec,
	normalizePath,
	extractTextRefs,
	extractHtmlRefs,
	extractModuleScripts,
	walkImports,
	walkCss,
};
