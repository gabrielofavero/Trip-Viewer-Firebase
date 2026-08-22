// ============================================================
// Static Export — ZIP Builder (P2)
// ============================================================
// Turns the `data.json` bundle produced by `data-gather.ts` (+ the user's app
// title/icon choices) into a downloadable, self-contained ZIP that renders the
// view / destination experience with no Firebase SDK and no CDN requests
// (icons + web fonts are self-hosted).
//
// Flow (see docs/implementation-plans/20260815-static-web-export.md §P2):
//   1. fetch dist/static-export-manifest.json → pick the entry file set
//   2. fetch every manifest file (same-origin) into the zip (path = rel path)
//   3. transform the entry HTML:
//        - strip Firebase SDK scripts, the module bootstrap, gapi, live-reload
//          and the dev nav-helper
//        - replace the Iconify CDN <script> with the vendored runtime plus an
//          inline collection registration (runs before Iconify scans [data-icon])
//        - replace the Google Fonts <link> with self-hosted assets/css/fonts.css
//        - rebase root-absolute asset URLs to relative (any host / subfolder)
//        - make the page standalone: logo is not a link, no back/home buttons,
//          share hidden (P3)
//        - inject the §5.1 static bootstrap before the entry module script
//        - set <title> + PWA meta from the chosen app title
//   4. complete mode: download mapped images → images/<sha1-12>.<ext>,
//      rewrite those URLs inside data.paths, and report failures
//   5. write data.json + a generated site.webmanifest (+ the custom icon)
//   6. zip with JSZip → Blob → download
//
// The exported page must be served over HTTP (ESM + fetch() do not run from
// file://) — see §2 Key facts of the plan.
//
// Remaining external dependencies in the export (documented — P3):
//   - GLightbox's video player lazily loads Plyr from cdn.plyr.io the first
//     time a video lightbox is opened. It is not referenced in the HTML (no
//     static <script>), so it never loads unless the user opens a video, and
//     it is the ONLY remaining network resource dependency: icons, web fonts,
//     Chart.js and the app chrome are all self-hosted in the bundle.
//   - The page footer's "Developed by" <a href="https://www.linkedin.com/…">
//     is a plain hyperlink (not a resource load) and is left as-is.
// ============================================================

// ============================================================
// Types
// ============================================================

import { getFirebaseIdToken } from '../data/firebase/auth.js';
import { translate } from '../i18n/translation.js';
import type { ExportStaticProgress } from './data-gather.js';

export interface StaticExportData {
	meta: {
		version: number;
		type: 'trip' | 'destination' | 'listing';
		sourceId: string;
		title: string;
		exportedAt: string;
		ownerUid: string;
		mode: 'light' | 'complete';
		images: Record<string, string>;
	};
	paths: Record<string, any>;
}

export interface StaticExportConfig {
	/** User-chosen app/page title (falls back to the document title). */
	appTitle: string;
	/** Data URL of the optional custom app icon ('' = use the default icons). */
	iconDataUrl: string;
}

export interface StaticExportResult {
	downloadedImages: number;
	failedImages: string[];
	fileCount: number;
}

interface ManifestShape {
	entries: Record<string, { html: string; files: string[] }>;
}

interface TransformOptions {
	appTitle: string;
	ownerUid: string;
	mode: 'light' | 'complete';
	iconPath: string;
	dataUrl: string;
}

// ============================================================
// Public API
// ============================================================

