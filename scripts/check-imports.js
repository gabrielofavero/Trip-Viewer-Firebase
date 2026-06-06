/**
 * ======= Static Import & Window Pollution Checker =======
 *
 * Scans all .js files under public/assets/js/ and reports:
 *  1. Function calls to names that are neither defined locally nor imported
 *  2. `window.xxx =` assignments (global namespace pollution)
 *  3. Direct `FIRESTORE_DATA` references (should use getState()/setState())
 *
 * Usage: node scripts/check-imports.js [--verbose] [--json]
 * Exit code: 0 if clean, 1 if issues found
 */

const fs = require("fs");
const path = require("path");

// ---------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------

const JS_ROOT = path.resolve(__dirname, "..", "public", "assets", "js");
const EXCLUDE_DIRS = new Set([]);
const EXCLUDE_FILES = new Set([]);

// Known browser/JS globals that don't need imports
const BROWSER_GLOBALS = new Set([
  // Common callback parameter names (used as functions)
  "fn", "callback", "done", "next", "resolve", "reject",
  "action", "check", "build", "batch", "task", "constructor",

  // Core JS
  "Object", "Array", "String", "Number", "Boolean", "Date", "Math",
  "JSON", "Error", "TypeError", "SyntaxError", "ReferenceError", "RangeError",
  "RegExp", "Map", "Set", "WeakMap", "WeakSet", "Promise", "Proxy",
  "Symbol", "BigInt", "Intl", "Reflect",
  "FormData", "FileReader", "Blob", "File", "FileList",
  "XMLHttpRequest", "URL", "URLSearchParams", "TextEncoder", "TextDecoder",
  "ArrayBuffer", "Uint8Array", "Int32Array", "DataView",
  "parseInt", "parseFloat", "isNaN", "isFinite", "eval",
  "encodeURIComponent", "decodeURIComponent", "encodeURI", "decodeURI",
  "setTimeout", "setInterval", "clearTimeout", "clearInterval",
  "requestAnimationFrame", "cancelAnimationFrame",
  "atob", "btoa",

  // Browser / DOM
  "window", "document", "console", "navigator", "screen",
  "localStorage", "sessionStorage", "history", "location",
  "fetch", "alert", "confirm", "prompt",
  "addEventListener", "removeEventListener", "dispatchEvent",
  "getComputedStyle", "matchMedia",
  "IntersectionObserver", "MutationObserver", "ResizeObserver",
  "CustomEvent", "Event", "MouseEvent", "KeyboardEvent", "TouchEvent",
  "Image", "Audio", "Video",
  "Worker", "WebSocket", "DOMParser", "XMLSerializer",
  "requestIdleCallback", "cancelIdleCallback",
  "getSelection", "scrollTo", "scrollBy",
  "open", "close", "print",
  "Element", "Node", "NodeList", "HTMLCollection", "HTMLElement",
  "DocumentFragment", "ShadowRoot",
  "CSS", "CSSStyleDeclaration",
  "SpeechSynthesisUtterance", "speechSynthesis",

  // Node.js (build scripts only)
  "require", "module", "exports", "__dirname", "__filename", "process",
  "Buffer", "global", "globalThis",
]);

// Known vendor/library globals loaded via <script> tags (not ES imports)
const VENDOR_GLOBALS = new Set([
  // Firebase compat (loaded via <script>)
  "firebase", "firestore",
  // jQuery
  "$", "jQuery",
  // Bootstrap
  "bootstrap",
  // Animation / UI libraries
  "AOS", "Swiper", "GLightbox", "Isotope", "Typed", "Waypoint",
  // Iconify
  "Iconify",
  // Google
  "google",
  // Polyfills / other
  "gsap", "ScrollTrigger", "Lenis", "imagesLoaded", "Macy",
  "Granim", "VanillaTilt", "Lightbox",
  // Chart.js
  "Chart",
  // Moment / date libs
  "moment",
  // Leaflet (maps)
  "L", "leaflet",
  // Sortable / drag-drop
  "Sortable",
  // Clipboard API
  "ClipboardItem",
  // Firebase compat constructors
  "firebase_", // firebase_ functions are loaded globally
]);

