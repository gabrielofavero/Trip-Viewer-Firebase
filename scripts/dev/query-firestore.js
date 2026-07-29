/**
 * query-firestore.js
 *
 * CLI tool to query the local Firestore emulator.
 * Uses firebase-admin from functions/node_modules and connects to the emulator
 * via the FIRESTORE_EMULATOR_HOST environment variable.
 *
 * Usage:
 *   node scripts/dev/query-firestore.js --list-collections
 *   node scripts/dev/query-firestore.js --collection trips
 *   node scripts/dev/query-firestore.js --collection trips --doc <id>
 *   node scripts/dev/query-firestore.js --collection trips --where "owner,==,<uid>"
 *   node scripts/dev/query-firestore.js --collection trips --limit 5
 *   node scripts/dev/query-firestore.js --collection trips --json
 *
 * Options:
 *   --list-collections       List all top-level collections with document counts
 *   --collection, -c <name>  Collection to query
 *   --doc, -d <id>           Specific document ID (requires --collection)
 *   --where <field,op,val>   Filter (requires --collection). op: ==, !=, <, <=, >, >=, array-contains, in, not-in, array-contains-any
 *   --limit <n>              Max documents to return (default: 50)
 *   --json                   Output raw JSON (default: pretty-printed)
 *   --project <id>           Firebase project ID (default: trip-viewer-dev)
 *   --host <host:port>       Firestore emulator host (default: localhost:8085)
 *   --help                   Show this help
 */

const path = require('path');

// --- Resolve firebase-admin from the functions directory --------------------
const functionsDir = path.resolve(__dirname, '..', '..', 'functions');
const adminPath = path.join(functionsDir, 'node_modules', 'firebase-admin');

let admin;
try {
	admin = require(adminPath);
} catch (err) {
	console.error(
		`[ERROR] Could not load firebase-admin from: ${adminPath}\n` +
			`  Make sure you've run "npm install" in the functions/ directory.\n` +
			`  Error: ${err.message}`,
	);
	process.exit(1);
}

// --- Parse CLI arguments ----------------------------------------------------
function parseArgs(rawArgs) {
	const args = {
		listCollections: false,
		collection: null,
		docId: null,
		where: [],
		limit: 50,
		json: false,
		project: 'trip-viewer-dev',
		host: 'localhost:8085',
		help: false,
	};

	const positional = [];

	for (let i = 0; i < rawArgs.length; i++) {
		const arg = rawArgs[i];

		switch (arg) {
			case '--list-collections':
				args.listCollections = true;
				break;
			case '--collection':
			case '-c':
				args.collection = rawArgs[++i];
				break;
			case '--doc':
			case '-d':
				args.docId = rawArgs[++i];
				break;
			case '--where':
				args.where.push(rawArgs[++i]);
				break;
			case '--limit':
				args.limit = parseInt(rawArgs[++i], 10);
				break;
			case '--json':
				args.json = true;
				break;
			case '--project':
				args.project = rawArgs[++i];
				break;
			case '--host':
				args.host = rawArgs[++i];
				break;
			case '--help':
			case '-h':
				args.help = true;
				break;
			default:
				positional.push(arg);
				break;
		}
	}

	return args;
}

// --- Initialize firebase-admin ----------------------------------------------
function initAdmin(projectId) {
	if (admin.apps.length > 0) {
		return admin.apps[0];
	}
	return admin.initializeApp({ projectId });
}

// --- Collection listing -----------------------------------------------------
async function listCollections(db) {
	const collections = await db.listCollections();
	const result = [];

	for (const col of collections) {
		const snapshot = await col.count().get();
		result.push({
			collection: col.id,
			docCount: snapshot.data().count,
		});
	}

	return result;
}

// --- Document query ---------------------------------------------------------
async function queryCollection(db, collectionName, options) {
	let query = db.collection(collectionName);

	// Apply where clauses
	for (const whereStr of options.where) {
		const parts = whereStr.split(',');
		if (parts.length < 3) {
			console.error(`[ERROR] Invalid --where format: "${whereStr}". Expected: field,op,value`);
			process.exit(1);
		}
		const [field, op, rawValue] = parts;
		// Try to parse value as JSON first, fall back to string
		let value;
		try {
			value = JSON.parse(rawValue);
		} catch {
			value = rawValue;
		}
		query = query.where(field, op, value);
	}

	// Apply limit
	query = query.limit(options.limit);

	const snapshot = await query.get();
	const docs = [];
	snapshot.forEach((doc) => {
		docs.push({ id: doc.id, data: doc.data() });
	});

	return docs;
}

// --- Single document fetch --------------------------------------------------
async function getDocument(db, collectionName, docId) {
	const docRef = db.collection(collectionName).doc(docId);
	const doc = await docRef.get();

	if (!doc.exists) {
		return null;
	}

	return { id: doc.id, data: doc.data() };
}

