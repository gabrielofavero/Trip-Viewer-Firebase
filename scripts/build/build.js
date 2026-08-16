/**
 * Build script for Trip-Viewer-Firebase.
 *
 * Copies static assets from public/ to dist/, injects HTML partials,
 * and copies Firebase config files.
 *
 * Usage:
 *   node scripts/build/build.js               — one-shot build
 *   node scripts/build/build.js --watch       — watch mode (rebuilds on changes)
 *   node scripts/build/build.js --mode dev|prod — explicit build mode
 *   node scripts/build/build.js --use-emulator true|false — emulator vs real data (default true)
 *
 * Mode inference (when --mode is omitted):
 *   --watch or NODE_ENV=development → dev, otherwise → prod.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const DIST_DIR = path.join(ROOT, "dist");

const watchMode = process.argv.includes("--watch");
const noLiveReload = process.argv.includes("--no-livereload");

/**
 * Resolve the emulator flag. `--use-emulator true|false` controls whether the
 * built frontend connects to the local emulators on localhost. An explicit
 * value wins; otherwise it defaults to `true` (the `npm run dev` emulator
 * flow). Pass `false` for dev:prd / dev:dev, which serve real Firebase data.
 */
function resolveUseEmulator() {
	const flagIdx = process.argv.indexOf("--use-emulator");
	if (flagIdx !== -1) {
		const value = process.argv[flagIdx + 1];
		if (value === "true" || value === "false") return value;
		console.error(
			`[build] Invalid --use-emulator "${value}". Use --use-emulator true|false.`,
		);
		process.exit(1);
	}
	return "true";
}

const useEmulator = resolveUseEmulator();

/**
 * Resolve the build mode. An explicit `--mode dev|prod` wins; otherwise
 * `--watch` or `NODE_ENV=development` implies dev, everything else is prod.
 */
function resolveBuildMode() {
	const modeIdx = process.argv.indexOf("--mode");
	if (modeIdx !== -1) {
		const value = process.argv[modeIdx + 1];
		if (value === "dev" || value === "prod") return value;
		console.error(`[build] Invalid --mode "${value}". Use --mode dev|prod.`);
		process.exit(1);
	}
	return watchMode || process.env.NODE_ENV === "development" ? "dev" : "prod";
}

const buildMode = resolveBuildMode();

/**
 * Recursively copy a directory (or file).
 */
function copyRecursive(src, dest) {
	const stat = fs.statSync(src);
	if (stat.isDirectory()) {
		fs.mkdirSync(dest, { recursive: true });
		for (const entry of fs.readdirSync(src)) {
			copyRecursive(path.join(src, entry), path.join(dest, entry));
		}
	} else {
		fs.mkdirSync(path.dirname(dest), { recursive: true });
		fs.copyFileSync(src, dest);
	}
}

/**
 * Clean dist/ then copy all sources.
 */
