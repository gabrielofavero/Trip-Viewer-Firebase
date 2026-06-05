/**
 * Build script for Trip-Viewer-Firebase.
 *
 * Phase 0: Copies static assets from public/ to dist/.
 * Phase 9+: Transpiles ES module JS files (with export/import) to IIFE format
 *           so they work with regular <script> tags during the migration.
 *
 * Usage:
 *   node scripts/build.js          — one-shot build
 *   node scripts/build.js --watch  — watch mode (rebuilds on changes)
 */

const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const ROOT = path.resolve(__dirname, "..");
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

  // 3. Copy firebase.json and firebase-config.js to dist/
  console.log("[build] Copying Firebase config files...");
  const firebaseJson = path.join(ROOT, "firebase.json");
  const firebaseConfig = path.join(ROOT, "firebase-config.js");

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

  // 4. Transpile ES module JS files to IIFE format (strips export/import)
  //    so they work with regular <script> tags during migration phases P9-P11.
  console.log("[build] Transpiling ES modules to IIFE...");
  transpileESModules();

  const elapsed = Date.now() - start;
  console.log(`[build] Done in ${elapsed}ms.`);
}

/**
 * Transpile all .js source files in public/ that contain ES module syntax
 * into IIFE format, outputting to dist/.
 *
 * - Files WITHOUT imports: transformSync strips `export` keywords.
 * - Files WITH imports: buildSync with bundle:true resolves and inlines deps.
 *
 * Source files in public/ are never modified — only dist/ is written.
 * This ensures imports always resolve against the original source.
 *
 * During migration phases P9-P11, source files use ES module syntax but
 * HTML files still use plain <script> tags. This bridge keeps things working.
 */
function transpileESModules() {
  const jsFiles = findJSFiles(PUBLIC_DIR);
  let count = 0;

  for (const srcFile of jsFiles) {
    // Compute relative path and corresponding dist path
    const relPath = path.relative(PUBLIC_DIR, srcFile).replace(/\\/g, "/");

    // Skip vendor files, Firebase config, and barrel files
    if (
      relPath.startsWith("assets/vendor/") ||
      relPath === "firebase-config.js" ||
      relPath.startsWith("assets/js/utils/") ||
      relPath.startsWith("assets/js/services/") ||
      relPath.startsWith("assets/js/styles/")
    ) {
      continue;
    }

    const content = fs.readFileSync(srcFile, "utf8");

    // Only transpile files that contain ES module syntax
    if (!/\bexport\b/.test(content) && !/\bimport\b/.test(content)) {
      continue;
    }

    const distFile = path.join(DIST_DIR, relPath);
    const hasImports = /\bimport\b/.test(content);

    try {
      if (hasImports) {
        // Use buildSync to resolve imports, outputting bundled IIFE
        const result = esbuild.buildSync({
          entryPoints: [srcFile],
          bundle: true,
          format: "iife",
          target: "es2020",
          write: false,
          absWorkingDir: PUBLIC_DIR,
        });
        fs.writeFileSync(distFile, result.outputFiles[0].text, "utf8");
      } else {
        // Use transformSync to just strip export keywords
        const result = esbuild.transformSync(content, {
          loader: "js",
          format: "iife",
          target: "es2020",
        });
        fs.writeFileSync(distFile, result.code, "utf8");
      }
      count++;
    } catch (err) {
      console.error(`[build] ERROR transpiling ${relPath}: ${err.message}`);
    }
  }

  if (count > 0) {
    console.log(`[build] Transpiled ${count} ES module file(s) to IIFE.`);
  }
}

/**
 * Recursively find all .js files in a directory.
 */
function findJSFiles(dir) {
  const results = [];
  try {
    for (const entry of fs.readdirSync(dir)) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...findJSFiles(fullPath));
      } else if (entry.endsWith(".js")) {
        results.push(fullPath);
      }
    }
  } catch {
    // Directory may not exist yet — ignore
  }
  return results;
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