export async function buildStaticExport(
	data: StaticExportData,
	config: StaticExportConfig,
	onProgress?: ExportStaticProgress,
): Promise<StaticExportResult> {
	const emit = (message: string, progress: number) => onProgress?.(message, progress);

	const type = data?.meta?.type || 'trip';
	const entryKey = type === 'destination' ? 'destination' : 'view';
	const mode: 'light' | 'complete' = data?.meta?.mode === 'complete' ? 'complete' : 'light';
	const ownerUid = data?.meta?.ownerUid || '';
	const dataUrl = 'data.json';
	const appTitle = config.appTitle || data?.meta?.title || 'Trip Viewer';

	// 1. Manifest → the exact file set this entry needs.
	emit(translate('account.export_static.loading.assets'), 40);
	const manifest = await fetchManifest();
	const entry = manifest.entries[entryKey];
	if (!entry) {
		throw new Error(`[static-export] No manifest entry for "${entryKey}".`);
	}

	const zip = new JSZip();

	// 2. Custom icon first, so the bootstrap + webmanifest can reference it.
	let iconPath = '';
	if (config.iconDataUrl) {
		iconPath = addCustomIcon(zip, config.iconDataUrl);
	}

	// 3. Fetch every manifest file into the zip (zip path = manifest path).
	await addManifestFiles(zip, entry, (done, total) => {
		emit(
			translate('account.export_static.loading.assets'),
			40 + (total > 0 ? (done / total) * 30 : 30),
		);
	});

	// 4. Transform the entry HTML.
	emit(translate('account.export_static.loading.building'), 70);
	const html = await fetchText(entry.html);
	const iconifyJson = entry.files.includes('assets/json/iconify-icons.json')
		? await fetchText('assets/json/iconify-icons.json')
		: '{}';
	const transformed = transformHtml(html, iconifyJson, {
		appTitle,
		ownerUid,
		mode,
		iconPath,
		dataUrl,
	});
	zip.file(entry.html, transformed);

	// 5. Complete mode: download mapped images + rewrite URLs in data.
	const result: StaticExportResult = {
		downloadedImages: 0,
		failedImages: [],
		fileCount: entry.files.length + 2, // + data.json + site.webmanifest
	};
	if (mode === 'complete') {
		const images = await downloadImages(zip, data, (done, total) => {
			emit(
				translate('account.export_static.loading.images', {
					current: String(done),
					total: String(total),
				}),
				70 + (total > 0 ? (done / total) * 20 : 20),
			);
		});
		result.downloadedImages = images.downloaded;
		result.failedImages = images.failed;
	}

	// 6. data.json + generated site.webmanifest.
	emit(translate('account.export_static.loading.finishing'), 90);
	zip.file(dataUrl, JSON.stringify(data, null, 2));
	zip.file('site.webmanifest', buildSiteManifest(appTitle, iconPath));

	// 7. Zip → Blob → download.
	emit(translate('account.export_static.loading.finishing'), 95);
	await downloadZip(zip, type, data?.meta?.title || data?.meta?.sourceId);

	emit(translate('account.export_static.loading.finishing'), 100);

	return result;
}

// ============================================================
// Manifest + asset fetching
// ============================================================

async function fetchManifest(): Promise<ManifestShape> {
	const res = await fetch('static-export-manifest.json');
	if (!res.ok) {
		throw new Error(`[static-export] Failed to fetch static-export-manifest.json (${res.status}).`);
	}
	return res.json();
}

async function fetchText(rel: string): Promise<string> {
	const res = await fetch(rel);
	if (!res.ok) {
		throw new Error(`[static-export] Failed to fetch ${rel} (${res.status}).`);
	}
	return res.text();
}

// Files we always generate ourselves and must NOT be copied from dist (the
// manifest may list site.webmanifest; data.json is defensive). Copying them
// as Blobs and later overwriting with a string trips a JSZip quirk where the
// overwritten entry can no longer be read back.
const GENERATED_FILES = new Set(['site.webmanifest', 'data.json']);

async function addManifestFiles(
	zip: any,
	entry: { html: string; files: string[] },
	onProgress?: (done: number, total: number) => void,
): Promise<void> {
	const files = entry.files.filter((rel) => rel !== entry.html && !GENERATED_FILES.has(rel));
	const total = files.length;
	let done = 0;
	for (const rel of files) {
		const res = await fetch(rel);
		if (!res.ok) {
			throw new Error(`[static-export] Failed to fetch ${rel} (${res.status}).`);
		}
		zip.file(rel, await res.blob());
		done++;
		onProgress?.(done, total);
	}
}

// ============================================================
// Complete mode — image download + URL rewrite
// ============================================================