const ALL_KNOWN_GLOBALS = new Set([...BROWSER_GLOBALS, ...VENDOR_GLOBALS]);

// ---------------------------------------------------------------
// Regex patterns
// ---------------------------------------------------------------

// Strip single-line comments
const RE_SINGLE_LINE_COMMENT = /\/\/.*$/gm;
// Strip multi-line comments  (non-greedy)
const RE_MULTI_LINE_COMMENT = /\/\*[\s\S]*?\*\//g;
// Strip strings (both " and ' and `)
const RE_STRINGS = /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g;

// Import patterns
const RE_NAMED_IMPORT = /import\s+\{([^}]+)\}\s*from\s*['"][^'"]+['"]\s*;?/g;
const RE_DEFAULT_IMPORT = /import\s+(\w+)\s+from\s*['"][^'"]+['"]\s*;?/g;
const RE_NAMESPACE_IMPORT = /import\s+\*\s+as\s+(\w+)\s+from\s*['"][^'"]+['"]\s*;?/g;
const RE_BARE_IMPORT = /import\s+['"][^'"]+['"]\s*;?/g;
const RE_DYNAMIC_IMPORT = /import\s*\(\s*['"][^'"]+['"]\s*\)/g;

// Export patterns
const RE_EXPORT_FUNCTION = /export\s+(?:async\s+)?function\s+(\w+)/g;
const RE_EXPORT_CONST = /export\s+(?:const|let|var)\s+(\w+)/g;
const RE_EXPORT_DEFAULT_FN = /export\s+default\s+(?:async\s+)?function\s+(\w+)/g;
const RE_EXPORT_DEFAULT = /export\s+default\s+(\w+)/g;
const RE_EXPORT_BRACES = /export\s+\{([^}]+)\}\s*;?/g;
const RE_EXPORT_CLASS = /export\s+class\s+(\w+)/g;

