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

  // 0. Type-check TypeScript (blocks build on errors)
  console.log("[build] Type-checking TypeScript...");
  try {
    execSync(`"${path.join(ROOT, "node_modules", ".bin", "tsc")}" --noEmit`, {
      cwd: ROOT,
      stdio: "inherit",
    });
  } catch {
    console.error("\n[build] ❌ Build aborted — TypeScript errors found. Fix them and try again.");
    process.exit(1);
  }

  // 1. Clean dist/
  fs.rmSync(DIST_DIR, { recursive: true, force: true });

  // 2. Copy all of public/ to dist/
  console.log("[build] Copying public/ → dist/ ...");
  copyRecursive(PUBLIC_DIR, DIST_DIR);

  // 2b. Inject shared HTML partials into dist/ HTML files
  console.log("[build] Injecting HTML partials...");
  const { inject } = require("./inject-partials.js");
  inject();

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
  glob.sync("dist/assets/ts/**/*.ts").forEach(f => fs.rmSync(f));
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
    console.warn("[build] WARNING: firebase-config.js not found at project root.");
  }

  if (fs.existsSync(indexJs)) {
    fs.copyFileSync(indexJs, path.join(DIST_DIR, "index.js"));
  } else {
    console.warn("[build] WARNING: index.js not found at project root.");
  }

  const elapsed = Date.now() - start;
  console.log(`[build] Done in ${elapsed}ms.`);

  // Signal live-reload clients (polling-based, no proxy needed)
  fs.writeFileSync(path.join(DIST_DIR, "reload"), String(Date.now()));
}

// --- Watch mode ---
if (watchMode) {
  console.log("[watch] Watching public/ for changes...");

  // Use a simple polling-based watcher for cross-platform compatibility.
  let debounceTimer = null;
  const watchDir = (dir) => {
    try {
      fs.watch(dir, { recursive: true }, (eventType, filename) => {
        if (filename) {
          // Debounce: wait 300ms after last change before rebuilding
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            console.log(`[watch] Change detected: ${filename}`);
            build();
          }, 300);
        }
      });
    } catch {
      // Some platforms don't support recursive watch — fall back to non-recursive
      fs.watch(dir, (eventType, filename) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          console.log(`[watch] Change detected: ${filename}`);
          build();
        }, 300);
      });
    }
  };

  watchDir(PUBLIC_DIR);
  build();
} else {
  build();
}
