/**
 * scripts/build/vendor-fonts.js
 *
 * Self-hosts the Google Fonts web fonts referenced in public/shared/head.html
 * so the exported static page can render them with zero requests to
 * fonts.googleapis.com.
 *
 * For each family/weight listed in the head.html Google Fonts URL, this script
 * downloads the latin-subset woff2 file into public/assets/fonts/ and generates
 * public/assets/css/fonts.css with matching @font-face rules (font-display:
 * swap). Both outputs are committed; the live site keeps its CDN <link>
 * unchanged.
 *
 * Idempotent: when the generated files already match the current head.html
 * font list, it exits without any network request. `--force` re-downloads.
 *
 * Usage:
 *   node scripts/build/vendor-fonts.js
 *   node scripts/build/vendor-fonts.js --force
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = path.resolve(__dirname, '..', '..');
const HEAD_HTML = path.join(ROOT, 'public', 'shared', 'head.html');
const FONTS_DIR = path.join(ROOT, 'public', 'assets', 'fonts');
const FONTS_CSS = path.join(ROOT, 'public', 'assets', 'css', 'fonts.css');

const FORCE = process.argv.includes('--force');
// Modern Chrome UA forces Google Fonts to serve woff2 (the only format we need).
const WOFF2_UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function httpGet(url, { binary = false } = {}) {
	return new Promise((resolve, reject) => {
		https
			.get(url, { headers: { 'User-Agent': WOFF2_UA } }, (res) => {
				const status = res.statusCode || 0;
				if (status >= 300 && status < 400 && res.headers.location) {
					res.resume();
					resolve(httpGet(res.headers.location, { binary }));
					return;
				}
				if (status !== 200) {
					res.resume();
					reject(new Error(`HTTP ${status} fetching ${url}`));
					return;
				}
				if (binary) {
					const chunks = [];
					res.on('data', (c) => chunks.push(c));
					res.on('end', () => resolve(Buffer.concat(chunks)));
				} else {
					let data = '';
					res.on('data', (c) => (data += c));
					res.on('end', () => resolve(data));
				}
			})
			.on('error', reject);
	});
}

/**
 * Parse the classic Google Fonts CSS URL in head.html into an ordered list of
 * { family, weights: [{ weight, style }] }.
 */