// --- Sub-collection listing -------------------------------------------------
async function listSubCollections(db, collectionName, docId) {
	const docRef = db.collection(collectionName).doc(docId);
	const collections = await docRef.listCollections();
	const result = [];

	for (const col of collections) {
		const snapshot = await col.count().get();
		result.push({
			collection: `${collectionName}/${docId}/${col.id}`,
			docCount: snapshot.data().count,
		});
	}

	return result;
}

// --- Show help --------------------------------------------------------------
function showHelp() {
	const fs = require('fs');
	const content = fs.readFileSync(__filename, 'utf-8');
	const help = content.match(/\/\*\*[\s\S]*?\*\//)?.[0] || '';
	console.log(help.replace(/^\s*\* ?/gm, '').replace(/^\/ | \*\/$/g, '').trim());
}

// --- Main -------------------------------------------------------------------
async function main() {
	const args = parseArgs(process.argv.slice(2));

	if (args.help) {
		showHelp();
		process.exit(0);
	}

	// Validate
	if (!args.listCollections && !args.collection) {
		console.error('[ERROR] Specify --list-collections or --collection <name>. Use --help for usage.');
		process.exit(1);
	}

	process.env.FIRESTORE_EMULATOR_HOST = args.host;
	initAdmin(args.project);
	const db = admin.firestore();

	try {
		let output;

		if (args.listCollections) {
			// Also discover sub-collections for known parent paths
			output = await listCollections(db);

			// Check for sub-collections under each document in main collections
			if (!args.json) {
				const enriched = [];
				for (const col of output) {
					if (col.docCount > 0) {
						// Sample first doc to check for sub-collections
						const sample = await db.collection(col.collection).limit(1).get();
						if (!sample.empty) {
							const docId = sample.docs[0].id;
							const subs = await listSubCollections(db, col.collection, docId);
							enriched.push({ ...col, sampleSubCollections: subs.map((s) => s.collection) });
						} else {
							enriched.push(col);
						}
					} else {
						enriched.push(col);
					}
				}
				output = enriched;
			}
		} else if (args.docId) {
			output = await getDocument(db, args.collection, args.docId);
			if (!output) {
				console.log(`[NOT FOUND] Document "${args.docId}" does not exist in collection "${args.collection}".`);
				process.exit(0);
			}

			// Also list sub-collections
			const subs = await listSubCollections(db, args.collection, args.docId);
			if (subs.length > 0) {
				output.subCollections = subs;
			}
		} else {
			output = await queryCollection(db, args.collection, {
				where: args.where,
				limit: args.limit,
			});
		}

		// --- Output ---------------------------------------------------------
		if (args.json) {
			console.log(JSON.stringify(output, null, 2));
		} else {
			prettyPrint(output, args);
		}
	} catch (err) {
		console.error(`[ERROR] ${err.message}`);
		if (err.code === 14) {
			console.error('  Is the Firestore emulator running? (expected at', args.host + ')');
		}
		process.exit(1);
	}
}

// --- Pretty printer ---------------------------------------------------------
function prettyPrint(data, args) {
	const divider = '─'.repeat(60);

	if (args.listCollections) {
		console.log('\n' + '═'.repeat(60));
		console.log('  Firestore Emulator — Collection Overview');
		console.log('═'.repeat(60));
		for (const col of data) {
			console.log(`\n  📁 ${col.collection}  (${col.docCount} docs)`);
			if (col.sampleSubCollections && col.sampleSubCollections.length > 0) {
				for (const sub of col.sampleSubCollections) {
					console.log(`     └─ 📂 ${sub}`);
				}
			}
		}
		console.log('\n' + '═'.repeat(60) + '\n');
		return;
	}

	if (data === null) {
		console.log('[NOT FOUND]');
		return;
	}

	if (Array.isArray(data)) {
		console.log('\n' + '═'.repeat(60));
		console.log(`  Collection: ${args.collection}  (${data.length} docs)`);
		console.log('═'.repeat(60));

		for (const doc of data) {
			console.log(`\n${divider}`);
			console.log(`  🆔 ${doc.id}`);
			console.log(divider);
			console.log(prettyJson(doc.data));
		}
		console.log('\n' + '═'.repeat(60) + '\n');
	} else {
		// Single document
		console.log('\n' + '═'.repeat(60));
		console.log(`  Document: ${args.collection}/${data.id}`);
		console.log('═'.repeat(60));
		console.log(prettyJson(data.data));

		if (data.subCollections) {
			console.log(`\n  📂 Sub-collections:`);
			for (const sub of data.subCollections) {
				console.log(`     └─ ${sub.collection}  (${sub.docCount} docs)`);
			}
		}
		console.log('\n' + '═'.repeat(60) + '\n');
	}
}

function prettyJson(obj) {
	return JSON.stringify(obj, null, 2)
		.split('\n')
		.map((line) => '  ' + line)
		.join('\n');
}

main();