function build() {
	const start = Date.now();

	console.log(`[build] Mode: ${buildMode}`);

	// 1. Clean dist/
	// Retry on Windows: the Firebase hosting emulator (and AV/indexer) can hold
	// a dist/ file open while serving it, which makes a single rmSync fail with
	// ENOTEMPTY/EBUSY/EPERM. maxRetries+retryDelay retries those specific codes.
	fs.rmSync(DIST_DIR, {
		recursive: true,
		force: true,
		maxRetries: 10,
		retryDelay: 100,
	});

	// 1b. Ensure the self-hosted web fonts exist in public/ (idempotent — skips
	// the network when they are up to date). Runs before the copy step so any
	// freshly generated woff2 files and fonts.css reach dist/.
	console.log("[build] Ensuring self-hosted fonts...");
	execSync(`"${process.execPath}" "${path.join(__dirname, "vendor-fonts.js")}"`, {
		cwd: ROOT,
		stdio: "inherit",
	});

	// 2. Copy all of public/ to dist/
	console.log("[build] Copying public/ → dist/ ...");
	copyRecursive(PUBLIC_DIR, DIST_DIR);

	// 2b. Inject shared HTML partials into dist/ HTML files
	console.log("[build] Injecting HTML partials...");
	const { inject } = require("./inject-partials.js");
	inject({ noLiveReload, mode: buildMode, useEmulator });

	// 2c. Compile TypeScript → JavaScript
	console.log("[build] Compiling TypeScript...");
	const glob = require("glob");
	const tsFiles = glob.sync("dist/assets/ts/**/*.ts");
	if (tsFiles.length > 0) {
		require("esbuild").buildSync({
			entryPoints: tsFiles,
			outdir: "dist/assets/ts",
			format: "esm",
			target: "es2020",
			allowOverwrite: true,
			logLevel: "error",
		});
	}
	// Remove .ts source files from dist/ (only compiled .js needed)
	glob.sync("dist/assets/ts/**/*.ts").forEach((f) => fs.rmSync(f));
	console.log(`[build] Compiled ${tsFiles.length} TS files.`);

	// 3. Copy firebase.json, firebase-config.js, and index.js to dist/
	console.log("[build] Copying Firebase config and entry files...");
	const firebaseJson = path.join(ROOT, "firebase.json");
	const firebaseConfig = path.join(ROOT, "firebase-config.js");
	const indexJs = path.join(ROOT, "index.js");

	if (fs.existsSync(firebaseJson)) {
		fs.copyFileSync(firebaseJson, path.join(DIST_DIR, "firebase.json"));
	} else {
		console.warn("[build] WARNING: firebase.json not found at project root.");
	}

	if (fs.existsSync(firebaseConfig)) {
		// Substitute the build-time USE_EMULATOR flag into the copied config so
		// its localhost emulator block matches the `--use-emulator` value.
		const configContent = fs
			.readFileSync(firebaseConfig, "utf8")
			.replace(/\{\{USE_EMULATOR\}\}/g, useEmulator);
		fs.writeFileSync(path.join(DIST_DIR, "firebase-config.js"), configContent);
	} else {
		console.warn(
			"[build] WARNING: firebase-config.js not found at project root.",
		);
	}

	if (fs.existsSync(indexJs)) {
		fs.copyFileSync(indexJs, path.join(DIST_DIR, "index.js"));
	} else {
		console.warn("[build] WARNING: index.js not found at project root.");
	}

	// 2d0. Generate the self-hosted Iconify bundle (scans public/ for icon
	// names, resolves them via the Iconify API with an on-disk cache, and
	// writes dist/assets/json/iconify-icons.json). Runs before hash-assets so
	// the file is present (and, being in EXCLUDED_FILES, keeps its stable name).
	console.log("[build] Generating self-hosted Iconify bundle...");
	execSync(`"${process.execPath}" "${path.join(__dirname, "gen-iconify-bundle.js")}"`, {
		cwd: ROOT,
		stdio: "inherit",
	});

	// 2e. Content-hash built JS/CSS (deep, dependency-aware) so the immutable
	// Cache-Control on *.js/*.css is always correct after a deploy.
	// Prod only: in dev the no-store headers make hashing redundant, and
	// skipping it keeps dev rebuilds fast.
	if (buildMode === "prod") {
		console.log("[build] Hashing assets...");
		const { hashAssets } = require("./hash-assets.js");
		const rewrittenRefs = hashAssets(DIST_DIR, { mode: buildMode });
		console.log(
			`[build] Hashed assets (${rewrittenRefs} references rewritten).`,
		);
	} else {
		console.log(
			"[build] Hashing skipped (dev) — dev relies on Cache-Control: no-store. " +
				"Verify it in P5; if absent, enable the ?v= fallback.",
		);
	}

	// 2f. Generate the static-export manifest. Runs after hash-assets in prod
	// and after TS compile in dev, so it always sees the final dist/ asset
	// graph (final hashed filenames in prod, unhashed in dev).
	console.log("[build] Generating static-export manifest...");
	const { generateStaticExportManifest } = require("./gen-static-export-manifest.js");
	generateStaticExportManifest(DIST_DIR, { mode: buildMode });

	// 2d. Sync package.json version to the version calculated from README.md
	syncPackageVersion();

	// Signal live-reload clients immediately after compilation (before slow type-check)
	fs.writeFileSync(path.join(DIST_DIR, "reload"), String(Date.now()));

	const elapsed = Date.now() - start;
	console.log(`[build] Compiled in ${elapsed}ms.`);

	// 4. Type-check TypeScript (runs after compilation so reload isn't blocked)
	console.log("[build] Type-checking TypeScript...");
	typeCheck();
}

// --- Package version sync ---

/**
 * Read the latest version from CHANGELOG.md (the deployment-driven source of
 * truth for versions) and persist it into package.json.
 *
 * The CHANGELOG is the single source of truth for the version; build keeps
 * package.json in sync. Idempotent — only writes when the version differs.
 */