/** Deployed Cloudflare image-proxy worker route (dev + prd share this URL). */
const IMAGE_PROXY_DEPLOYED_URL =
	'https://trip-viewer-image-proxy.gabriel-o-favero.workers.dev';
/** Local image-proxy via `wrangler dev` (workers/image-proxy/README.md). */
const IMAGE_PROXY_LOCAL_URL = 'http://localhost:8789';

/** Hostnames that count as a LOCAL development environment (same set as places-api). */
const IMAGE_PROXY_LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function resolveImageProxyUrl(): string {
	const hostname = window?.location?.hostname || '';
	return IMAGE_PROXY_LOCAL_HOSTS.has(hostname)
		? IMAGE_PROXY_LOCAL_URL
		: IMAGE_PROXY_DEPLOYED_URL;
}

interface ImageProxyImage {
	url: string;
	contentType: string;
	size: number;
	offset: number;
}

interface ImageProxyEnvelope {
	images: ImageProxyImage[];
	failed: { url: string; reason: string }[];
}

/**
 * Batch-download image URLs through the image-proxy worker in a SINGLE
 * request (the user requirement: one request for all images, not one per
 * image). The worker fetches server-side (no CORS) and returns a binary
 * envelope: a JSON header line, a `\n`, then the image bytes concatenated
 * (offsets are relative to the byte AFTER the header `\n`).
 *
 * Returns a `Map<originalUrl, Blob>` for the images the worker delivered, or
 * `null` when the worker is unreachable (not deployed / auth failed) — the
 * caller then falls back to per-URL direct fetch.
 */
async function batchDownloadImages(urls: string[]): Promise<Map<string, Blob> | null> {
	if (urls.length === 0) return new Map();

	let token = '';
	try {
		token = await getFirebaseIdToken();
	} catch {
		// Not authenticated (export always is, but be safe) → worker would 401.
		return null;
	}

	try {
		const res = await fetch(resolveImageProxyUrl(), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify({ urls }),
		});
		if (!res.ok) return null;

		const buf = new Uint8Array(await res.arrayBuffer());
		const nl = buf.indexOf(0x0a); // first '\n' separates header from body
		if (nl < 0) return null;
		const header = JSON.parse(new TextDecoder().decode(buf.slice(0, nl))) as ImageProxyEnvelope;
		const bodyStart = nl + 1;

		const map = new Map<string, Blob>();
		for (const img of header.images) {
			const start = bodyStart + img.offset;
			const bytes = buf.slice(start, start + img.size);
			if (bytes.length !== img.size) continue; // truncated → treat as missing
			const blob = new Blob([bytes], { type: img.contentType });
			if (blob.size > 0) map.set(img.url, blob);
		}
		return map;
	} catch {
		return null; // worker down / not deployed → fall back to direct fetch
	}
}

async function downloadImages(
	zip: any,
	data: StaticExportData,
	onProgress?: (done: number, total: number) => void,
): Promise<{ downloaded: number; failed: string[] }> {
	const images = data?.meta?.images;
	if (!images) return { downloaded: 0, failed: [] };

	const entries = Object.entries(images);
	const total = entries.length;
	let downloaded = 0;
	let done = 0;
	const failed: string[] = [];

	// Preferred path: ONE worker request with ALL image URLs. Per-URL direct
	// fetch is only a fallback for URLs the worker couldn't deliver (or when
	// the worker is unreachable).
	const workerBlobs = await batchDownloadImages(entries.map(([url]) => url));

	for (const [originalUrl, localPath] of entries) {
		const blob = workerBlobs?.get(originalUrl) ?? (await downloadImage(originalUrl));
		done++;
		if (blob && blob.size > 0) {
			zip.file(localPath, blob);
			rewriteUrlInPaths(data, originalUrl, localPath);
			downloaded++;
		} else {
			failed.push(originalUrl);
			// Not downloaded → keep the original URL in the data; drop the
			// (now misleading) local mapping so the export is honest.
			delete data.meta.images[originalUrl];
		}
		onProgress?.(done, total);
	}

	return { downloaded, failed };
}

