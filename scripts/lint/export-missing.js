/**
 * Add export keyword to functions that are called from other files but not exported.
 * Usage: node scripts/lint/export-missing.js [--dry-run]
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const JS_ROOT = path.resolve(__dirname, "..", "..", "public", "assets", "js");
const dryRun = process.argv.includes("--dry-run");

// Get current missing imports
const out = execSync("node scripts/lint/check-imports.js --json", {
  stdio: "pipe",
  encoding: "utf-8",
});
const d = JSON.parse(out);
const missingNames = new Set(d.issues.missingImports.map((m) => m.name));

// Find all exported names
const exported = new Set();
function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.name.endsWith(".js")) yield full;
  }
}
for (const f of walk(JS_ROOT)) {
  const s = fs.readFileSync(f, "utf-8");
  for (const m of s.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g))
    exported.add(m[1]);
  for (const m of s.matchAll(/export\s+(?:const|let|var)\s+(\w+)/g))
    exported.add(m[1]);
}

// Find and fix unexported functions
let fixed = 0;
for (const f of walk(JS_ROOT)) {
  const rel = path.relative(JS_ROOT, f).replace(/\\/g, "/");
  let source = fs.readFileSync(f, "utf-8");
  let changed = false;

  // Find non-exported function definitions that are in the missing set
  const re = /(?<!export\s)(?<!export\s+default\s)(?<!export\s+default\s+)(?:async\s+)?function\s+(\w+)/g;
  const newSource = source.replace(re, (match, name, offset) => {
    if (missingNames.has(name) && !exported.has(name)) {
      // Don't add export if inside another function (indented more than 1 tab)
      const lineStart = source.lastIndexOf("\n", offset) + 1;
      const line = source.substring(lineStart, offset);
      // Only add export to top-level functions (not nested)
      if (/^\s{0,1}(?:async\s+)?function/.test(line + match.charAt(0))) {
        const before = source.substring(Math.max(0, offset - 1), offset);
        // Check it's really not already exported
        if (!source.substring(Math.max(0, offset - 8), offset).includes("export ")) {
          if (!dryRun) {
            process.stdout.write(`  export ${rel} -> ${name}()\n`);
          }
          return "export " + match;
        }
      }
    }
    return match;
  });

  if (newSource !== source) {
    if (!dryRun) {
      fs.writeFileSync(f, newSource, "utf-8");
    }
    fixed++;
  }
}

console.log(`\n${dryRun ? "[DRY RUN] " : ""}Added export to functions in ${fixed} files.\n`);
if (dryRun) console.log("Run without --dry-run to apply.\n");
