/**
 * ======= FIRESTORE_DATA → getState()/setState() Migration Script =======
 *
 * Replaces all direct FIRESTORE_DATA references with getState()/setState()
 * calls across all JS files in public/assets/js/.
 *
 * Usage: node scripts/lint/migrate-firestore-data.js [--dry-run] [--verbose]
 *
 * Rules:
 *   FIRESTORE_DATA = expr          → setState(expr)
 *   FIRESTORE_DATA.property        → getState().property
 *   FIRESTORE_DATA?.property       → getState()?.property
 *   var FIRESTORE_DATA;            → (remove line)
 *   var FIRESTORE_DATA = {};       → (remove line)
 *   FIRESTORE_DATA (standalone)    → getState()
 *   { FIRESTORE_DATA } destructure → { getState() }  ... actually, keep as is
 *   default param: fn(x = FIRESTORE_DATA) → fn(x = getState())
 */

const fs = require("fs");
const path = require("path");

const JS_ROOT = path.resolve(__dirname, "..", "..", "public", "assets", "js");
const STATE_MODULE = "data/state.js";

const dryRun = process.argv.includes("--dry-run");
const verbose = process.argv.includes("--verbose");

// ---------------------------------------------------------------
// Calculate relative import path from a file to data/state.js
// ---------------------------------------------------------------
function getImportPath(filePath) {
  const fileDir = path.dirname(filePath);
  let rel = path.relative(fileDir, path.join(JS_ROOT, STATE_MODULE));
  rel = rel.replace(/\\/g, "/");
  if (!rel.startsWith(".")) {
    rel = "./" + rel;
  }
  return rel;
}

// ---------------------------------------------------------------
// Process a single file
// ---------------------------------------------------------------
function processFile(filePath) {
  let source = fs.readFileSync(filePath, "utf-8");
  const original = source;

  if (!source.includes("FIRESTORE_DATA")) {
    return { changed: false, path: filePath };
  }

  const relPath = path.relative(JS_ROOT, filePath).replace(/\\/g, "/");

  // Skip state.js itself
  if (relPath === STATE_MODULE) {
    return { changed: false, path: filePath, skipped: "state.js owns the variable" };
  }

  let needsGetState = false;
  let needsSetState = false;

  // ---- Step 1: Replace property access patterns ----
  // FIRESTORE_DATA.property → getState().property
  // Must do this BEFORE standalone replacement
  const propCount = (source.match(/\bFIRESTORE_DATA\./g) || []).length;
  if (propCount > 0) {
    source = source.replace(/\bFIRESTORE_DATA\./g, "getState().");
    needsGetState = true;
  }

  // FIRESTORE_DATA?.property → getState()?.property
  const optCount = (source.match(/\bFIRESTORE_DATA\?\./g) || []).length;
  if (optCount > 0) {
    source = source.replace(/\bFIRESTORE_DATA\?\./g, "getState()?.");
    needsGetState = true;
  }

  // ---- Step 2: Replace assignment patterns ----
  // FIRESTORE_DATA = something → setState(something)
  // But NOT: var FIRESTORE_DATA =  (these get removed in step 4)
  const assignRegex = /(?<!var |let |const )\bFIRESTORE_DATA\s*=\s*/g;
  const assignCount = (source.match(assignRegex) || []).length;
  if (assignCount > 0) {
    source = source.replace(assignRegex, "setState(");
    // Now we need to close the paren. The expression ends at ; or at the end of line
    // that isn't inside a string. This is tricky. Let's handle it differently:
    // For each `setState(`, find the matching terminator.
    needsSetState = true;
  }

  // ---- Step 3: Replace standalone FIRESTORE_DATA references ----
  // These are things like: return FIRESTORE_DATA;  if (FIRESTORE_DATA) {  data = FIRESTORE_DATA
  // Pattern: FIRESTORE_DATA not followed by . or ?. and not preceded by var/let/const
  // Also not inside a string (already skipped by the word boundary)
  const standaloneRegex = /(?<![.\w])(?<!var |let |const )\bFIRESTORE_DATA\b(?!\s*=)(?!\.)(?!\?)/g;
  const standaloneCount = (source.match(standaloneRegex) || []).length;
  if (standaloneCount > 0) {
    source = source.replace(standaloneRegex, (match, offset) => {
      // Check if we're inside a setState( already (from step 2)
      // Look back to see if we just did setState(
      const before = source.substring(Math.max(0, offset - 10), offset);
      if (before.endsWith("setState(")) {
        return match; // Don't double-replace inside setState(
      }
      needsGetState = true;
      return "getState()";
    });
  }

  // ---- Step 4: Remove var/let/const FIRESTORE_DATA declarations ----
  source = source.replace(/var\s+FIRESTORE_DATA\s*=\s*\{\};?\s*\n/g, "");
  source = source.replace(/var\s+FIRESTORE_DATA\s*=\s*\{\}\s*;?\s*\n/g, ""); // variations
  source = source.replace(/var\s+FIRESTORE_DATA\s*;?\s*\n/g, "");
  // Handle any remaining var FIRESTORE_DATA = {};
  source = source.replace(/var\s+FIRESTORE_DATA\s*=\s*\{\s*\}\s*;?/g, "");
  source = source.replace(/var\s+FIRESTORE_DATA\s*;/g, "");

  // ---- Step 5: Fix setState() closing parens ----
  // setState(expr should have a closing ) before ; or at end of line
  // We need to find each setState( and add ) before the next ; that isn't inside nested parens
  source = fixSetStateParens(source);

  // ---- Step 6: Add import statement ----
  const statePath = getImportPath(filePath);
  let imports = [];
  if (needsGetState && needsSetState) {
    imports.push(`import { getState, setState } from '${statePath}';`);
  } else if (needsGetState) {
    imports.push(`import { getState } from '${statePath}';`);
  } else if (needsSetState) {
    imports.push(`import { setState } from '${statePath}';`);
  }

  // Only add imports if this file uses FIRESTORE_DATA and doesn't already import from state.js
  if (imports.length > 0 && !source.includes("from '" + statePath + "'") && !source.includes('from "' + statePath + '"')) {
    // Add after the last existing import line, or at the top
    const lines = source.split("\n");
    let insertIdx = 0;

    // Find the last import line
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*import\s/.test(lines[i])) {
        insertIdx = i + 1;
      }
    }

    // Insert after last import line, with a blank line before if there are other imports
    if (insertIdx > 0) {
      lines.splice(insertIdx, 0, ...imports);
    } else {
      // No existing imports, add at top
      lines.unshift(...imports, "");
    }
    source = lines.join("\n");
  }

  // Check if any stale "FIRESTORE_DATA" remains
  const remaining = (source.match(/\bFIRESTORE_DATA\b/g) || []).length;

  if (source !== original) {
    if (!dryRun) {
      fs.writeFileSync(filePath, source, "utf-8");
    }
    return {
      changed: true,
      path: filePath,
      relPath,
      imports: imports,
      remainingFIRESTORE: remaining,
      propCount,
      assignCount,
      standaloneCount,
    };
  }

  return { changed: false, path: filePath };
}

