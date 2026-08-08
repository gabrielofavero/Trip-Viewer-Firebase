/**
 * scripts/build/hash-assets.js
 *
 * Content-hashes every local .js/.css file in dist/ so that the immutable
 * Cache-Control (max-age=31536000, immutable) applied to *.js/*.css in
 * firebase.json is always correct after a deploy.
 *
 * Why DEEP hashing? A module's filename must change when it OR anything it
 * (transitively) imports changes. A shallow per-file hash would keep an
 * importer's name stable when only its dependency changed, leaving the browser
 * with a cached importer pointing at an old (now deleted) dependency — which
 * 404s and breaks the app. Deep hashing folds each dependency's hash into the
 * file's own hash, so a change anywhere propagates up to every importer.
 *
 * What it does:
 *   - Renames files to <stem>.<sha1-10><ext>.
 *   - Rewrites references:
 *       HTML: <link href="*.css"> / <script src="*.js"> (local paths only)
 *       JS:   import / export ... from "...", side-effect import "...",
 *             dynamic import("...") specifiers (relative or /assets/...)
 *       CSS:  @import "*.css"
 *   - Non-local references (https://, //, data:, /__/firebase/*, ...) are left
 *     untouched, as are images/fonts (they are not immutable-cached).
 *
 * Unchanged content keeps the same name, so browser caches stay valid; changed
 * content (directly or via deps) gets a fresh name and is re-downloaded.
 *
 * Run AFTER esbuild compilation, HTML partial injection, and the firebase
 * config / entry file copy (i.e. once dist/ contains the final asset graph).
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const HASH_LEN = 10;
const ASSET_EXTS = new Set(['.js', '.css']);

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

function toRel(root, abs) {
	return path.relative(root, abs).split(path.sep).join('/');
}

function sha1(text) {
	return crypto.createHash('sha1').update(text, 'utf8').digest('hex');
}

/** Is this a local asset reference we should consider rewriting? */
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
		/\.(js|css)$/i.test(spec.split('?')[0])
	);
}

/**
 * Hash all local .js/.css under distDir (deep, dependency-aware), rewrite every
 * reference in HTML/JS/CSS, and rename the files. Returns the number of
 * references rewritten.
 */
