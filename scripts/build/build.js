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

  // 1. Clean dist/
  fs.rmSync(DIST_DIR, { recursive: true, force: true });

  // 2. Copy all of public/ to dist/
  console.log("[build] Copying public/ → dist/ ...");
  copyRecursive(PUBLIC_DIR, DIST_DIR);

  // 2b. Inject shared HTML partials into dist/ HTML files
  console.log("[build] Injecting HTML partials...");
  const { inject } = require("./inject-partials.js");
  inject();

  // 3. Copy firebase.json, firebase-config.js, and index.js to dist/
  console.log("[build] Copying Firebase config files...");
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