// Function definitions (non-export)
const RE_FUNCTION = /(?:^|\s)(?:async\s+)?function\s+(\w+)/gm;
const RE_ARROW_CONST = /(?:^|\s)(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/gm;
const RE_ARROW_CONST_ONE = /(?:^|\s)(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\w+\s*=>/gm;
const RE_ASSIGNED_FN = /(?:^|\s)(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function/gm;
const RE_CLASS = /(?:^|\s)class\s+(\w+)/gm;

// Window assignments  (window.xxx =, window["xxx"] =)
const RE_WINDOW_ASSIGN = /window\.(\w+)\s*=/g;

// Direct FIRESTORE_DATA references
const RE_FIRESTORE_DATA = /\bFIRESTORE_DATA\b/g;

// ---------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------

/**
 * Strip comments and string literals from source to avoid false positives.
 */
function stripCommentsAndStrings(source) {
  let s = source;
  // Strip strings first (they may contain comment-like content)
  s = s.replace(RE_STRINGS, '""');
  // Strip comments
  s = s.replace(RE_SINGLE_LINE_COMMENT, "");
  s = s.replace(RE_MULTI_LINE_COMMENT, "");
  return s;
}

/**
 * Extract all imported names from a file's source.
 * Returns a Set of local names available via imports.
 */
function extractImports(cleanSource) {
  const imported = new Set();

  // Named imports: import { a, b as c } from '...'
  for (const m of cleanSource.matchAll(RE_NAMED_IMPORT)) {
    const inner = m[1];
    for (const part of inner.split(",")) {
      const name = part.includes(" as ") ? part.split(" as ")[1].trim() : part.trim();
      if (name) imported.add(name);
    }
  }

  // Default import: import Foo from '...'
  for (const m of cleanSource.matchAll(RE_DEFAULT_IMPORT)) {
    imported.add(m[1]);
  }

  // Namespace import: import * as ns from '...'
  for (const m of cleanSource.matchAll(RE_NAMESPACE_IMPORT)) {
    imported.add(m[1]);
  }

  return imported;
}

/**
 * Extract all function/class/variable names defined in a file.
 */
function extractDefinitions(cleanSource) {
  const defs = new Set();

  for (const m of cleanSource.matchAll(RE_EXPORT_FUNCTION)) defs.add(m[1]);
  for (const m of cleanSource.matchAll(RE_EXPORT_CONST)) defs.add(m[1]);
  for (const m of cleanSource.matchAll(RE_EXPORT_DEFAULT_FN)) defs.add(m[1]);
  for (const m of cleanSource.matchAll(RE_EXPORT_DEFAULT)) defs.add(m[1]);
  for (const m of cleanSource.matchAll(RE_EXPORT_CLASS)) defs.add(m[1]);

  for (const m of cleanSource.matchAll(RE_FUNCTION)) defs.add(m[1]);
  for (const m of cleanSource.matchAll(RE_ARROW_CONST)) defs.add(m[1]);
  for (const m of cleanSource.matchAll(RE_ARROW_CONST_ONE)) defs.add(m[1]);
  for (const m of cleanSource.matchAll(RE_ASSIGNED_FN)) defs.add(m[1]);
  for (const m of cleanSource.matchAll(RE_CLASS)) defs.add(m[1]);

  // export { a, b } — these are re-exports, treat names as defined
  for (const m of cleanSource.matchAll(RE_EXPORT_BRACES)) {
    const inner = m[1];
    for (const part of inner.split(",")) {
      const name = part.includes(" as ") ? part.split(" as ")[0].trim() : part.trim();
      if (name) defs.add(name);
    }
  }

  return defs;
}

/**
 * Extract function-call names from source.
 * Only matches calls where the callee is a simple identifier: `foo(`
 */
function extractCalls(cleanSource) {
  // Match: identifier(  — but NOT preceded by:
  // . (method call: obj.foo()), new (constructor), function, if, for, while, etc.
  const RE_CALL = /(?<![.\w])(?!new\s)(\w+)\s*\(/g;
  const calls = new Set();
  for (const m of cleanSource.matchAll(RE_CALL)) {
    const name = m[1];
    // Skip keywords and common patterns
    if (/^(if|for|while|switch|catch|function|return|typeof|new|throw|delete|void|await|yield|case|import|export|class|extends|super|instanceof|in|of|try|finally|else|do|break|continue|debugger|with|static|async|get|set)$/.test(name)) {
      continue;
    }
    // Skip known browser API constructors used with `new`
    calls.add(name);
  }
  return calls;
}

/**
 * Find window.xxx = assignments.
 */
function findWindowAssignments(cleanSource) {
  const assignments = [];
  for (const m of cleanSource.matchAll(RE_WINDOW_ASSIGN)) {
    assignments.push(m[1]);
  }
  return assignments;
}

/**
 * Find direct FIRESTORE_DATA references.
 */
function findFirestoreDataRefs(cleanSource) {
  const refs = [];
  for (const m of cleanSource.matchAll(RE_FIRESTORE_DATA)) {
    refs.push(m[0]);
  }
  return refs;
}

// ---------------------------------------------------------------
// File scanning
// ---------------------------------------------------------------

function* walkJsFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDE_DIRS.has(entry.name)) {
        yield* walkJsFiles(full);
      }
    } else if (entry.name.endsWith(".js") && !EXCLUDE_FILES.has(entry.name)) {
      yield full;
    }
  }
}

function relativePath(filePath) {
  return path.relative(JS_ROOT, filePath).replace(/\\/g, "/");
}

// ---------------------------------------------------------------
// Main
// ---------------------------------------------------------------

