#!/usr/bin/env node
/**
 * Firestore REST helper (no Admin SDK, no service account).
 *
 * Authenticates with the Firebase CLI's cached OAuth refresh token and talks to
 * the Firestore REST API. Honours FIRESTORE_EMULATOR_HOST (emulator, no token).
 *
 * Usage:
 *   node firestore-rest.mjs list destinations [--limit 300]
 *   node firestore-rest.mjs get  destinations/<id>
 *   node firestore-rest.mjs dump destinations/<id> out.json
 *   node firestore-rest.mjs apply destinations/<id> patch.json      # merge-only PATCH
 *   node firestore-rest.mjs patch-summary <uid> <destId> patch.json
 *
 * Options:
 *   --project <id>   Firebase project id (default: trip-viewer-prd)
 *
 * `apply` PATCHes ONLY the top-level fields present in the patch file
 * (updateMask), so unrelated fields (sharing, image, myMaps, …) are preserved.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const projectIndex = args.indexOf('--project');
const PROJECT =
	projectIndex >= 0 ? args.splice(projectIndex, 2)[1] : process.env.FIREBASE_PROJECT || 'trip-viewer-prd';
const limitIndex = args.indexOf('--limit');
const LIMIT = limitIndex >= 0 ? Number(args.splice(limitIndex, 2)[1]) : 300;

const [cmd, a1, a2, a3] = args;
const EMULATOR = process.env.FIRESTORE_EMULATOR_HOST || '';
const BASE = EMULATOR
	? `http://${EMULATOR}/v1/projects/${PROJECT}/databases/(default)/documents`
	: `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;

// ---------------------------------------------------------------- auth

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
	const refresh = cfg?.tokens?.refresh_token;
	if (!refresh) throw new Error('No refresh_token in firebase-tools config — run `firebase login`.');
	const body = new URLSearchParams({
		grant_type: 'refresh_token',
		refresh_token: refresh,
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

// ------------------------------------------------- typed value conversion

function toValue(v) {
	if (v === null || v === undefined) return { nullValue: null };
	if (typeof v === 'boolean') return { booleanValue: v };
	if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
	if (typeof v === 'string') return { stringValue: v };
	if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
	if (typeof v === 'object') return { mapValue: { fields: toFields(v) } };
	throw new Error(`Unsupported value: ${typeof v}`);
}
function toFields(obj) {
	const out = {};
	for (const [k, v] of Object.entries(obj)) out[k] = toValue(v);
	return out;
}
function fromValue(v) {
	if (!v || typeof v !== 'object') return null;
	if ('nullValue' in v) return null;
	if ('booleanValue' in v) return v.booleanValue;
	if ('integerValue' in v) return Number(v.integerValue);
	if ('doubleValue' in v) return v.doubleValue;
	if ('stringValue' in v) return v.stringValue;
	if ('timestampValue' in v) return v.timestampValue;
	if ('referenceValue' in v) return v.referenceValue;
	if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
	if ('mapValue' in v) return fromFields(v.mapValue.fields || {});
	return null;
}
function fromFields(fields) {
	const out = {};
	for (const [k, v] of Object.entries(fields || {})) out[k] = fromValue(v);
	return out;
}

// ---------------------------------------------------------------- REST

async function rest(method, urlPath, body) {
	const token = await getAccessToken();
	const res = await fetch(`${BASE}${urlPath}`, {
		method,
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: body === undefined ? undefined : JSON.stringify(body),
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`HTTP ${res.status} ${method} ${urlPath}\n${text.slice(0, 1500)}`);
	return text ? JSON.parse(text) : null;
}

const docId = (name) => name.split('/').pop();

async function getDoc(docPath) {
	const res = await rest('GET', `/${docPath}`);
	return { id: docId(res.name), data: fromFields(res.fields) };
}

async function listDocs(collection, pageSize) {
	const res = await rest('GET', `/${collection}?pageSize=${pageSize}`);
	return (res.documents || []).map((d) => ({ id: docId(d.name), data: fromFields(d.fields) }));
}

async function patchDoc(docPath, plain) {
	const keys = Object.keys(plain);
	if (!keys.length) return null;
	const mask = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
	return rest('PATCH', `/${docPath}?${mask}`, { fields: toFields(plain) });
}

// ---------------------------------------------------------------- main

async function main() {
	switch (cmd) {
		case 'list': {
			const docs = await listDocs(a1, LIMIT);
			console.table(docs.map(({ id, data }) => ({ id, title: data.title, owner: data.sharing?.owner })));
			console.log(`Total: ${docs.length}`);
			break;
		}
		case 'get': {
			const doc = await getDoc(a1);
			console.log(JSON.stringify(doc, null, 2));
			break;
		}
		case 'dump': {
			const doc = await getDoc(a1);
			fs.writeFileSync(a2, JSON.stringify(doc.data, null, 2));
			console.log(`Wrote ${a2}`);
			break;
		}
		case 'apply': {
			const patch = JSON.parse(fs.readFileSync(a2, 'utf-8'));
			await patchDoc(a1, patch);
			console.log(`Patched ${Object.keys(patch).join(', ')} on ${a1}`);
			break;
		}
		case 'patch-summary': {
			const patch = JSON.parse(fs.readFileSync(a3, 'utf-8'));
			await patchDoc(`users/${a1}/destinationSummaries/${a2}`, patch);
			console.log(`Patched summary users/${a1}/destinationSummaries/${a2}`);
			break;
		}
		case 'bulk': {
			// One process, one token: a list of create/patch operations.
			// {"ops":[{"op":"patch","path":"destinations/x","mask":["restaurants.abc12"],"fields":{…}},
			//         {"op":"create","collection":"destinations","fields":{…}}]}
			const plan = JSON.parse(fs.readFileSync(a1, 'utf-8'));
			for (const op of plan.ops) {
				if (op.op === 'patch') {
					const mask = (op.mask || []).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
					await rest('PATCH', `/${op.path}?${mask}`, { fields: toFields(op.fields) });
					console.log(`patched ${op.path} [${(op.mask || []).join(', ')}]`);
				} else if (op.op === 'unset') {
					// PATCH with the path in the mask and no value deletes that field.
					const mask = (op.mask || []).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
					await rest('PATCH', `/${op.path}?${mask}`, { fields: {} });
					console.log(`unset ${op.path} [${(op.mask || []).join(', ')}]`);
				} else if (op.op === 'delete') {
					await rest('DELETE', `/${op.path}`);
					console.log(`deleted ${op.path}`);
				} else if (op.op === 'create') {
					const qs = op.documentId ? `?documentId=${encodeURIComponent(op.documentId)}` : '';
					const res = await rest('POST', `/${op.collection}${qs}`, { fields: toFields(op.fields) });
					console.log(`created ${res.name}`);
				} else {
					throw new Error(`unknown op: ${op.op}`);
				}
			}
			console.log(`done: ${plan.ops.length} operation(s)`);
			break;
		}
		default:
			console.log(
				'Commands: list <collection> | get <path> | dump <path> <file> | apply <path> <patch.json> | patch-summary <uid> <destId> <patch.json> | bulk <file.json>',
			);
			process.exit(1);
	}
}

main().catch((err) => {
	console.error(`[ERROR] ${err.message}`);
	process.exit(1);
});
