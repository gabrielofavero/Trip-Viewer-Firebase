#!/usr/bin/env node
/**
 * My Maps KML round-trip helper — zero dependencies.
 *
 * The agent has no access to the user's Google account, so My Maps edits are
 * made on a KML export and handed back for re-import. This script covers the
 * whole loop: read the map id from a `myMaps` URL, fetch Google's KML export
 * (following multi-layer NetworkLinks), inspect it, apply small safe edits,
 * validate it, and export per-layer KML/CSV files for My Maps' import flow.
 *
 * Usage (run from the repo root):
 *   node .github/skills/mymaps-editing/scripts/mymaps.mjs <command> [args]
 *
 * Commands:
 *   mid      <myMapsUrl|mid>                        → JSON {mid, lid, viewerUrl, kmlUrl}
 *   fetch    <myMapsUrl|mid> [--out file] [--lid id] → download + expand layers
 *   expand   <file.kml> [--out file]                 → follow NetworkLinks in a local KML
 *   list     <file.kml> [--names] [--limit n] [--json]
 *   show     <file.kml> [--folder name] [--name text] [--json]
 *   add      <file.kml> --folder name --name text --lat n --lng n
 *                       [--style "#id"] [--description text] [--create-folder] [--force]
 *   remove   <file.kml> --folder name --name text [--match] [--all]
 *   rename   <file.kml> --folder name --name text --to text
 *   coords   <file.kml> --folder name --name text --lat n --lng n
 *   split    <file.kml> --out-dir dir                → one .kml per top-level folder
 *   csv      <file.kml> --out-dir dir                → one .csv per top-level folder
 *   validate <file.kml>
 *
 * Exit code: 0 = ok (warnings allowed), 1 = error.
 */

import fs from 'node:fs';
import path from 'node:path';

const KML_ENDPOINT = 'https://www.google.com/maps/d/kml';
const FETCH_TIMEOUT_MS = 15_000;
const DEFAULT_OUT_DIR = 'tmp/mymaps';

// ---------------------------------------------------------------- CLI

const argv = process.argv.slice(2);
const command = argv.shift();

const flags = {};
const positional = [];
for (let i = 0; i < argv.length; i++) {
	const token = argv[i];
	if (token.startsWith('--')) {
		const key = token.slice(2);
		const next = argv[i + 1];
		if (next === undefined || next.startsWith('--')) {
			flags[key] = true;
		} else {
			flags[key] = next;
			i++;
		}
	} else {
		positional.push(token);
	}
}

function fail(message) {
	console.error(`✖ ${message}`);
	process.exit(1);
}

function info(message) {
	console.log(message);
}

// ---------------------------------------------------------------- XML scanner

/**
 * Minimal KML scanner. Walks every element tag (skipping comments and CDATA),
 * recording byte ranges and parent/child links — enough to locate Placemarks
 * and Folders without pulling in an XML dependency. Google's export is
 * well-formed, so this is safe for its output and for our own edits.
 */