function hashAssets(distDir) {
	const root = path.resolve(distDir);
	if (!fs.existsSync(root)) return 0;

	const absFiles = collectFiles(root, ASSET_EXTS);
	const relFiles = absFiles.map((f) => toRel(root, f));
	const fileSet = new Set(relFiles);

	// Resolve a specifier (relative to baseDirRel, or /assets/...) to a
	// project-relative path, or null if it isn't a local asset we hash.
	const resolveToRel = (spec, baseDirRel) => {
		const clean = spec.split('?')[0];
		let joined;
		if (clean.startsWith('/')) joined = clean.replace(/^\/+/, '');
		else joined = path.posix.normalize(path.posix.join(baseDirRel, clean));
		joined = joined.replace(/^\/+/, '');
		return fileSet.has(joined) ? joined : null;
	};

	// Direct local dependencies of a JS module / CSS file.
	const extractDeps = (rel) => {
		const abs = path.join(root, rel.split('/').join(path.sep));
		const content = fs.readFileSync(abs, 'utf8');
		const baseDirRel = path.posix.dirname(rel) === '.' ? '' : path.posix.dirname(rel);
		const deps = new Set();
		const add = (spec) => {
			const d = resolveToRel(spec, baseDirRel);
			if (d) deps.add(d);
		};
		if (path.extname(rel).toLowerCase() === '.js') {
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
		} else {
			content.replace(/@import\s*["']([^"']+)["']/g, (_m, s) => {
				add(s);
				return _m;
			});
		}
		return [...deps];
	};

	// Deep hash: folds transitive dependency hashes into each file's own hash.
	const memo = new Map();
	const deepHash = (rel, visiting) => {
		if (memo.has(rel)) return memo.get(rel);
		if (visiting.has(rel)) {
			// Cycle guard: fall back to the file's own content hash.
			const abs = path.join(root, rel.split('/').join(path.sep));
			const h = sha1(fs.readFileSync(abs, 'utf8')).slice(0, HASH_LEN);
			memo.set(rel, h);
			return h;
		}
		visiting.add(rel);
		const abs = path.join(root, rel.split('/').join(path.sep));
		const content = fs.readFileSync(abs, 'utf8');
		const depPart = extractDeps(rel)
			.map((d) => `${d}:${deepHash(d, visiting)}`)
			.sort()
			.join('\u0000');
		visiting.delete(rel);
		const h = sha1(content + '\u0000' + depPart).slice(0, HASH_LEN);
		memo.set(rel, h);
		return h;
	};

	// rel -> hashed rel
	const map = new Map();
	for (const rel of relFiles) {
		const dir = path.posix.dirname(rel);
		const ext = path.posix.extname(rel);
		const stem = path.posix.basename(rel, ext);
		const h = deepHash(rel, new Set());
		map.set(rel, (dir === '.' ? '' : dir + '/') + `${stem}.${h}${ext}`);
	}

	// Rewrite a reference's basename to the hashed one, preserving the original
	// directory prefix exactly (./, ../, /assets/, assets/css/, ...). The prefix
	// matters: dropping "./" would turn a relative import into a bare specifier.
	const rewriteRef = (spec, baseDirRel) => {
		if (!isLocalSpec(spec)) return null;
		const qIdx = spec.indexOf('?');
		const clean = qIdx === -1 ? spec : spec.slice(0, qIdx);
		const query = qIdx === -1 ? '' : spec.slice(qIdx);
		const rel = resolveToRel(clean, baseDirRel);
		if (!rel) return null;
		const hashed = map.get(rel);
		if (!hashed) return null;
		const slashIdx = clean.lastIndexOf('/');
		const prefix = slashIdx === -1 ? '' : clean.slice(0, slashIdx + 1);
		return prefix + path.posix.basename(hashed) + query;
	};

	const baseDirOf = (rel) => (path.posix.dirname(rel) === '.' ? '' : path.posix.dirname(rel));
	let rewritten = 0;

	// 1) HTML: <link href="*.css"> / <script src="*.js">
	for (const abs of collectFiles(root, new Set(['.html']))) {
		const base = baseDirOf(toRel(root, abs));
		let html = fs.readFileSync(abs, 'utf8');
		let changed = false;
		html = html.replace(
			/(<script\b[^>]*\bsrc=|<link\b[^>]*\bhref=)["']([^"']+)["']/gi,
			(m, tag, spec) => {
				const n = rewriteRef(spec, base);
				if (!n) return m;
				changed = true;
				rewritten++;
				return `${tag}"${n}"`;
			},
		);
		if (changed) fs.writeFileSync(abs, html);
	}

	// 2) JS: import/export ... from "..." , side-effect import "..." , import("...")
	for (const abs of collectFiles(root, new Set(['.js']))) {
		const base = baseDirOf(toRel(root, abs));
		let js = fs.readFileSync(abs, 'utf8');
		let changed = false;

		js = js.replace(/\b(import|export)\b([^;]*?)\bfrom\s*["']([^"']+)["']/g, (m, kw, mid, spec) => {
			const n = rewriteRef(spec, base);
			if (!n) return m;
			changed = true;
			rewritten++;
			return `${kw}${mid}from "${n}"`;
		});
		js = js.replace(/\bimport\s*["']([^"']+)["']/g, (m, spec) => {
			const n = rewriteRef(spec, base);
			if (!n) return m;
			changed = true;
			rewritten++;
			return `import "${n}"`;
		});
		js = js.replace(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g, (m, spec) => {
			const n = rewriteRef(spec, base);
			if (!n) return m;
			changed = true;
			rewritten++;
			return `import("${n}")`;
		});

		if (changed) fs.writeFileSync(abs, js);
	}

	// 3) CSS: @import "*.css"
	for (const abs of collectFiles(root, new Set(['.css']))) {
		const base = baseDirOf(toRel(root, abs));
		let css = fs.readFileSync(abs, 'utf8');
		let changed = false;
		css = css.replace(/@import\s*["']([^"']+)["']/g, (m, spec) => {
			const n = rewriteRef(spec, base);
			if (!n) return m;
			changed = true;
			rewritten++;
			return `@import "${n}"`;
		});
		if (changed) fs.writeFileSync(abs, css);
	}

	// 4) Rename files to their hashed names.
	for (const rel of relFiles) {
		const hashed = map.get(rel);
		if (!hashed || hashed === rel) continue;
		const src = path.join(root, rel.split('/').join(path.sep));
		const dest = path.join(root, hashed.split('/').join(path.sep));
		fs.mkdirSync(path.dirname(dest), { recursive: true });
		fs.renameSync(src, dest);
	}

	return rewritten;
}

module.exports = { hashAssets };
