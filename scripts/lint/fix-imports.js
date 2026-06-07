/**
 * ======= Auto-Import Fixer =======
 *
 * Scans all exports across the JS codebase, then automatically adds
 * missing imports to every file that calls functions without importing them.
 *
 * Usage: node scripts/lint/fix-imports.js [--dry-run] [--verbose]
 */

const fs = require("fs");
const path = require("path");

const JS_ROOT = path.resolve(__dirname, "..", "..", "public", "assets", "js");
const dryRun = process.argv.includes("--dry-run");
const verbose = process.argv.includes("--verbose");

// ---------------------------------------------------------------
// Step 1: Build export map — { functionName: relativePath }
// ---------------------------------------------------------------

const RE_EXPORT_FN = /export\s+(?:async\s+)?function\s+(\w+)/g;
const RE_EXPORT_CONST = /export\s+(?:const|let|var)\s+(\w+)/g;
const RE_EXPORT_CLASS = /export\s+class\s+(\w+)/g;

function buildExportMap() {
  const map = new Map(); // name → [file1, file2, ...] (rarely multiple)

  function* walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        yield* walk(full);
      } else if (entry.name.endsWith(".js")) {
        yield full;
      }
    }
  }

  for (const filePath of walk(JS_ROOT)) {
    const rel = path.relative(JS_ROOT, filePath).replace(/\\/g, "/");
    if (rel === "data/state.js") continue; // skip

    const source = fs.readFileSync(filePath, "utf-8");

    for (const m of source.matchAll(RE_EXPORT_FN)) {
      const name = m[1];
      if (!map.has(name)) map.set(name, []);
      if (!map.get(name).includes(rel)) map.get(name).push(rel);
    }
    for (const m of source.matchAll(RE_EXPORT_CONST)) {
      const name = m[1];
      if (!map.has(name)) map.set(name, []);
      if (!map.get(name).includes(rel)) map.get(name).push(rel);
    }
    for (const m of source.matchAll(RE_EXPORT_CLASS)) {
      const name = m[1];
      if (!map.has(name)) map.set(name, []);
      if (!map.get(name).includes(rel)) map.get(name).push(rel);
    }
  }

  return map;
}

// ---------------------------------------------------------------
// Step 2: Get relative import path from file A to file B
// ---------------------------------------------------------------
function getRelativeImportPath(fromFileRel, toFileRel) {
  const fromDir = path.dirname(fromFileRel);
  let rel = path.relative(fromDir, toFileRel).replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel.replace(/\.js$/, ".js"); // keep .js extension
}

// ---------------------------------------------------------------
// Step 3: Find what's missing in a file and add imports
// ---------------------------------------------------------------