const TOKEN_RE =
	/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<(\/?)([A-Za-z_][\w.:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;

function localName(tag) {
	return tag.includes(':') ? tag.slice(tag.indexOf(':') + 1) : tag;
}

function scan(xml) {
	const nodes = [];
	const stack = [];
	TOKEN_RE.lastIndex = 0;
	let match = TOKEN_RE.exec(xml);
	while (match !== null) {
		if (match[2] === undefined) {
			match = TOKEN_RE.exec(xml);
			continue; // comment or CDATA chunk
		}
		const closing = match[1] === '/';
		const name = localName(match[2]);
		const attrs = match[3] ?? '';
		const selfClosing = /\/\s*$/.test(attrs);
		const end = match.index + match[0].length;

		if (selfClosing) {
			const node = {
				name,
				attrs,
				start: match.index,
				openEnd: end,
				closeStart: end,
				end,
				parent: stack[stack.length - 1] ?? null,
				children: [],
				selfClosing: true,
			};
			if (node.parent) node.parent.children.push(node);
			nodes.push(node);
		} else if (!closing) {
			const node = {
				name,
				attrs,
				start: match.index,
				openEnd: end,
				closeStart: -1,
				end: -1,
				parent: stack[stack.length - 1] ?? null,
				children: [],
				selfClosing: false,
			};
			if (node.parent) node.parent.children.push(node);
			nodes.push(node);
			stack.push(node);
		} else {
			let target = stack.length - 1;
			while (target >= 0 && stack[target].name !== name) target--;
			if (target >= 0) {
				while (stack.length - 1 > target) {
					const unclosed = stack.pop();
					unclosed.closeStart = match.index;
					unclosed.end = end;
					unclosed.unclosed = true;
				}
				const node = stack.pop();
				node.closeStart = match.index;
				node.end = end;
			}
		}
		match = TOKEN_RE.exec(xml);
	}
	return nodes;
}

const stripCdata = (text) => {
	const m = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(text);
	return m ? m[1] : text;
};

function decodeEntities(text) {
	return text
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
		.replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
		.replace(/&amp;/g, '&');
}

function encodeText(text) {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Google wraps names with `&`/`<` in CDATA — keep that shape so re-imports look native. */
function formatName(text) {
	const value = String(text ?? '').trim();
	if (!value) throw new Error('Name must not be empty.');
	if (/[&<>"]/.test(value)) return `<![CDATA[${value.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;
	return encodeText(value);
}

const elementText = (xml, node) =>
	node ? decodeEntities(stripCdata(xml.slice(node.openEnd, node.closeStart))).trim() : '';

const childNamed = (node, name) => (node?.children ?? []).find((child) => child.name === name);

function folderNameOf(xml, folder) {
	return elementText(xml, childNamed(folder, 'name'));
}

function isPlacemark(node) {
	return node.name === 'Placemark';
}

/** Geometry child of a placemark ("none" when it has no geometry at all). */
function geometryKind(node) {
	for (const name of ['Point', 'LineString', 'Polygon', 'MultiGeometry', 'Model']) {
		if (childNamed(node, name)) return name;
	}
	return 'none';
}

function ancestorFolder(node) {
	let cursor = node.parent;
	while (cursor) {
		if (cursor.name === 'Folder') return cursor;
		cursor = cursor.parent;
	}
	return null;
}

function lineIndentAt(xml, index) {
	const lineStart = xml.lastIndexOf('\n', index - 1) + 1;
	const prefix = xml.slice(lineStart, index);
	return /^[ \t]*/.exec(prefix)?.[0] ?? '';
}

function childIndentOf(xml, node) {
	const first = node.children?.[0];
	if (!first) return null;
	return lineIndentAt(xml, first.start);
}

function placemarkInfo(xml, node) {
	const nameNode = childNamed(node, 'name');
	const styleNode = childNamed(node, 'styleUrl');
	const pointNode = childNamed(node, 'Point');
	const coordsNode = pointNode ? childNamed(pointNode, 'coordinates') : null;
	const raw = coordsNode ? xml.slice(coordsNode.openEnd, coordsNode.closeStart).trim() : '';
	const firstTriple = raw.split(/\s+/)[0] ?? '';
	const parts = firstTriple.split(',');
	const lng = Number(parts[0]);
	const lat = Number(parts[1]);
	return {
		name: elementText(xml, nameNode),
		styleUrl: elementText(xml, styleNode),
		lng,
		lat,
		hasCoordinates: Boolean(coordsNode) && Number.isFinite(lng) && Number.isFinite(lat),
	};
}

const placemarkLocation = (data) =>
	data.hasCoordinates ? `${data.lat}, ${data.lng}` : '(no Point)';

function folderEntries(xml, nodes) {
	return nodes
		.filter((node) => node.name === 'Folder')
		.map((node) => {
			const chain = [];
			let cursor = node;
			while (cursor) {
				if (cursor.name === 'Folder') chain.unshift(folderNameOf(xml, cursor));
				cursor = cursor.parent;
			}
			return { node, name: folderNameOf(xml, node), path: chain.join(' / '), depth: chain.length - 1 };
		});
}

function placemarksIn(xml, nodes, folderNode) {
	return nodes.filter((node) => isPlacemark(node) && ancestorFolder(node) === folderNode);
}

const normalize = (text) =>
	String(text ?? '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();

function resolveFolder(xml, nodes, wanted) {
	const folders = folderEntries(xml, nodes);
	const target = normalize(wanted);
	let hits = folders.filter((folder) => normalize(folder.path) === target);
	if (hits.length === 0) hits = folders.filter((folder) => normalize(folder.name) === target);
	if (hits.length === 0) hits = folders.filter((folder) => normalize(folder.path).endsWith(` / ${target}`));
	if (hits.length === 0) {
		throw new Error(
			`Folder not found: "${wanted}". Available: ${folders.map((f) => f.path).join(' | ') || '(none)'}`,
		);
	}
	if (hits.length > 1) {
		throw new Error(
			`Folder "${wanted}" is ambiguous: ${hits.map((f) => f.path).join(' | ')}. Pass the full path.`,
		);
	}
	return hits[0];
}

function topFolders(xml, nodes) {
	return folderEntries(xml, nodes).filter((folder) => ancestorFolder(folder.node) === null);
}

function readKmlFile(file) {
	if (!file) fail('Missing <file.kml> argument.');
	if (!fs.existsSync(file)) fail(`File not found: ${file}`);
	return fs.readFileSync(file, 'utf8');
}

function writeKmlFile(file, xml) {
	fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
	fs.writeFileSync(file, xml, 'utf8');
}

function slugify(text) {
	return (
		String(text ?? '')
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'layer'
	);
}

function timestamp() {
	const now = new Date();
	const pad = (value) => String(value).padStart(2, '0');
	return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

/**
 * Insert `block` just before a closing tag. The buffer already holds the
 * closing tag's indentation (after the last newline), so the block's own
 * leading indent is trimmed by that amount to avoid double indentation.
 */
function insertBeforeCloseTag(xml, node, block, closeIndent) {
	const trimmed = block.slice(Math.min(closeIndent.length, /^[ \t]*/.exec(block)[0].length));
	return `${xml.slice(0, node.closeStart)}${trimmed}\n${closeIndent}${xml.slice(node.closeStart)}`;
}

/** Re-indent a full element block that starts at its opening tag (no leading spaces). */
function reindent(block, targetIndent, originalIndent) {
	const delta = targetIndent.length - originalIndent.length;
	return block
		.split('\n')
		.map((line, index) => {
			if (index === 0) return targetIndent + line;
			if (delta >= 0) return ' '.repeat(delta) + line;
			const cut = Math.min(-delta, /^[ \t]*/.exec(line)[0].length);
			return line.slice(cut);
		})
		.join('\n');
}

// ---------------------------------------------------------------- URL handling

function parseMapUrl(input) {
	const raw = String(input ?? '').trim();
	if (!raw) throw new Error('Missing My Maps URL (or map id).');
	if (!raw.includes('://') && !raw.includes('=')) {
		return { mid: raw, lid: '', viewerUrl: `https://www.google.com/maps/d/viewer?mid=${raw}` };
	}
	let mid = '';
	let lid = '';
	try {
		const url = new URL(raw);
		mid = url.searchParams.get('mid') ?? '';
		lid = url.searchParams.get('lid') ?? '';
	} catch {
		// fall through to regex
	}
	if (!mid) mid = /[?&]mid=([^&]+)/.exec(raw)?.[1] ?? '';
	if (!lid) lid = /[?&]lid=([^&]+)/.exec(raw)?.[1] ?? '';
	if (!mid) throw new Error(`No "mid" parameter in: ${raw}`);
	mid = decodeURIComponent(mid);
	lid = decodeURIComponent(lid);
	return { mid, lid, viewerUrl: `https://www.google.com/maps/d/viewer?mid=${mid}` };
}

function buildKmlUrl(mid, lid = '') {
	const params = new URLSearchParams({ mid, forcekml: '1' });
	if (lid) params.set('lid', lid);
	return `${KML_ENDPOINT}?${params.toString()}`;
}

async function fetchText(url, label) {
	let response;
	try {
		response = await fetch(url, {
			headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TripViewer-mymaps-skill)' },
			signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
			redirect: 'follow',
		});
	} catch (error) {
		throw new Error(
			`${label} failed: ${error?.name === 'TimeoutError' ? `timed out after ${FETCH_TIMEOUT_MS} ms` : error?.message}`,
		);
	}
	if (!response.ok) {
		throw new Error(`${label} failed: HTTP ${response.status}`);
	}
	const body = await response.text();
	if (!/<kml\b/i.test(body)) {
		throw new Error(
			`${label} returned no KML (map is probably not public — set sharing to "Anyone with the link · Viewer").`,
		);
	}
	return body;
}

function extractHrefs(xml) {
	return [...xml.matchAll(/<href>([\s\S]*?)<\/href>/gi)].map((m) => decodeEntities(m[1].trim()));
}

function extractStyles(xml, nodes) {
	const seen = new Set();
	const styles = [];
	for (const node of nodes) {
		if (node.name !== 'Style' && node.name !== 'StyleMap') continue;
		const id = /\bid="([^"]+)"/.exec(node.attrs)?.[1];
		if (!id || seen.has(id)) continue;
		seen.add(id);
		styles.push({ id, block: xml.slice(node.start, node.end), indent: lineIndentAt(xml, node.start) });
	}
	return styles;
}

/** Merge a multi-layer map (initial doc with NetworkLinks) into one Folder-per-layer document. */
async function expandNetworkLinks(initialKml, label) {
	const nodes = scan(initialKml);
	const links = nodes.filter((node) => node.name === 'NetworkLink');
	const documentNode = nodes.find((node) => node.name === 'Document');
	const mapName = documentNode ? elementText(initialKml, childNamed(documentNode, 'name')) : '';

	const layers = [];
	for (const link of links) {
		const href = extractHrefs(initialKml.slice(link.start, link.end))[0];
		if (!href) continue;
		const layerKml = await fetchText(href, `${label} layer`);
		const layerNodes = scan(layerKml);
		const layerDoc = layerNodes.find((node) => node.name === 'Document');
		const layerName =
			(layerDoc ? elementText(layerKml, childNamed(layerDoc, 'name')) : '') ||
			elementText(initialKml, childNamed(link, 'name')) ||
			'Layer';
		const placemarks = layerNodes
			.filter((node) => isPlacemark(node))
			.map((node) => ({
				block: layerKml.slice(node.start, node.end),
				indent: lineIndentAt(layerKml, node.start),
			}));
		layers.push({ name: layerName, placemarks, styles: extractStyles(layerKml, layerNodes) });
	}

	if (layers.length === 0) return initialKml;

	const seenStyles = new Set();
	const styleBlocks = [];
	for (const layer of layers) {
		for (const style of layer.styles) {
			if (seenStyles.has(style.id)) continue;
			seenStyles.add(style.id);
			styleBlocks.push(reindent(style.block, '    ', style.indent));
		}
	}

	const folders = layers.map((layer) => {
		const body = layer.placemarks
			.map((placemark) => reindent(placemark.block, '      ', placemark.indent))
			.join('\n');
		return [
			'    <Folder>',
			`      <name>${formatName(layer.name)}</name>`,
			...(body ? [body] : []),
			'    </Folder>',
		].join('\n');
	});

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<kml xmlns="http://www.opengis.net/kml/2.2">',
		'  <Document>',
		`    <name>${formatName(mapName || 'My Maps')}</name>`,
		...styleBlocks,
		...folders,
		'  </Document>',
		'</kml>',
		'',
	].join('\n');
}

// ---------------------------------------------------------------- placemark builder

function buildPlacemark({ name, lng, lat, styleUrl, description }, indent) {
	const inner = `${indent}  `;
	const deep = `${indent}    `;
	const deeper = `${indent}      `;
	const lines = [
		`${indent}<Placemark>`,
		`${inner}<name>${formatName(name)}</name>`,
	];
	if (styleUrl) lines.push(`${inner}<styleUrl>${encodeText(styleUrl)}</styleUrl>`);
	if (description) {
		const cdata = String(description).replaceAll(']]>', ']]]]><![CDATA[>');
		lines.push(`${inner}<description><![CDATA[${cdata}]]></description>`);
	}
	lines.push(
		`${inner}<Point>`,
		`${deep}<coordinates>`,
		`${deeper}${lng},${lat},0`,
		`${deep}</coordinates>`,
		`${inner}</Point>`,
		`${indent}</Placemark>`,
	);
	return lines.join('\n');
}

function validateCoordinates(lat, lng) {
	const latNum = Number(lat);
	const lngNum = Number(lng);
	if (!Number.isFinite(latNum) || Math.abs(latNum) > 90) {
		throw new Error(`Invalid latitude: ${lat} (expected -90..90).`);
	}
	if (!Number.isFinite(lngNum) || Math.abs(lngNum) > 180) {
		throw new Error(`Invalid longitude: ${lng} (expected -180..180).`);
	}
	return { lat: String(lat).trim(), lng: String(lng).trim() };
}

/** Most common styleUrl in a folder (falls back to the whole document). */
function pickStyle(xml, nodes, folderNode) {
	const counts = new Map();
	const tally = (placemarks) => {
		for (const node of placemarks) {
			const style = placemarkInfo(xml, node).styleUrl;
			if (style) counts.set(style, (counts.get(style) ?? 0) + 1);
		}
	};
	tally(placemarksIn(xml, nodes, folderNode));
	if (counts.size === 0) tally(nodes.filter((node) => isPlacemark(node)));
	let best = '';
	let bestCount = 0;
	for (const [style, count] of counts) {
		if (count > bestCount) {
			best = style;
			bestCount = count;
		}
	}
	return best;
}

// ---------------------------------------------------------------- commands

function commandMid() {
	const parsed = parseMapUrl(positional[0]);
	info(
		JSON.stringify(
			{
				mid: parsed.mid,
				lid: parsed.lid,
				viewerUrl: parsed.viewerUrl,
				kmlUrl: buildKmlUrl(parsed.mid, parsed.lid),
			},
			null,
			2,
		),
	);
}

async function commandFetch() {
	const parsed = parseMapUrl(positional[0]);
	const lid = typeof flags.lid === 'string' ? flags.lid : parsed.lid;
	const url = buildKmlUrl(parsed.mid, lid);
	info(`Fetching ${url}`);
	let kml = await fetchText(url, 'KML fetch');
	kml = await expandNetworkLinks(kml, `Map ${parsed.mid}`);

	const nodes = scan(kml);
	const documentNode = nodes.find((node) => node.name === 'Document');
	const docName = documentNode ? elementText(kml, childNamed(documentNode, 'name')) : '';
	const out =
		typeof flags.out === 'string'
			? flags.out
			: path.join(DEFAULT_OUT_DIR, `${slugify(docName || parsed.mid)}-${timestamp()}.kml`);
	writeKmlFile(out, kml);

	const folders = folderEntries(kml, nodes);
	const placemarks = nodes.filter((node) => isPlacemark(node));
	info('');
	info(`✔ Saved ${out}`);
	info(`Map: ${docName || '(unnamed)'} · ${placemarks.length} placemarks · ${folders.length} folders`);
	for (const folder of topFolders(kml, nodes)) {
		info(`  • ${folder.path} (${placemarksIn(kml, nodes, folder.node).length})`);
	}
}

async function commandExpand() {
	const source = positional[0];
	const xml = readKmlFile(source);
	const expanded = await expandNetworkLinks(xml, path.basename(source));
	const out = typeof flags.out === 'string' ? flags.out : source;
	if (out !== source && expanded === xml) {
		info('No <NetworkLink> layers found — nothing to expand.');
		return;
	}
	writeKmlFile(out, expanded);
	const nodes = scan(expanded);
	info(`✔ Expanded into ${out}`);
	info(`  ${nodes.filter((node) => isPlacemark(node)).length} placemarks · ${topFolders(expanded, nodes).length} layers`);
}

function commandList() {
	const file = positional[0];
	const xml = readKmlFile(file);
	const nodes = scan(xml);
	const documentNode = nodes.find((node) => node.name === 'Document');
	const docName = documentNode ? elementText(xml, childNamed(documentNode, 'name')) : '';
	const placemarks = nodes.filter((node) => isPlacemark(node));
	const folders = folderEntries(xml, nodes);
	const limit = Number(flags.limit) > 0 ? Number(flags.limit) : 40;

	if (flags.json) {
		info(
			JSON.stringify(
				{
					file,
					map: docName,
					placemarks: placemarks.length,
					folders: folders.map((folder) => ({
						path: folder.path,
						count: placemarksIn(xml, nodes, folder.node).length,
					})),
					items: flags.names
						? placemarks.map((node) => {
								const data = placemarkInfo(xml, node);
								const folder = ancestorFolder(node);
								return {
									folder: folder ? folderNameOf(xml, folder) : '',
									name: data.name,
									lat: data.lat,
									lng: data.lng,
									styleUrl: data.styleUrl,
								};
							})
						: undefined,
				},
				null,
				2,
			),
		);
		return;
	}

	info(`${file}`);
	info(`Map: ${docName || '(unnamed)'} · ${placemarks.length} placemarks · ${folders.length} folders`);
	for (const folder of folders) {
		const count = placemarksIn(xml, nodes, folder.node).length;
		info(`${'  '.repeat(folder.depth + 1)}${folder.name} (${count})`);
		if (flags.names) {
			for (const node of placemarksIn(xml, nodes, folder.node).slice(0, limit)) {
				const data = placemarkInfo(xml, node);
				info(`${'  '.repeat(folder.depth + 2)}- ${data.name} · ${placemarkLocation(data)}`);
			}
		}
	}
	const orphan = placemarks.filter((node) => ancestorFolder(node) === null);
	if (orphan.length > 0) info(`  (top-level) (${orphan.length})`);
}

function commandShow() {
	const file = positional[0];
	const xml = readKmlFile(file);
	const nodes = scan(xml);
	const wantedFolder =
		typeof flags.folder === 'string' ? resolveFolder(xml, nodes, flags.folder) : null;
	const wantedName = typeof flags.name === 'string' ? normalize(flags.name) : '';
	const rows = nodes
		.filter((node) => isPlacemark(node))
		.filter((node) => !wantedFolder || ancestorFolder(node) === wantedFolder.node)
		.map((node) => {
			const folder = ancestorFolder(node);
			return {
				folder: folder ? folderNameOf(xml, folder) : '(top-level)',
				...placemarkInfo(xml, node),
			};
		})
		.filter((row) => !wantedName || normalize(row.name).includes(wantedName));

	if (flags.json) {
		info(JSON.stringify({ file, count: rows.length, items: rows }, null, 2));
		return;
	}
	if (rows.length === 0) {
		info('No matching placemarks.');
		return;
	}
	info(`${file} · ${rows.length} matching placemark(s)`);
	for (const row of rows) {
		info(`  ${row.folder} | ${row.name} | ${placemarkLocation(row)} | ${row.styleUrl || '(no style)'}`);
	}
}

function commandAdd() {
	const file = positional[0];
	let xml = readKmlFile(file);
	let nodes = scan(xml);

	const name = typeof flags.name === 'string' ? flags.name.trim() : '';
	if (!name) fail('Missing --name.');
	const folderFlag = typeof flags.folder === 'string' ? flags.folder : '';
	if (!folderFlag) fail('Missing --folder (the My Maps layer to add the place to).');
	const { lat, lng } = validateCoordinates(flags.lat, flags.lng);

	let folder;
	try {
		folder = resolveFolder(xml, nodes, folderFlag);
	} catch (error) {
		if (!flags['create-folder'] || !String(error.message).startsWith('Folder not found')) {
			fail(`${error.message}\n  (pass --create-folder to create it as a new layer)`);
		}
		const documentNode = nodes.find((node) => node.name === 'Document');
		if (!documentNode) fail('No <Document> element found in the KML.');
		const docIndent = lineIndentAt(xml, documentNode.start);
		const folderIndent = childIndentOf(xml, documentNode) ?? `${docIndent}  `;
		const block = [
			`${folderIndent}<Folder>`,
			`${folderIndent}  <name>${formatName(folderFlag)}</name>`,
			`${folderIndent}</Folder>`,
		].join('\n');
		xml = insertBeforeCloseTag(xml, documentNode, block, docIndent);
		nodes = scan(xml);
		folder = resolveFolder(xml, nodes, folderFlag);
	}

	const siblings = placemarksIn(xml, nodes, folder.node);
	const duplicates = siblings.filter((node) => normalize(placemarkInfo(xml, node).name) === normalize(name));
	if (duplicates.length > 0 && !flags.force) {
		fail(
			`"${name}" already exists ${duplicates.length}× in "${folder.path}". Pass --force to add another copy.`,
		);
	}

	const folderIndent = lineIndentAt(xml, folder.node.start);
	const placemarkIndent = childIndentOf(xml, folder.node) ?? `${folderIndent}  `;
	const styleUrl = typeof flags.style === 'string' ? flags.style : pickStyle(xml, nodes, folder.node);
	const block = buildPlacemark(
		{
			name,
			lng,
			lat,
			styleUrl,
			description: typeof flags.description === 'string' ? flags.description : '',
		},
		placemarkIndent,
	);
	xml = insertBeforeCloseTag(xml, folder.node, block, folderIndent);
	writeKmlFile(file, xml);
	info(`✔ Added "${name}" to "${folder.path}" at ${lat}, ${lng}`);
	info(`  style: ${styleUrl || '(none)'} · placemarks in layer: ${siblings.length + 1}`);
}

function commandRemove() {
	const file = positional[0];
	const xml = readKmlFile(file);
	const nodes = scan(xml);
	if (typeof flags.folder !== 'string') fail('Missing --folder (the layer to remove from).');
	const folder = resolveFolder(xml, nodes, flags.folder);
	const wanted = typeof flags.name === 'string' ? flags.name.trim() : '';
	if (!wanted) fail('Missing --name.');
	const useMatch = Boolean(flags.match);
	const matches = placemarksIn(xml, nodes, folder.node).filter((node) => {
		const name = placemarkInfo(xml, node).name;
		return useMatch ? normalize(name).includes(normalize(wanted)) : name === wanted;
	});
	if (matches.length === 0) {
		fail(`No placemark named ${useMatch ? `~"${wanted}"` : `"${wanted}"`} in "${folder.path}".`);
	}
	if (matches.length > 1 && !flags.all) {
		const names = matches.map((node) => `"${placemarkInfo(xml, node).name}"`).join(', ');
		fail(`${matches.length} placemarks match in "${folder.path}": ${names}. Pass --all to remove all.`);
	}

	const ranges = matches.map((node) => {
		const lineStart = xml.lastIndexOf('\n', node.start - 1) + 1;
		const lineEnd = xml.indexOf('\n', node.end);
		return { start: lineStart, end: lineEnd === -1 ? node.end : lineEnd + 1 };
	});
	let output = xml;
	for (const range of ranges.sort((a, b) => b.start - a.start)) {
		output = `${output.slice(0, range.start)}${output.slice(range.end)}`;
	}
	writeKmlFile(file, output);
	info(`✔ Removed ${matches.length} placemark(s) from "${folder.path}":`);
	for (const node of matches) info(`  - ${placemarkInfo(xml, node).name}`);
}

function commandRename() {
	const file = positional[0];
	const xml = readKmlFile(file);
	const nodes = scan(xml);
	if (typeof flags.folder !== 'string') fail('Missing --folder (the layer to rename in).');
	const folder = resolveFolder(xml, nodes, flags.folder);
	const from = typeof flags.name === 'string' ? flags.name.trim() : '';
	const to = typeof flags.to === 'string' ? flags.to.trim() : '';
	if (!from || !to) fail('Missing --name and/or --to.');
	const matches = placemarksIn(xml, nodes, folder.node).filter(
		(node) => placemarkInfo(xml, node).name === from,
	);
	if (matches.length === 0) fail(`No placemark named "${from}" in "${folder.path}".`);
	if (matches.length > 1) fail(`${matches.length} placemarks are named "${from}" — rename by hand.`);
	const node = matches[0];
	const nameNode = childNamed(node, 'name');
	const output = `${xml.slice(0, nameNode.openEnd)}${formatName(to)}${xml.slice(nameNode.closeStart)}`;
	writeKmlFile(file, output);
	info(`✔ Renamed "${from}" → "${to}" in "${folder.path}"`);
}

function commandCoords() {
	const file = positional[0];
	const xml = readKmlFile(file);
	const nodes = scan(xml);
	if (typeof flags.folder !== 'string') fail('Missing --folder (the layer the place is in).');
	const folder = resolveFolder(xml, nodes, flags.folder);
	const wanted = typeof flags.name === 'string' ? flags.name.trim() : '';
	if (!wanted) fail('Missing --name.');
	const { lat, lng } = validateCoordinates(flags.lat, flags.lng);
	const matches = placemarksIn(xml, nodes, folder.node).filter(
		(node) => placemarkInfo(xml, node).name === wanted,
	);
	if (matches.length === 0) fail(`No placemark named "${wanted}" in "${folder.path}".`);
	if (matches.length > 1) fail(`${matches.length} placemarks are named "${wanted}" — update by hand.`);
	const point = childNamed(matches[0], 'Point');
	const coordsNode = point ? childNamed(point, 'coordinates') : null;
	if (!coordsNode) fail(`"${wanted}" has no <Point><coordinates> (lines/polygons are not editable here).`);
	const inner = xml.slice(coordsNode.openEnd, coordsNode.closeStart);
	const closeIndent = lineIndentAt(xml, coordsNode.closeStart);
	const valueIndent = inner.includes('\n')
		? (/\n([ \t]+)\S/.exec(inner)?.[1] ?? `${closeIndent}  `)
		: null;
	const newInner = valueIndent ? `\n${valueIndent}${lng},${lat},0\n${closeIndent}` : `${lng},${lat},0`;
	const output = `${xml.slice(0, coordsNode.openEnd)}${newInner}${xml.slice(coordsNode.closeStart)}`;
	writeKmlFile(file, output);
	info(`✔ Moved "${wanted}" in "${folder.path}" to ${lat}, ${lng}`);
}

function commandSplit() {
	const file = positional[0];
	const xml = readKmlFile(file);
	const nodes = scan(xml);
	const outDir = typeof flags['out-dir'] === 'string' ? flags['out-dir'] : DEFAULT_OUT_DIR;
	const documentNode = nodes.find((node) => node.name === 'Document');
	const mapName = documentNode ? elementText(xml, childNamed(documentNode, 'name')) : '';
	const styles = extractStyles(xml, nodes);
	const folders = topFolders(xml, nodes);
	if (folders.length === 0) fail('No top-level <Folder> elements to split.');

	for (const folder of folders) {
		const folderIndent = lineIndentAt(xml, folder.node.start);
		const body = reindent(
			xml.slice(folder.node.start, folder.node.end),
			'    ',
			folderIndent,
		);
		const styleBlocks = styles.map((style) => reindent(style.block, '    ', style.indent));
		const out = [
			'<?xml version="1.0" encoding="UTF-8"?>',
			'<kml xmlns="http://www.opengis.net/kml/2.2">',
			'  <Document>',
			`    <name>${formatName(`${mapName ? `${mapName} — ` : ''}${folder.name}`)}</name>`,
			...styleBlocks,
			body,
			'  </Document>',
			'</kml>',
			'',
		].join('\n');
		const outFile = path.join(outDir, `${slugify(folder.name)}.kml`);
		writeKmlFile(outFile, out);
		info(`✔ ${folder.name} → ${outFile} (${placemarksIn(xml, nodes, folder.node).length} placemarks)`);
	}
}

function commandCsv() {
	const file = positional[0];
	const xml = readKmlFile(file);
	const nodes = scan(xml);
	const outDir = typeof flags['out-dir'] === 'string' ? flags['out-dir'] : DEFAULT_OUT_DIR;
	const folders = topFolders(xml, nodes);
	if (folders.length === 0) fail('No top-level <Folder> elements to export.');
	const quote = (value) => `"${String(value).replaceAll('"', '""')}"`;

	for (const folder of folders) {
		const rows = placemarksIn(xml, nodes, folder.node)
			.map((node) => placemarkInfo(xml, node))
			.filter((data) => data.hasCoordinates);
		const csv = [
			'Name,Latitude,Longitude',
			...rows.map((row) => `${quote(row.name)},${row.lat},${row.lng}`),
		].join('\n');
		const outFile = path.join(outDir, `${slugify(folder.name)}.csv`);
		fs.mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
		fs.writeFileSync(outFile, `${csv}\n`, 'utf8');
		info(`✔ ${folder.name} → ${outFile} (${rows.length} rows)`);
	}
}

function commandValidate() {
	const file = positional[0];
	const xml = readKmlFile(file);
	const nodes = scan(xml);
	const errors = [];
	const warnings = [];

	const unclosed = nodes.filter((node) => node.end === -1);
	if (unclosed.length > 0) {
		errors.push(`Unclosed element(s): ${unclosed.map((node) => `<${node.name}>`).join(', ')}`);
	}
	if (xml.charCodeAt(0) === 0xfeff) warnings.push('File starts with a UTF-8 BOM — My Maps prefers no BOM.');
	if (!/<kml\b/i.test(xml)) errors.push('No <kml> root element.');

	const placemarks = nodes.filter((node) => isPlacemark(node));
	const folders = folderEntries(xml, nodes);
	const top = topFolders(xml, nodes);
	if (top.length > 10) warnings.push(`${top.length} top-level layers — My Maps allows at most 10 per map.`);

	const definedStyles = new Set(
		nodes
			.filter((node) => node.name === 'Style' || node.name === 'StyleMap')
			.map((node) => /\bid="([^"]+)"/.exec(node.attrs)?.[1])
			.filter(Boolean),
	);
	const missingStyles = new Set();

	for (const node of placemarks) {
		const data = placemarkInfo(xml, node);
		const geometry = geometryKind(node);
		if (!data.name) errors.push('A <Placemark> has no <name>.');
		if (geometry === 'Point') {
			if (!data.hasCoordinates) {
				errors.push(`"${data.name || '(unnamed)'}" has no usable Point coordinates.`);
			} else {
				if (Math.abs(data.lat) > 90) errors.push(`"${data.name}" latitude out of range: ${data.lat}`);
				if (Math.abs(data.lng) > 180)
					errors.push(`"${data.name}" longitude out of range: ${data.lng}`);
			}
		} else if (geometry === 'none') {
			warnings.push(`"${data.name || '(unnamed)'}" has no geometry.`);
		}
		if (data.styleUrl.startsWith('#') && !definedStyles.has(data.styleUrl.slice(1))) {
			missingStyles.add(data.styleUrl);
		}
	}
	if (missingStyles.size > 0) {
		warnings.push(`styleUrl(s) with no matching style: ${[...missingStyles].join(', ')}`);
	}

	// Raw ampersands outside CDATA/comments break strict XML parsers.
	const withoutCdata = xml
		.replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '')
		.replace(/<!--[\s\S]*?-->/g, '');
	const rawAmp = withoutCdata.match(/&(?!(amp|lt|gt|quot|apos);|#\d+;|#x[0-9a-fA-F]+;)/);
	if (rawAmp) errors.push('Unescaped "&" found (use &amp;).');

	const byFolder = folders.map((folder) => `${folder.path} (${placemarksIn(xml, nodes, folder.node).length})`);
	info(`File: ${file}`);
	info(`Placemarks: ${placemarks.length} · folders: ${folders.length}`);
	if (byFolder.length > 0) info(`Layers: ${byFolder.join(' | ')}`);
	for (const warning of warnings) info(`⚠ ${warning}`);
	if (errors.length > 0) {
		for (const error of errors) console.error(`✖ ${error}`);
		console.error(`\n✖ Validation failed (${errors.length} error(s)).`);
		process.exit(1);
	}
	info('✔ KML is valid.');
}

// ---------------------------------------------------------------- dispatch

const COMMANDS = {
	mid: commandMid,
	fetch: commandFetch,
	expand: commandExpand,
	list: commandList,
	show: commandShow,
	add: commandAdd,
	remove: commandRemove,
	rename: commandRename,
	coords: commandCoords,
	split: commandSplit,
	csv: commandCsv,
	validate: commandValidate,
};

async function main() {
	if (!command || command === 'help' || command === '--help' || command === '-h') {
		info(
			[
				'My Maps KML helper — commands:',
				'  mid      <url|mid>',
				'  fetch    <url|mid> [--out file] [--lid id]',
				'  expand   <file.kml> [--out file]',
				'  list     <file.kml> [--names] [--limit n] [--json]',
				'  show     <file.kml> [--folder name] [--name text] [--json]',
				'  add      <file.kml> --folder name --name text --lat n --lng n [--style "#id"]',
				'                       [--description text] [--create-folder] [--force]',
				'  remove   <file.kml> --folder name --name text [--match] [--all]',
				'  rename   <file.kml> --folder name --name text --to text',
				'  coords   <file.kml> --folder name --name text --lat n --lng n',
				'  split    <file.kml> --out-dir dir',
				'  csv      <file.kml> --out-dir dir',
				'  validate <file.kml>',
			].join('\n'),
		);
		return;
	}
	const handler = COMMANDS[command];
	if (!handler) fail(`Unknown command "${command}" — run without arguments for help.`);
	try {
		await handler();
	} catch (error) {
		fail(error?.message ?? String(error));
	}
}

await main();
