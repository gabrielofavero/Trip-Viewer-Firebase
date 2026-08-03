/**
 * Build script for Trip-Viewer-Firebase.
 *
 * Copies static assets from public/ to dist/, injects HTML partials,
 * and copies Firebase config files.
 *
 * Usage:
 *   node scripts/build/build.js          — one-shot build
 *   node scripts/build/build.js --watch  — watch mode (rebuilds on changes)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..", "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const DIST_DIR = path.join(ROOT, "dist");

const watchMode = process.argv.includes("--watch");
const noLiveReload = process.argv.includes("--no-livereload");

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

	// 1. Clean dist/
	fs.rmSync(DIST_DIR, { recursive: true, force: true });

	// 2. Copy all of public/ to dist/
	console.log("[build] Copying public/ → dist/ ...");
	copyRecursive(PUBLIC_DIR, DIST_DIR);

	// 2b. Inject shared HTML partials into dist/ HTML files
	console.log("[build] Injecting HTML partials...");
	const { inject } = require("./inject-partials.js");
	inject({ noLiveReload });

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
		fs.copyFileSync(firebaseConfig, path.join(DIST_DIR, "firebase-config.js"));
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
 * Read the semantic version calculated by the README maintenance script
 * (scripts/utils/readme.py) and persist it into package.json.
 *
 * The README is the single source of truth for the version; build keeps
 * package.json in sync. Idempotent — only writes when the version differs.
 */
function syncPackageVersion() {
	try {
		const output = execSync("python scripts/utils/readme.py --version", {
			cwd: ROOT,
			encoding: "utf8",
		})
			.trim()
			.split(/\r?\n/)
			.filter(Boolean)
			.pop()
			.trim();

		if (!/^\d+\.\d+\.\d+$/.test(output)) {
			console.warn(
				`[build] WARNING: unexpected version output "${output}"; skipping package version sync.`,
			);
			return;
		}

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

	// Debounce + serialize rebuilds: coalesce bursts of change events and never
	// run build() concurrently with itself.
	const scheduleBuild = (reason) => {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			if (building) {
				queued = true;
				return;
			}
			building = true;
			try {
				console.log(`[watch] Change detected: ${reason}`);
				build();
			} catch (err) {
				console.error("[watch] Build failed (watcher continues):", err);
			} finally {
				building = false;
				if (queued) {
					queued = false;
					scheduleBuild("queued rebuild (changes arrived during build)");
				}
			}
		}, 300);
	};

	// Resilient fs.watch: attach an error handler (a missing handler turns a
	// watcher 'error' event into an uncaught exception → process crash, the
	// classic recursive-watch failure on Windows) and recreate the watcher on
	// error instead of dying.
	let watcher = null;
	const createWatcher = () => {
		const handleEvent = (eventType, filename) => {
			if (filename) {
				scheduleBuild(filename);
			}
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
	// events. Snapshot public/ (path → mtime) periodically so changes are still
	// caught even if the OS watcher goes quiet.
	const snapshotPublic = () => {
		const snapshot = new Map();
		const walk = (dir) => {
			for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
				const full = path.join(dir, entry.name);
				if (entry.isDirectory()) {
					walk(full);
				} else {
					try {
						snapshot.set(full, fs.statSync(full).mtimeMs);
					} catch {
						// File vanished mid-scan — ignore.
					}
				}
			}
		};
		walk(PUBLIC_DIR);
		return snapshot;
	};

	const pollIntervalMs = 2000;
	let lastSnapshot = snapshotPublic();
	const poll = () => {
		try {
			const current = snapshotPublic();
			if (current.size !== lastSnapshot.size) {
				scheduleBuild("polling detected file added/removed");
			} else {
				for (const [file, mtime] of current) {
					if (lastSnapshot.get(file) !== mtime) {
						scheduleBuild("polling detected file change");
						break;
					}
				}
			}
			lastSnapshot = current;
		} catch (err) {
			console.error("[watch] Poll scan failed (continuing):", err);
		}
	};

	createWatcher();
	setInterval(poll, pollIntervalMs);

	build();
} else {
	build();
}