function parseFontSpec() {
	const html = fs.readFileSync(HEAD_HTML, 'utf8');
	const m = html.match(/https:\/\/fonts\.googleapis\.com\/css\?family=([^"'\s]+)/);
	if (!m) {
		throw new Error('[vendor-fonts] Google Fonts <link> not found in shared/head.html');
	}
	const specUrl = m[0];
	const families = [];
	for (const chunk of m[1].split('|')) {
		const colon = chunk.indexOf(':');
		const familyEncoded = colon === -1 ? chunk : chunk.slice(0, colon);
		const weightsStr = colon === -1 ? '' : chunk.slice(colon + 1);
		const family = familyEncoded.replace(/\+/g, ' ').trim();
		const weights = [];
		for (const token of weightsStr.split(',')) {
			if (!token) continue;
			const italic = token.endsWith('i');
			const weight = italic ? token.slice(0, -1) : token;
			weights.push({ weight, style: italic ? 'italic' : 'normal' });
		}
		if (family) families.push({ family, weights, encoded: familyEncoded });
	}
	return { families, specUrl };
}

function slug(family) {
	return family.toLowerCase().replace(/\s+/g, '-');
}

/**
 * Fetch the CSS for one family and return the latin-subset faces:
 * [{ family, style, weight, woff2Url }]. The classic API ignores `&subset=`,
 * returning one @font-face block per style/weight per subset, so we keep only
 * the blocks whose unicode-range is the latin subset (U+0000-00FF …).
 */
async function fetchFamilyCss({ family, encoded, weights }) {
	const weightList = weights.map((w) => (w.style === 'italic' ? `${w.weight}i` : w.weight)).join(',');
	const url = `https://fonts.googleapis.com/css?family=${encoded}:${weightList}`;
	const css = await httpGet(url);

	const out = [];
	const blockRe = /@font-face\s*\{([^{}]+)\}/g;
	let m;
	while ((m = blockRe.exec(css)) !== null) {
		const block = m[1];
		if (!/unicode-range:\s*U\+0000-00FF\b/.test(block)) continue; // latin subset only
		const styleMatch = block.match(/font-style:\s*([a-z]+)/);
		const weightMatch = block.match(/font-weight:\s*(\d+)/);
		const urlMatch = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
		if (!styleMatch || !weightMatch || !urlMatch) continue;
		out.push({
			family,
			style: styleMatch[1],
			weight: weightMatch[1],
			woff2Url: urlMatch[1],
		});
	}

	// Each requested style/weight must have exactly one latin block.
	const key = (face) => `${face.style}/${face.weight}`;
	const seen = new Set(out.map(key));
	const expected = new Set(weights.map((w) => `${w.style}/${w.weight}`));
	const missing = [...expected].filter((k) => !seen.has(k));
	if (missing.length > 0) {
		throw new Error(
			`[vendor-fonts] Missing latin subset for "${family}": ${missing.join(', ')}.`,
		);
	}
	return out;
}

/**
 * Download every face, deduplicating identical woff2 URLs (variable fonts
 * cover many weights with one file). Assigns each face a committed filename.
 */
async function downloadFaces(families) {
	const faces = [];
	for (const spec of families) {
		faces.push(...(await fetchFamilyCss(spec)));
	}

	fs.mkdirSync(FONTS_DIR, { recursive: true });
	// Clear any stale files from a previous generation (naming may change when
	// head.html changes); the committed files are recreated below.
	for (const entry of fs.readdirSync(FONTS_DIR)) {
		if (entry.endsWith('.woff2')) fs.rmSync(path.join(FONTS_DIR, entry));
	}

	// URL → filename, so the same variable font is written exactly once.
	const urlToFile = new Map();
	const styleCount = new Map();

	for (const face of faces) {
		let file = urlToFile.get(face.woff2Url);
		if (!file) {
			const base = `${slug(face.family)}-${face.style}`;
			const n = (styleCount.get(base) || 0) + 1;
			styleCount.set(base, n);
			file = n === 1 ? `${base}-latin.woff2` : `${base}-latin-${n}.woff2`;
			urlToFile.set(face.woff2Url, file);
			const buffer = await httpGet(face.woff2Url, { binary: true });
			fs.writeFileSync(path.join(FONTS_DIR, file), buffer);
			console.log(`[vendor-fonts] Downloaded ${file} (${buffer.length} bytes).`);
		}
		face.file = file;
	}
	return faces;
}

function buildCss(faces) {
	const lines = [
		'/*',
		'  Self-hosted web fonts generated by scripts/build/vendor-fonts.js.',
		'  Source: the Google Fonts <link> in public/shared/head.html.',
		'  Do not edit by hand — re-run `node scripts/build/vendor-fonts.js`.',
		'*/',
		'',
	];
	for (const face of faces) {
		lines.push('@font-face {');
		lines.push(`\tfont-family: '${face.family}';`);
		lines.push(`\tfont-style: ${face.style};`);
		lines.push(`\tfont-weight: ${face.weight};`);
		lines.push(`\tsrc: url("../fonts/${face.file}") format("woff2");`);
		lines.push('\tfont-display: swap;');
		lines.push('}');
		lines.push('');
	}
	return lines.join('\n') + '\n';
}

/**
 * Parse the existing generated fonts.css and return the set of
 * `${family}|${style}|${weight}` triplets it declares plus the referenced files.
 */
function parseExistingCss() {
	const css = fs.readFileSync(FONTS_CSS, 'utf8');
	const keys = new Set();
	const files = new Set();
	const blockRe = /@font-face\s*\{([^{}]+)\}/g;
	let m;
	while ((m = blockRe.exec(css)) !== null) {
		const block = m[1];
		const family = block.match(/font-family:\s*['"]?([^'";]+)['"]?/);
		const style = block.match(/font-style:\s*([a-z]+)/);
		const weight = block.match(/font-weight:\s*(\d+)/);
		const src = block.match(/url\("?\.\.\/fonts\/([^)"?]+)\.woff2"?\)/);
		if (family && style && weight) keys.add(`${family[1].trim()}|${style[1]}|${weight[1]}`);
		if (src) files.add(src[1]);
	}
	return { keys, files };
}

async function main() {
	const { families, specUrl } = parseFontSpec();
	const expectedKeys = new Set(
		families.flatMap((f) => f.weights.map((w) => `${f.family}|${w.style}|${w.weight}`)),
	);

	if (!FORCE && fs.existsSync(FONTS_CSS)) {
		const { keys, files } = parseExistingCss();
		const covered = [...expectedKeys].every((k) => keys.has(k));
		const filesExist = [...files].every((f) => fs.existsSync(path.join(FONTS_DIR, `${f}.woff2`)));
		if (covered && filesExist) {
			console.log('[vendor-fonts] Fonts up to date — nothing to download.');
			return;
		}
	}

	console.log(`[vendor-fonts] Self-hosting ${expectedKeys.size} font face(s) from ${specUrl}`);
	const faces = await downloadFaces(families);
	fs.mkdirSync(path.dirname(FONTS_CSS), { recursive: true });
	fs.writeFileSync(FONTS_CSS, buildCss(faces));
	console.log(`[vendor-fonts] Wrote ${path.relative(ROOT, FONTS_CSS)}.`);
}

main().catch((err) => {
	console.error(err && err.message ? err.message : err);
	process.exit(1);
});