function syncPackageVersion() {
	try {
		const changelogPath = path.join(ROOT, "CHANGELOG.md");
		if (!fs.existsSync(changelogPath)) {
			console.warn(
				"[build] WARNING: CHANGELOG.md not found; skipping package version sync.",
			);
			return;
		}

		const changelog = fs.readFileSync(changelogPath, "utf8");
		const match = changelog.match(/^## \[(\d+\.\d+\.\d+)\]/m);
		if (!match) {
			console.warn(
				"[build] WARNING: no version heading found in CHANGELOG.md; skipping package version sync.",
			);
			return;
		}

		const output = match[1];

		const packageJsonPath = path.join(ROOT, "package.json");
		if (fs.existsSync(packageJsonPath)) {
			const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
			if (pkg.version !== output) {
				pkg.version = output;
				fs.writeFileSync(
					packageJsonPath,
					JSON.stringify(pkg, null, 2) + "\n",
				);
				console.log(`[build] package.json version ${pkg.version} → ${output}`);
			} else {
				console.log(`[build] package.json already at ${output}.`);
			}
		}
	} catch (err) {
		console.warn(
			"[build] WARNING: could not sync package version from README:",
			err && err.message ? err.message : err,
		);
	}
}

/**
 * Run tsc --noEmit. In one-shot mode, aborts on errors.
 * In watch mode, only reports errors (non-blocking).
 */
function typeCheck() {
	try {
		execSync(`"${path.join(ROOT, "node_modules", ".bin", "tsc")}" --noEmit`, {
			cwd: ROOT,
			stdio: "inherit",
		});
		console.log("[build] Type-check passed.");
	} catch {
		// Collect per-file error summary from tsc (--pretty false for machine-parseable output)
		try {
			execSync(
				`"${path.join(ROOT, "node_modules", ".bin", "tsc")}" --noEmit --pretty false`,
				{ cwd: ROOT, stdio: "pipe" },
			);
		} catch (e) {
			const output = (e.stdout || "") + (e.stderr || "");
			const errorLines = output
				.split("\n")
				.filter((l) => l.includes("error TS"));
			if (errorLines.length > 0) {
				const files = new Set();
				for (const line of errorLines) {
					const m = line.match(/^(.+?)\(\d+/);
					if (m) files.add(m[1]);
				}
				if (files.size > 0) {
					console.error("\n[build] Files with TypeScript errors:");
					for (const f of files) console.error(`  • ${f}`);
				}
			}
		}

		if (watchMode) {
			console.error(
				"[build] ⚠ TypeScript errors found (page already reloaded).",
			);
		} else {
			console.error(
				"\n[build] ❌ Build aborted — TypeScript errors found. Fix them and try again.",
			);
			process.exit(1);
		}
	}
}

// --- Watch mode ---
if (watchMode) {
	console.log("[watch] Watching public/ for changes...");

	// Keep the watcher alive through transient errors. A build watcher restarting
	// every time the OS watcher hiccups is worse than a noisy log, so we log
	// uncaught exceptions / rejections and continue running.
	process.on("uncaughtException", (err) => {
		console.error("[watch] Uncaught exception (keeping watcher alive):", err);
	});
	process.on("unhandledRejection", (reason) => {
		console.error("[watch] Unhandled rejection (keeping watcher alive):", reason);
	});

	let debounceTimer = null;
	let building = false;
	let queued = false;
	// Map<file → { mtimeMs, size, hash }>. `hash` is the content hash captured
	// the last time we confirmed the file's bytes. It lets us tell a real edit
	// apart from a metadata-only touch (antivirus scan, git checkout/stash,
	// editor watcher, Windows indexer, OneDrive, ...) that moves mtime without
	// changing content — the root cause of "refresh without code changes".
	let lastSnapshot = null;

	const hashFile = (file) =>
		crypto.createHash("sha1").update(fs.readFileSync(file)).digest("hex");

	// Stat every file under public/ (mtime + size only). Content hashes are
	// resolved lazily inside detectChanges so the periodic scan stays cheap even
	// with 20+ MB of images/vendor bundles in the tree.
	const snapshotPublic = () => {
		const snapshot = new Map();
		const walk = (dir) => {
			for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
				const full = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					walk(full);
				} else {
					try {
						const stat = fs.statSync(full);
						snapshot.set(full, {
							mtimeMs: stat.mtimeMs,
							size: stat.size,
							hash: null,
						});
					} catch {
						// File vanished mid-scan — ignore.
					}
				}
			}
		};
		walk(PUBLIC_DIR);
		return snapshot;
	};

	// Reconcile the current state of public/ against lastSnapshot. Returns a
	// human-readable reason when a REAL content change is found, or null when
	// nothing changed (or only metadata changed). This is the single source of
	// truth for both fs.watch events and the polling heartbeat, so they can
	// never disagree about what counts as "changed".
	const detectChanges = () => {
		const current = snapshotPublic();
		let reason = null;

		// Files that disappeared since the last scan.
		for (const file of lastSnapshot.keys()) {
			if (!current.has(file)) {
				lastSnapshot.delete(file);
				reason = `file removed: ${file}`;
			}
		}

		for (const [file, meta] of current) {
			const prev = lastSnapshot.get(file);

			if (!prev) {
				// New file — always a real change.
				meta.hash = hashFile(file);
				lastSnapshot.set(file, meta);
				reason = `file added: ${file}`;
				continue;
			}

			if (prev.size !== meta.size) {
				// Size differs — content definitely changed (no hash needed).
				meta.hash = hashFile(file);
				lastSnapshot.set(file, meta);
				reason = `file changed: ${file}`;
				continue;
			}

			if (prev.mtimeMs !== meta.mtimeMs) {
				// mtime moved but the size is identical — hash the bytes to
				// decide between a real edit and a metadata-only touch.
				const hash = hashFile(file);
				if (hash !== prev.hash) {
					meta.hash = hash;
					lastSnapshot.set(file, meta);
					reason = `file changed: ${file}`;
					continue;
				}
				// Content identical — spurious touch. Refresh the stored
				// mtime/size so we don't re-hash on the next scan, but keep
				// the old hash and do NOT rebuild.
				meta.hash = prev.hash;
				lastSnapshot.set(file, meta);
				continue;
			}

			// Fully unchanged.
			meta.hash = prev.hash;
			lastSnapshot.set(file, meta);
		}

		return reason;
	};

	// Debounce + serialize rebuilds: coalesce bursts of change events and never
	// run build() concurrently with itself.
	const scheduleCheck = (source) => {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			if (building) {
				queued = true;
				return;
			}
			building = true;
			try {
				const reason = detectChanges();
				if (reason) {
					console.log(`[watch] Change detected (${source}): ${reason}`);
					build();
				}
			} catch (err) {
				console.error("[watch] Change check failed (watcher continues):", err);
			} finally {
				building = false;
				if (queued) {
					queued = false;
					scheduleCheck("queued rebuild (changes arrived during build)");
				}
			}
		}, 300);
	};

	// Initial build BEFORE attaching any watchers: guarantees exactly one
	// startup build (no watcher/poll event can trigger a duplicate during it).
	building = true;
	try {
		build();
	} finally {
		building = false;
	}
	lastSnapshot = snapshotPublic();
	for (const [file, meta] of lastSnapshot) meta.hash = hashFile(file);

	// Resilient fs.watch: attach an error handler (a missing handler turns a
	// watcher 'error' event into an uncaught exception → process crash, the
	// classic recursive-watch failure on Windows) and recreate the watcher on
	// error instead of dying. Events only TRIGGER a full content scan — the
	// scan itself decides whether anything actually changed, so spurious
	// Windows directory/metadata events can no longer cause a rebuild by
	// themselves.
	let watcher = null;
	const createWatcher = () => {
		const handleEvent = () => {
			scheduleCheck("fs.watch");
		};
		const handleError = (err) => {
			console.error(
				`[watch] File watcher error (${err && err.message ? err.message : err}). Recreating watcher...`,
			);
			// Recreate shortly; the polling heartbeat below covers the gap.
			setTimeout(() => {
				watcher = createWatcher();
			}, 500);
		};
		const attach = (w) => {
			w.on("error", handleError);
			return w;
		};
		try {
			// Recursive watch — supported on Linux/macOS/Windows.
			return attach(fs.watch(PUBLIC_DIR, { recursive: true }, handleEvent));
		} catch {
			// Some platforms/environments don't support recursive watch.
			try {
				return attach(fs.watch(PUBLIC_DIR, handleEvent));
			} catch (err) {
				console.error(
					`[watch] fs.watch unavailable (${err && err.message ? err.message : err}); relying on polling heartbeat.`,
				);
				return null;
			}
		}
	};

	// Polling heartbeat: on some platforms fs.watch can silently stop delivering
	// events. Reconcile the full public/ tree periodically so changes are still
	// caught even if the OS watcher goes quiet.
	const pollIntervalMs = 2000;
	const poll = () => {
		scheduleCheck("polling heartbeat");
	};

	createWatcher();
	setInterval(poll, pollIntervalMs);
} else {
	build();
}