function fixFile(filePath, exportMap) {
  const relPath = path.relative(JS_ROOT, filePath).replace(/\\/g, "/");
  const source = fs.readFileSync(filePath, "utf-8");

  // Skip if no function calls at all
  if (source.length < 10) return { changed: false, path: relPath };

  // Extract existing imports
  const existingImports = new Set();
  const RE_NAMED_IMPORT = /import\s+\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g;
  for (const m of source.matchAll(RE_NAMED_IMPORT)) {
    const names = m[1].split(",").map((s) => {
      const parts = s.trim().split(/\s+as\s+/);
      return parts[parts.length - 1].trim();
    });
    for (const n of names) existingImports.add(n);
  }

  // Extract local definitions (function/const/let/var)
  const localDefs = new Set();
  const RE_FN = /(?:^|\s)(?:async\s+)?function\s+(\w+)/gm;
  const RE_VAR = /(?:^|\s)(?:const|let|var)\s+(\w+)\s*=/gm;
  const RE_CLASS = /(?:^|\s)class\s+(\w+)/gm;
  for (const m of source.matchAll(RE_FN)) localDefs.add(m[1]);
  for (const m of source.matchAll(RE_VAR)) localDefs.add(m[1]);
  for (const m of source.matchAll(RE_CLASS)) localDefs.add(m[1]);

  // Extract function calls (simple identifiers followed by paren)
  // Strip strings and comments first
  let clean = source.replace(/`[^`]*`/g, '""');
  clean = clean.replace(/"(?:[^"\\]|\\.)*"/g, '""');
  clean = clean.replace(/'(?:[^'\\]|\\.)*'/g, '""');
  clean = clean.replace(/\/\/.*$/gm, "");
  clean = clean.replace(/\/\*[\s\S]*?\*\//g, "");

  const RE_CALL = /(?<![.\w])(\w+)\s*\(/g;
  const calledNames = new Set();
  for (const m of clean.matchAll(RE_CALL)) {
    const name = m[1];
    if (/^(if|for|while|switch|catch|function|return|typeof|new|throw|delete|void|await|yield|case|import|export|class|extends|super|instanceof|in|of|try|finally|else|do|break|continue|debugger|with|static|async|get|set)$/.test(name)) continue;
    calledNames.add(name);
  }

  // Known globals that we should NOT import
  const KNOWN_GLOBALS = new Set([
    "Object", "Array", "String", "Number", "Boolean", "Date", "Math",
    "JSON", "Error", "TypeError", "RegExp", "Map", "Set", "WeakMap",
    "Promise", "Symbol", "Intl", "console", "document", "window",
    "navigator", "localStorage", "sessionStorage", "location", "fetch",
    "setTimeout", "setInterval", "clearTimeout", "clearInterval",
    "requestAnimationFrame", "cancelAnimationFrame",
    "addEventListener", "removeEventListener",
    "parseInt", "parseFloat", "isNaN", "isFinite", "eval",
    "encodeURIComponent", "decodeURIComponent",
    "FormData", "FileReader", "Blob", "URL", "URLSearchParams",
    "IntersectionObserver", "MutationObserver", "ResizeObserver",
    "CustomEvent", "Event",
    "firebase", "$", "jQuery", "bootstrap", "AOS", "Swiper", "GLightbox",
    "Isotope", "Typed", "Waypoint", "Iconify", "google", "Sortable",
    "XMLHttpRequest", "ClipboardItem", "Image",
    "require", "module", "exports", "__dirname", "__filename", "process",
    "global", "globalThis", "alert", "confirm", "prompt",
    "gsap", "ScrollTrigger",
    // Callback/parameter names
    "fn", "callback", "done", "resolve", "reject", "action", "check",
    "build", "batch", "task", "constructor",
  ]);

  // Find missing: called but not defined locally and not imported
  const missing = [];
  for (const name of calledNames) {
    if (localDefs.has(name)) continue;
    if (existingImports.has(name)) continue;
    if (KNOWN_GLOBALS.has(name)) continue;
    if (!exportMap.has(name)) continue; // can't resolve

    const sources = exportMap.get(name);
    // Pick the first source (most common)
    const sourceFile = sources[0];
    if (sourceFile === relPath) continue; // same file

    missing.push({ name, sourceFile });
  }

  if (missing.length === 0) return { changed: false, path: relPath };

  // Group missing by source file
  const bySource = new Map();
  for (const m of missing) {
    if (!bySource.has(m.sourceFile)) bySource.set(m.sourceFile, []);
    bySource.get(m.sourceFile).push(m.name);
  }

  // Deduplicate names
  for (const [src, names] of bySource) {
    bySource.set(src, [...new Set(names)]);
  }

  // Build new import lines and merge with existing
  const newImportLines = [];
  const mergeIntoExisting = []; // { importPath, lineIndex, namesToAdd }

  for (const [sourceFile, names] of bySource) {
    const importPath = getRelativeImportPath(relPath, sourceFile);
    const sortedNames = names.sort();

    // Check if we already import from this path
    const existingLineRegex = new RegExp(
      `import\\s+\\{([^}]+)\\}\\s*from\\s*['"]${importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]`,
      "g"
    );
    const existingMatch = existingLineRegex.exec(source);

    if (existingMatch) {
      // Merge new names into existing import
      const existingNames = existingMatch[1]
        .split(",")
        .map((s) => s.trim().split(/\s+as\s+/).pop().trim())
        .filter(Boolean);

      const allNames = [...new Set([...existingNames, ...sortedNames])].sort();
      const newImportLine = `import { ${allNames.join(", ")} } from '${importPath}';`;

      // Find the line index in the source
      const beforeMatch = source.substring(0, existingMatch.index);
      const lineIndex = beforeMatch.split("\n").length - 1;
      mergeIntoExisting.push({
        lineIndex,
        oldLine: existingMatch[0],
        newLine: newImportLine,
      });
    } else {
      newImportLines.push(
        `import { ${sortedNames.join(", ")} } from '${importPath}';`
      );
    }
  }

  if (newImportLines.length === 0 && mergeIntoExisting.length === 0) {
    return { changed: false, path: relPath };
  }

  // Apply merges first
  let mergedSource = source;
  for (const merge of mergeIntoExisting) {
    mergedSource = mergedSource.replace(merge.oldLine, merge.newLine);
  }

  // Insert new imports
  const lines = mergedSource.split("\n");
  let lastImportIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*import\s/.test(lines[i])) {
      lastImportIdx = i + 1;
    }
  }

  // If no existing imports, put after the header comment block
  if (lastImportIdx === 0) {
    // Find end of comment block
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("*/")) {
        lastImportIdx = i + 1;
        break;
      }
    }
    if (lastImportIdx === 0) lastImportIdx = 0;
    newImportLines.push(""); // blank line after imports
  }

  lines.splice(lastImportIdx, 0, ...newImportLines);
  const newSource = lines.join("\n");

  if (!dryRun) {
    fs.writeFileSync(filePath, newSource, "utf-8");
  }

  const totalAdded = missing.length;
  return {
    changed: true,
    path: relPath,
    added: totalAdded,
    lines: [...newImportLines, ...mergeIntoExisting.map((m) => m.newLine)],
  };
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------
console.log(`\n🔧 Auto-Import Fixer`);
console.log(`   Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

// Build export map
console.log("   Building export map...");
const exportMap = buildExportMap();
console.log(`   Found ${exportMap.size} exported names.\n`);

// Process all files
const results = [];
function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.name.endsWith(".js") && !entry.name.includes(".test.")) {
      yield full;
    }
  }
}

for (const filePath of walk(JS_ROOT)) {
  const result = fixFile(filePath, exportMap);
  if (result.changed) {
    results.push(result);
    if (verbose) {
      console.log(`  ✅ ${result.path} (+${result.added} imports)`);
      for (const line of result.lines) {
        console.log(`     ${line}`);
      }
    }
  }
}

console.log(`\n${"=".repeat(60)}`);
console.log(`   Files changed: ${results.length}`);
console.log(`   Total imports added: ${results.reduce((s, r) => s + r.added, 0)}`);
if (!verbose && results.length > 0) {
  for (const r of results) {
    console.log(`   ✅ ${r.path} (+${r.added})`);
  }
}
console.log(`${"=".repeat(60)}\n`);

if (dryRun) {
  console.log("⚠️  DRY RUN — no files were modified.");
  console.log("   Run without --dry-run to apply changes.\n");
}