// ---------------------------------------------------------------
// Fix setState() parentheses — add closing ) before ; or newline
// that is not inside nested parens
// ---------------------------------------------------------------
function fixSetStateParens(source) {
  // Find setState( and add ) before the next ; at the right nesting level
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let idx = line.indexOf("setState(");
    if (idx === -1) continue;

    // Find where the expression ends: at ; or end of line
    // But we need to count parens to handle nested calls
    let depth = 0;
    let started = false;
    let result = "";
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (!started && line.substring(j, j + 9) === "setState(") {
        started = true;
        result += "setState(";
        j += 8;
        depth = 1;
        continue;
      }
      if (started) {
        if (ch === "(") depth++;
        else if (ch === ")") depth--;
        if (depth === 0) {
          // We already have a closing paren from the assignment
          result += ch;
          started = false;
          continue;
        }
        if (ch === ";" && depth === 1) {
          // Close before the semicolon
          result += ")";
          result += ch;
          started = false;
          continue;
        }
      }
      result += ch;
    }
    // If we ended the line while still in setState, add closing paren
    if (started && depth === 1) {
      // Check if the line ends naturally (not inside a string)
      result += ")";
    }
    lines[i] = result;
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------
// Scan all JS files
// ---------------------------------------------------------------
function* walkJsFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkJsFiles(full);
    } else if (entry.name.endsWith(".js")) {
      yield full;
    }
  }
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------
console.log(`\n🔧 FIRESTORE_DATA → getState()/setState() Migration`);
console.log(`   Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
console.log("");

const results = [];
let totalChanged = 0;

for (const filePath of walkJsFiles(JS_ROOT)) {
  const result = processFile(filePath);
  if (result.changed) {
    totalChanged++;
    results.push(result);
    if (verbose) {
      console.log(`  ✅ ${result.relPath}`);
      if (result.imports.length > 0) {
        console.log(`     + ${result.imports.join(", ")}`);
      }
      if (result.remainingFIRESTORE > 0) {
        console.log(`     ⚠️  ${result.remainingFIRESTORE} unhandled reference(s)`);
      }
    }
  }
}

console.log("");
console.log(`${"=".repeat(60)}`);
console.log(`   Files changed: ${totalChanged}`);
if (totalChanged > 0 && !verbose) {
  for (const r of results) {
    console.log(`   ✅ ${r.relPath}`);
  }
}
console.log(`${"=".repeat(60)}\n`);

if (dryRun) {
  console.log("⚠️  DRY RUN — no files were modified.");
  console.log("   Run without --dry-run to apply changes.\n");
}