async function downloadImage(url: string): Promise<Blob | null> {
	// Direct fetch (CORS-enabled hosts only). There is NO `no-cors` opaque
	// fallback anymore: an opaque response's `.blob()` is always 0 bytes, which
	// silently produced the 0-byte corrupt images. CORS-blocked hosts are now
	// handled by the image-proxy worker (batchDownloadImages above).
	try {
		const res = await fetch(url);
		if (!res.ok) return null;
		const blob = await res.blob();
		return blob.size > 0 ? blob : null;
	} catch {
		return null;
	}
}

/** Rewrite an image URL inside data.paths only (keeps meta.images as the
 *  original → local mapping so the export records what was downloaded). */
function rewriteUrlInPaths(data: StaticExportData, original: string, localPath: string): void {
	const json = JSON.stringify(data.paths);
	data.paths = JSON.parse(json.split(original).join(localPath));
}

// ============================================================
// Custom icon + site.webmanifest
// ============================================================

function addCustomIcon(zip: any, iconDataUrl: string): string {
	const match = /^data:([^;,]+)[^,]*,(.*)$/s.exec(iconDataUrl);
	if (!match) return '';

	const mime = match[1] || 'image/png';
	const ext = mimeToExt(mime);
	const binary = atob(match[2]);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}

	const iconPath = `images/app-icon.${ext}`;
	zip.file(iconPath, bytes);
	return iconPath;
}

function mimeToExt(mime: string): string {
	const type = mime.split('/')[1] || 'png';
	if (type === 'svg+xml') return 'svg';
	if (type === 'jpeg') return 'jpg';
	return type.replace(/[^a-z0-9]/gi, '') || 'png';
}