function analyze() {
  const issues = {
    missingImports: [],    // { file, name, line }
    windowAssignments: [], // { file, name, count }
    firestoreRefs: [],     // { file, count }
  };

  let filesScanned = 0;

  for (const filePath of walkJsFiles(JS_ROOT)) {
    filesScanned++;
    const rel = relativePath(filePath);
    const rawSource = fs.readFileSync(filePath, "utf-8");
    const cleanSource = stripCommentsAndStrings(rawSource);

    // Extract info
    const imported = extractImports(cleanSource);
    const defined = extractDefinitions(cleanSource);
    const called = extractCalls(cleanSource);
    const windowAssigns = findWindowAssignments(cleanSource);
    const firestoreRefs = findFirestoreDataRefs(cleanSource);

    // All names available locally
    const available = new Set([...imported, ...defined, ...ALL_KNOWN_GLOBALS]);

    // Check for missing imports
    for (const name of called) {
      if (!available.has(name)) {
        // Find the line number for better reporting
        const lineNum = findLineNumber(rawSource, name);
        issues.missingImports.push({
          file: rel,
          name,
          line: lineNum,
        });
      }
    }

    // Check window assignments
    for (const name of windowAssigns) {
      issues.windowAssignments.push({
        file: rel,
        name,
        count: 1, // simplified
      });
    }

    // Check FIRESTORE_DATA
    if (firestoreRefs.length > 0) {
      // Exclude data/state.js if it exists (it OWNS the variable)
      if (!rel.includes("data/state.js")) {
        issues.firestoreRefs.push({
          file: rel,
          count: firestoreRefs.length,
        });
      }
    }
  }

  return { issues, filesScanned };
}

function findLineNumber(source, name) {
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    // Look for the name followed by ( as a function call
    if (new RegExp(`\\b${name}\\s*\\(`).test(lines[i])) {
      return i + 1;
    }
  }
  return "?";
}

// ---------------------------------------------------------------
// Output
// ---------------------------------------------------------------

function printReport(issues, filesScanned, verbose, json) {
  if (json) {
    console.log(JSON.stringify({ issues, filesScanned }, null, 2));
    return;
  }

  console.log(`\n🔍 Static Analysis Report`);
  console.log(`   Files scanned: ${filesScanned}`);
  console.log("");

  // Missing imports
  if (issues.missingImports.length > 0) {
    console.log(`❌ Missing Imports (${issues.missingImports.length}):`);
    console.log(`   These functions are called but not imported or defined locally:\n`);
    for (const issue of issues.missingImports) {
      console.log(`   • ${issue.file}:${issue.line}  →  ${issue.name}()`);
    }
    console.log("");
  } else {
    console.log(`✅ Missing Imports: 0 (all function calls resolve)`);
  }

  // Window assignments
  if (issues.windowAssignments.length > 0) {
    console.log(`❌ Window Assignments (${issues.windowAssignments.length}):`);
    console.log(`   window.xxx = xxx pollutes the global namespace:\n`);
    for (const issue of issues.windowAssignments) {
      console.log(`   • ${issue.file}  →  window.${issue.name} = ...`);
    }
    console.log("");
  } else {
    console.log(`✅ Window Assignments: 0 (no global pollution)`);
  }

  // FIRESTORE_DATA refs
  if (issues.firestoreRefs.length > 0) {
    console.log(`⚠️  FIRESTORE_DATA Direct References (${issues.firestoreRefs.length} files):`);
    console.log(`   Should use getState()/setState() from data/state.js:\n`);
    for (const issue of issues.firestoreRefs) {
      console.log(`   • ${issue.file}  (${issue.count} reference${issue.count > 1 ? "s" : ""})`);
    }
    console.log("");
  } else {
    console.log(`ℹ️  FIRESTORE_DATA References: 0`);
  }

  // Summary
  const totalIssues =
    issues.missingImports.length +
    issues.windowAssignments.length +
    issues.firestoreRefs.length;

  console.log(`\n${"═".repeat(60)}`);
  if (totalIssues === 0) {
    console.log(`✅ ALL CLEAN — No issues found.`);
  } else {
    console.log(`❌ ${totalIssues} issue(s) found. See details above.`);
  }
  console.log(`${"═".repeat(60)}\n`);

  return totalIssues;
}

// ---------------------------------------------------------------
// Entry
// ---------------------------------------------------------------

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const json = args.includes("--json");

if (!fs.existsSync(JS_ROOT)) {
  console.error(`❌ JS root not found: ${JS_ROOT}`);
  process.exit(1);
}

const { issues, filesScanned } = analyze();
const totalIssues = printReport(issues, filesScanned, verbose, json);

process.exit(totalIssues > 0 ? 1 : 0);
