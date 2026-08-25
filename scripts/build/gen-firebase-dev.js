/**
 * Generates firebase.dev.json from firebase.json.
 *
 * The dev config is a full deep-copy of firebase.json with the
 * `hosting.headers` array replaced by a single `no-store` rule, so the
 * emulator never serves stale content during development. Rewrites,
 * redirects, the SPA rewrite, emulators, and functions config are all
 * preserved from the single source of truth (firebase.json).
 *
 * firebase.dev.json is generated — never hand-edit it.
 *
 * Usage:
 *   node scripts/build/gen-firebase-dev.js
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const SRC = path.join(ROOT, "firebase.json");
const DEST = path.join(ROOT, "firebase.dev.json");

function generate() {
	if (!fs.existsSync(SRC)) {
		console.error("[gen-firebase-dev] firebase.json not found at project root.");
		process.exit(1);
	}

	// Deep-copy so the generated file is independent of the original.
	const original = JSON.parse(fs.readFileSync(SRC, "utf8"));
	const dev = JSON.parse(JSON.stringify(original));

	if (!dev.hosting || typeof dev.hosting !== "object") {
		dev.hosting = {};
	}

	dev.hosting.headers = [
		{
			source: "**/*",
			headers: [
				{
					key: "Cache-Control",
					value: "no-store",
				},
			],
		},
	];

	fs.writeFileSync(DEST, JSON.stringify(dev, null, 2) + "\n");
	console.log("[gen-firebase-dev] Wrote firebase.dev.json (no-store on **/*).");
}

if (require.main === module) {
	generate();
}

module.exports = { generate };