function buildSiteManifest(appTitle: string, iconPath: string): string {
	const icons: Array<Record<string, string>> = [
		{ src: 'android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
		{ src: 'android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
	];
	if (iconPath) {
		icons.unshift({ src: iconPath, sizes: 'any', type: 'image/png' });
	}

	return JSON.stringify(
		{
			name: appTitle,
			short_name: appTitle,
			icons,
			theme_color: '#eae8f4',
			background_color: '#eae8f4',
			display: 'standalone',
		},
		null,
		2,
	);
}

// ============================================================
// HTML transform
// ============================================================

function transformHtml(html: string, iconifyJson: string, opts: TransformOptions): string {
	let out = html;

	// a. Firebase SDK bootstrap (compat SDKs + init.js).
	out = out.replace(/<script[^>]*\bsrc="\/__\/firebase\/[^"]*"[^>]*>\s*<\/script>\s*/g, '');

	// b. Firebase module bootstrap — index.js / firebase-config.js (and their
	//    prod content-hashed forms). Must be removed BEFORE the bootstrap
	//    injection so the first remaining module script is the page entry.
	out = out.replace(
		/<script[^>]*type="module"[^>]*\bsrc="(?:index(?:\.js)?|index\.[a-f0-9]{8,}\.js|firebase-config(?:\.js)?|firebase-config\.[a-f0-9]{8,}\.js)"[^>]*>\s*<\/script>\s*/gi,
		'',
	);

	// c. Dead Google API loader (no .ts file references gapi).
	out = out.replace(
		/<script[^>]*\bsrc="https:\/\/apis\.google\.com\/js\/api\.js"[^>]*>\s*<\/script>\s*/gi,
		'',
	);

	// d. Iconify CDN → vendored runtime + inline collection registration.
	out = out.replace(
		/<script[^>]*\bsrc="https:\/\/code\.iconify\.design\/[^"]*"[^>]*>\s*<\/script>\s*/gi,
		buildIconifyBootstrap(iconifyJson),
	);

	// e. Google Fonts <link> → self-hosted fonts.css (woff2 files are already
	//    in the manifest).
	out = out.replace(
		/<link[^>]*\bhref="https:\/\/fonts\.googleapis\.com\/[^"]*"[^>]*>\s*/gi,
		'<link href="assets/css/fonts.css" rel="stylesheet">\n',
	);

	// f. Rebase root-absolute asset URLs → relative so the page works from
	//    any static host or subfolder path (dist already uses relative paths;
	//    this is defensive for absolute references).
	out = rebaseAssetUrls(out);

	// g. Strip dev-only chrome: the injected nav-helper and live-reload blocks.
	out = stripBlock(out, 'Shared Dev Nav Helper');
	out = stripBlock(out, 'Live-reload polling script');
	out = out.replace(/<!--\s*#include shared\/livereload\.html\s*-->\s*/g, '');

	// g2. P3 — standalone chrome: the exported page must have no clickable
	//     TripViewer logo and no back/home affordances, and the share button
	//     must stay hidden (it would share a local URL recipients can't open).
	out = stripStandaloneChrome(out);

	// h. Inject the §5.1 static bootstrap before the entry module script.
	out = injectStaticBootstrap(out, opts);

	// i. <title> + PWA meta from the chosen app title.
	out = setPageMeta(out, opts.appTitle);

	return out;
}

/** Vendored Iconify runtime + inline registration of the bundled collections.
 *  Runs synchronously right after the runtime loads and before Iconify starts
 *  its first [data-icon] scan (DOMContentLoaded), so no icon ever hits the
 *  on-demand loader / network. */
function buildIconifyBootstrap(iconifyJson: string): string {
	const safeJson = iconifyJson.replace(/<\/script>/g, '<\\/script>');
	return [
		'<script src="assets/vendor/iconify/iconify.min.js"></script>',
		'<script>',
		`window.__TRIPVIEWER_ICONS__ = ${safeJson};`,
		'(function () {',
		'  var icons = window.__TRIPVIEWER_ICONS__;',
		'  if (!icons || !window.Iconify) return;',
		'  if (window.Iconify.pauseObservation) window.Iconify.pauseObservation();',
		'  try {',
		'    for (var p in icons) {',
		'      if (Object.prototype.hasOwnProperty.call(icons, p)) {',
		'        window.Iconify.addCollection(icons[p]);',
		'      }',
		'    }',
		'  } finally {',
		'    if (window.Iconify.resumeObservation) window.Iconify.resumeObservation();',
		'  }',
		'})();',
		'</script>',
	].join('\n');
}

/** §5.1 static-mode bootstrap: the flag, the config, and the defensive
 *  `window.firebase` stub that turns any unguarded Firebase call into a loud
 *  error during verification. */
function buildStaticBootstrap(opts: TransformOptions): string {
	const config = {
		title: opts.appTitle,
		icon: opts.iconPath,
		ownerUid: opts.ownerUid,
		dataUrl: opts.dataUrl,
		mode: opts.mode,
	};
	return [
		'<script>',
		'window.TRIPVIEWER_STATIC = true;',
		`window.TRIPVIEWER_STATIC_CONFIG = ${JSON.stringify(config)};`,
		'window.firebase = {',
		"  app: function () { return { options: { projectId: 'static-export' } }; },",
		"  auth: function () { throw new Error('[static-export] firebase.auth() called unexpectedly'); },",
		"  firestore: function () { throw new Error('[static-export] firebase.firestore() called unexpectedly'); },",
		"  storage: function () { throw new Error('[static-export] firebase.storage() called unexpectedly'); }",
		'};',
		'</script>',
	].join('\n');
}

/** Inject the static bootstrap immediately before the entry module <script>
 *  (the Firebase module bootstrap was already stripped, so the first remaining
 *  type="module" script is the page entry). */
function injectStaticBootstrap(html: string, opts: TransformOptions): string {
	const entryScriptRe = /<script[^>]*type="module"[^>]*\bsrc="[^"]*"[^>]*>\s*<\/script>/;
	const match = entryScriptRe.exec(html);
	if (!match) return html;
	return html.slice(0, match.index) + buildStaticBootstrap(opts) + '\n' + html.slice(match.index);
}

const ASSET_ROOT_PREFIXES =
	'assets|apple-touch-icon|favicon|site\\.webmanifest|browserconfig\\.xml|safari-pinned-tab|mstile-150x150|android-chrome';

/** Strip a leading "/" from root-absolute asset URLs (e.g. "/assets/…",
 *  "/favicon-32x32.png") in attribute values, JS string literals, and inline
 *  CSS url(). Protocol-relative (//) and scheme URLs are never touched. */
function rebaseAssetUrls(html: string): string {
	return html
		.replace(new RegExp(`="\\/(${ASSET_ROOT_PREFIXES})`, 'g'), '"$1')
		.replace(new RegExp(`='\\/(${ASSET_ROOT_PREFIXES})`, 'g'), "'$1")
		.replace(new RegExp(`url\\(\\/(${ASSET_ROOT_PREFIXES})`, 'g'), 'url($1');
}

/** Strip a dev-only injected block (comment + following inline <script>). */
function stripBlock(html: string, marker: string): string {
	const start = html.indexOf(marker);
	if (start === -1) return html;
	const commentStart = html.lastIndexOf('<!--', start);
	const scriptEnd = html.indexOf('</script>', start);
	if (scriptEnd === -1) return html;
	return html.slice(0, commentStart) + html.slice(scriptEnd + '</script>'.length);
}

/** P3 — make the exported page standalone.
 *
 *  The live app's chrome assumes it is one click from `index.html` (and the
 *  other app pages). A static export is a self-contained site, so:
 *
 *    1. The TripViewer logo must not link back to the live app — turn the
 *       `<a … class="logo-link">` into a plain `<div class="logo-link">`.
 *    2. Back/home buttons (`#back`, `#closeButton`) are removed — there is no
 *       app home to go back to.
 *    3. The share button is forced hidden — it would share a `file://`/local
 *       URL that recipients cannot open. (Page-level static-mode guards also
 *       hide it so it can never be re-shown by JS.)
 *    4. Any inline `window.location = '…index.html'` handlers are stripped
 *       (defensive — today only edit/index pages carry them, and they are
 *       never exported).
 */
function stripStandaloneChrome(html: string): string {
	// 1. Logo link → non-link <div> (class selector styling still applies).
	let out = html.replace(
		/<a\b[^>]*\bclass="logo-link"[^>]*>([\s\S]*?)<\/a>/,
		'<div class="logo-link">$1</div>',
	);

	// 2. Back / close top-bar buttons.
	out = out.replace(
		/<i\b[^>]*\bid="(?:back|closeButton)"[^>]*>\s*<\/i>\s*/g,
		'',
	);

	// 3. Share button: keep the element (page JS reads it) but force it hidden.
	out = out.replace(
		/<i\b[^>]*\bid="share"[^>]*>\s*<\/i>/,
		'<i id="share" class="bx bx-share-alt icon-buttons" style="display: none;"></i>',
	);

	// 4. Inline home-navigation handlers (defensive).
	out = out.replace(
		/\s+on(?:click|dblclick)\s*=\s*["']\s*window\.location\s*=\s*["'][^"']*index\.html["']\s*;?\s*["']/gi,
		'',
	);

	return out;
}

function setPageMeta(html: string, appTitle: string): string {
	const title = escapeHtml(appTitle);
	return html
		.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
		.replace(
			/(<meta[^>]*\bname="apple-mobile-web-app-title"[^>]*\bcontent=")[^"]*(")/i,
			`$1${title}$2`,
		);
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

// ============================================================
// ZIP generation + download
// ============================================================

async function downloadZip(zip: any, type: string, title: string): Promise<void> {
	const blob = await zip.generateAsync({ type: 'blob' });
	const timestamp = formatTimestamp(new Date());
	const slug = slugify(title || 'export');
	triggerDownload(blob, `${timestamp}-tripviewer-static-${type}-${slug}.zip`);
}

function formatTimestamp(date: Date): string {
	const p = (n: number, len = 2) => String(n).padStart(len, '0');
	return (
		`${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}` +
		`${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`
	);
}

function slugify(title: string): string {
	return (
		title
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 60) || 'export'
	);
}

function triggerDownload(blob: Blob, filename: string): void {
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
