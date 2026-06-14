/**
 * translate-ids.js
 *
 * Scans all .html, .css, and .ts files under public/ and replaces
 * Portuguese HTML IDs, CSS classes, and data-attribute names/values
 * with their English equivalents, using the mapping defined in
 * id-class-map.json.
 *
 * Usage:
 *   node scripts/build/translate-ids.js --dry-run    Log all planned changes
 *   node scripts/build/translate-ids.js --write       Apply all changes
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const MAPPING_FILE = path.join(__dirname, "id-class-map.json");

const dryRun = process.argv.includes("--dry-run");
const writeMode = process.argv.includes("--write");

if (!dryRun && !writeMode) {
  console.error("Usage: node scripts/build/translate-ids.js [--dry-run | --write]");
  console.error("  --dry-run   Log all planned changes without modifying files.");
  console.error("  --write     Apply all changes to files.");
  process.exit(1);
}

// ── Load mapping ────────────────────────────────────────────────────────────

const mapping = JSON.parse(fs.readFileSync(MAPPING_FILE, "utf-8"));
const idMap = mapping.ids || {};
const classMap = mapping.classes || {};
const dataAttrMap = mapping.dataAttributes || {};
const templatePrefixMap = mapping.templatePrefixes || {};

// Build reverse maps for quick lookup of old names
const oldIds = new Set(Object.keys(idMap));
const oldClasses = new Set(Object.keys(classMap));
const oldDataAttrs = new Set(Object.keys(dataAttrMap));
const oldPrefixes = new Set(Object.keys(templatePrefixMap));

// ── File collection ─────────────────────────────────────────────────────────

function collectFiles(dir, extensions, fileList = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, .git, dist
      if (!["node_modules", ".git", "dist"].includes(entry.name)) {
        collectFiles(fullPath, extensions, fileList);
      }
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const htmlFiles = collectFiles(PUBLIC_DIR, [".html"]);
const cssFiles = collectFiles(PUBLIC_DIR, [".css"]);
const tsFiles = collectFiles(PUBLIC_DIR, [".ts"]);

// ── Change tracking ─────────────────────────────────────────────────────────

/** @type {Array<{file:string, line:number, old:string, new:string, context:string}>} */
const changes = [];
/** @type {Array<{file:string, line:number, word:string, context:string}>} */
const ambiguous = [];

function recordChange(file, line, oldVal, newVal, context) {
  changes.push({ file: path.relative(ROOT, file), line, old: oldVal, new: newVal, context });
}

function recordAmbiguous(file, line, word, context) {
  ambiguous.push({ file: path.relative(ROOT, file), line, word, context });
}

// ── HTML processing ─────────────────────────────────────────────────────────

function processHTML(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const newLines = [];
  let fileChanged = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let lineChanged = false;
    const lineNum = i + 1;

    // Match id="..." , class="..." , for="..." , data-target="..." , data-group="..."
    // Also match data-<attr>="..." for data attributes in the mapping
    const attrRegex = /\b(id|class|for|data-target|data-group|data-turno|data-categoria|data-periodo|data-translate)\s*=\s*"([^"]*)"/g;
    let match;

    while ((match = attrRegex.exec(lines[i])) !== null) {
      const attrName = match[1];
      const attrValue = match[2];
      const fullMatch = match[0];
      const matchStart = match.index;

      if (attrName === "id") {
        if (oldIds.has(attrValue)) {
          const newVal = idMap[attrValue];
          const before = line.substring(0, matchStart);
          const after = line.substring(matchStart + fullMatch.length);
          line = before + `id="${newVal}"` + after;
          lineChanged = true;
          recordChange(filePath, lineNum, `id="${attrValue}"`, `id="${newVal}"`, "HTML id attribute");
        }
      } else if (attrName === "class") {
        let classChanged = false;
        const parts = attrValue.split(/\s+/);
        const newParts = parts.map(cls => {
          if (oldClasses.has(cls)) {
            classChanged = true;
            return classMap[cls];
          }
          return cls;
        });
        if (classChanged) {
          const newAttrValue = newParts.join(" ");
          const before = line.substring(0, matchStart);
          const after = line.substring(matchStart + fullMatch.length);
          line = before + `class="${newAttrValue}"` + after;
          lineChanged = true;
          recordChange(filePath, lineNum, `class="${attrValue}"`, `class="${newAttrValue}"`, "HTML class attribute");
        }
      } else if (attrName === "for") {
        if (oldIds.has(attrValue)) {
          const newVal = idMap[attrValue];
          const before = line.substring(0, matchStart);
          const after = line.substring(matchStart + fullMatch.length);
          line = before + `for="${newVal}"` + after;
          lineChanged = true;
          recordChange(filePath, lineNum, `for="${attrValue}"`, `for="${newVal}"`, "HTML for attribute");
        }
      } else if (attrName === "data-target" || attrName === "data-group") {
        if (oldIds.has(attrValue)) {
          const newVal = idMap[attrValue];
          const before = line.substring(0, matchStart);
          const after = line.substring(matchStart + fullMatch.length);
          line = before + `${attrName}="${newVal}"` + after;
          lineChanged = true;
          recordChange(filePath, lineNum, `${attrName}="${attrValue}"`, `${attrName}="${newVal}"`, `HTML ${attrName} attribute`);
        }
      } else if (dataAttrMap[attrName.replace("data-", "")]) {
        // This is a data-* attribute whose name should be renamed (e.g., data-turno → data-period)
        const oldDataName = attrName.replace("data-", "");
        if (oldDataAttrs.has(oldDataName)) {
          const newDataName = dataAttrMap[oldDataName];
          const newAttrName = `data-${newDataName}`;
          // Also check if the value needs translation
          let newAttrValue = attrValue;
          if (oldIds.has(attrValue)) {
            newAttrValue = idMap[attrValue];
          }
          const before = line.substring(0, matchStart);
          const after = line.substring(matchStart + fullMatch.length);
          line = before + `${newAttrName}="${newAttrValue}"` + after;
          lineChanged = true;
          recordChange(filePath, lineNum, `${attrName}="${attrValue}"`, `${newAttrName}="${newAttrValue}"`, "HTML data attribute rename");
        }
      }
    }

    // If the line was changed, re-check the modified line for any more replacements
    // (needed because changing class values shifts character positions)
    if (lineChanged) {
      fileChanged = true;
      // Re-run on the modified line to catch any remaining matches
      // We do this by simply running the regex again on the modified line
      let moreChanges = true;
      while (moreChanges) {
        moreChanges = false;
        const recheckRegex = /\b(class)\s*=\s*"([^"]*)"/g;
        let m;
        while ((m = recheckRegex.exec(line)) !== null) {
          const parts = m[2].split(/\s+/);
          const newParts = parts.map(cls => {
            if (oldClasses.has(cls)) return classMap[cls];
            return cls;
          });
          if (newParts.join(" ") !== m[2]) {
            const newAttr = newParts.join(" ");
            const before = line.substring(0, m.index);
            const after = line.substring(m.index + m[0].length);
            line = before + `class="${newAttr}"` + after;
            moreChanges = true;
          }
        }
      }
    }

    newLines.push(line);
  }

  return { changed: fileChanged, content: newLines.join("\n") };
}

// ── CSS processing ──────────────────────────────────────────────────────────

function processCSS(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const newLines = [];
  let fileChanged = false;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let lineChanged = false;
    const lineNum = i + 1;

    // Skip lines that are inside /* */ block comments (simple check)
    if (line.trim().startsWith("/*") || line.includes("*/")) {
      newLines.push(line);
      continue;
    }

    // Remove single-line comments for processing
    const commentIdx = line.indexOf("/*");
    let codePart = commentIdx >= 0 ? line.substring(0, commentIdx) : line;
    const commentPart = commentIdx >= 0 ? line.substring(commentIdx) : "";

    // 1. ID selectors: #some-id
    codePart = codePart.replace(/#([a-zA-Z_][\w-]*)/g, (fullMatch, idName) => {
      // Don't replace inside url(), strings, or hex colors
      const before = codePart.substring(0, codePart.indexOf(fullMatch));
      if (before.match(/url\([^)]*$/) || before.match(/'[^']*$/) || before.match(/"[^"]*$/)) {
        return fullMatch;
      }
      // Check it's not a hex color (#fff, # FR33F0, etc.)
      if (/^#[0-9a-fA-F]{3,8}$/.test(fullMatch) && !idName.match(/[g-zG-Z]/)) {
        return fullMatch;
      }
      // Check if this ID name needs translation (direct or prefix match)
      if (oldIds.has(idName)) {
        lineChanged = true;
        recordChange(filePath, lineNum, `#${idName}`, `#${idMap[idName]}`, "CSS ID selector");
        return `#${idMap[idName]}`;
      }
      // Also check for partial matches like #programacao-xxx → #itinerary-xxx
      for (const [oldId, newId] of Object.entries(idMap)) {
        if (idName.startsWith(oldId + "-") || idName.startsWith(oldId + "_")) {
          const suffix = idName.substring(oldId.length);
          lineChanged = true;
          recordChange(filePath, lineNum, `#${idName}`, `#${newId}${suffix}`, "CSS ID selector (prefix)");
          return `#${newId}${suffix}`;
        }
      }
      return fullMatch;
    });

    // 2. Class selectors: .class-name
    codePart = codePart.replace(/\.([a-zA-Z_][\w-]*)/g, (fullMatch, className) => {
      // Don't replace inside url() or strings
      const before = codePart.substring(0, codePart.indexOf(fullMatch));
      if (before.match(/url\([^)]*$/) || before.match(/'[^']*$/) || before.match(/"[^"]*$/)) {
        return fullMatch;
      }
      // Don't replace decimal numbers (.5, .25em)
      if (/^\d/.test(className)) return fullMatch;

      if (oldClasses.has(className)) {
        lineChanged = true;
        recordChange(filePath, lineNum, `.${className}`, `.${classMap[className]}`, "CSS class selector");
        return `.${classMap[className]}`;
      }
      // Partial matches: .programacao-xxx → .itinerary-xxx
      for (const [oldClass, newClass] of Object.entries(classMap)) {
        if (className.startsWith(oldClass + "-") || className.startsWith(oldClass + "_")) {
          const suffix = className.substring(oldClass.length);
          lineChanged = true;
          recordChange(filePath, lineNum, `.${className}`, `.${newClass}${suffix}`, "CSS class selector (prefix)");
          return `.${newClass}${suffix}`;
        }
      }
      return fullMatch;
    });

    // 3. Data attribute selectors: [data-turno="..."] → [data-period="..."]
    for (const [oldDA, newDA] of Object.entries(dataAttrMap)) {
      const dataRegex = new RegExp(`\\[data-${oldDA}([\\]="'\\s*~|^$*])`, "g");
      codePart = codePart.replace(dataRegex, (fullMatch, rest) => {
        lineChanged = true;
        recordChange(filePath, lineNum, `[data-${oldDA}${rest.trimEnd()}`, `[data-${newDA}${rest.trimEnd()}`, "CSS data attribute selector");
        return `[data-${newDA}${rest}`;
      });
    }

    line = codePart + commentPart;
    if (lineChanged) fileChanged = true;
    newLines.push(line);
  }

  return { changed: fileChanged, content: newLines.join("\n") };
}

// ── TS processing ───────────────────────────────────────────────────────────

/**
 * DOM function patterns that take string literal IDs/classes as arguments.
 */
const DOM_FN_PATTERNS = [
  // getID("..."), getChildIDs("...")
  { regex: /\bgetID\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g, mapType: "id", fnName: "getID" },
  { regex: /\bgetChildIDs\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g, mapType: "id", fnName: "getChildIDs" },
  // document.getElementById("...")
  { regex: /\bgetElementById\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g, mapType: "id", fnName: "getElementById" },
  // querySelector("..."), querySelectorAll("...")  — could be id (#...) or class (....)
  { regex: /\bquerySelector(?:All)?\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g, mapType: "selector", fnName: "querySelector" },
  // classList.add("..."), classList.remove("..."), classList.toggle("..."), classList.contains("...")
  { regex: /\.classList\s*\.\s*(add|remove|toggle|contains)\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g, mapType: "class", fnName: "classList" },
  // element.matches("..."), element.closest("...")
  { regex: /\.(?:matches|closest)\s*\(\s*["'`]([^"'`]+)["'`]\s*\)/g, mapType: "selector", fnName: "matches/closest" },
  // dataset access: element.dataset.turno, dataset["turno"]
  { regex: /\.dataset\s*\.\s*(\w+)/g, mapType: "dataAttr", fnName: "dataset" },
  { regex: /\.dataset\s*\[\s*["'`](\w+)["'`]\s*\]/g, mapType: "dataAttr", fnName: "dataset[]" },
];

function processTS(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  let fileChanged = false;
  const newLines = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let lineChanged = false;
    const lineNum = i + 1;

    // Skip comment lines
    if (line.trim().startsWith("//")) {
      newLines.push(line);
      continue;
    }

    // 1. Process DOM function patterns
    for (const pattern of DOM_FN_PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match;
      // Reset lastIndex
      regex.lastIndex = 0;
      const matches = [];

      while ((match = regex.exec(lines[i])) !== null) {
        matches.push({ match, index: match.index });
      }

      // Process in reverse order to preserve indices
      for (let m = matches.length - 1; m >= 0; m--) {
        const { match: fullMatch, index } = matches[m];
        const argValue = fullMatch[fullMatch.length - 1]; // last capture group

        if (pattern.mapType === "id") {
          if (oldIds.has(argValue)) {
            const newVal = idMap[argValue];
            const before = line.substring(0, index);
            const after = line.substring(index + fullMatch[0].length);
            line = before + fullMatch[0].replace(argValue, newVal) + after;
            lineChanged = true;
            recordChange(filePath, lineNum, `${pattern.fnName}("${argValue}")`, `${pattern.fnName}("${newVal}")`, "TS DOM function (id)");
          }
        } else if (pattern.mapType === "class") {
          if (oldClasses.has(argValue)) {
            const newVal = classMap[argValue];
            const before = line.substring(0, index);
            const after = line.substring(index + fullMatch[0].length);
            line = before + fullMatch[0].replace(argValue, newVal) + after;
            lineChanged = true;
            recordChange(filePath, lineNum, `.classList.${fullMatch[1]}("${argValue}")`, `.classList.${fullMatch[1]}("${newVal}")`, "TS classList operation");
          }
        } else if (pattern.mapType === "selector") {
          // Handle querySelector("...some-class-or-id...")
          const sel = argValue;
          let newSel = sel;
          let selChanged = false;

          // Replace #id
          newSel = newSel.replace(/#([\w-]+)/g, (full, idPart) => {
            if (oldIds.has(idPart)) {
              selChanged = true;
              return `#${idMap[idPart]}`;
            }
            // Partial: #programacao-xxx
            for (const [oldId, newId] of Object.entries(idMap)) {
              if (idPart.startsWith(oldId + "-") || idPart.startsWith(oldId + "_")) {
                selChanged = true;
                return `#${newId}${idPart.substring(oldId.length)}`;
              }
            }
            return full;
          });

          // Replace .class
          newSel = newSel.replace(/\.([\w-]+)/g, (full, classPart) => {
            if (oldClasses.has(classPart)) {
              selChanged = true;
              return `.${classMap[classPart]}`;
            }
            for (const [oldClass, newClass] of Object.entries(classMap)) {
              if (classPart.startsWith(oldClass + "-") || classPart.startsWith(oldClass + "_")) {
                selChanged = true;
                return `.${newClass}${classPart.substring(oldClass.length)}`;
              }
            }
            return full;
          });

          if (selChanged) {
            const before = line.substring(0, index);
            const after = line.substring(index + fullMatch[0].length);
            line = before + fullMatch[0].replace(sel, newSel) + after;
            lineChanged = true;
            recordChange(filePath, lineNum, `${pattern.fnName}("${sel}")`, `${pattern.fnName}("${newSel}")`, "TS selector");
          }
        } else if (pattern.mapType === "dataAttr") {
          const attrName = fullMatch[fullMatch.length - 1];
          if (oldDataAttrs.has(attrName)) {
            const newVal = dataAttrMap[attrName];
            const before = line.substring(0, index);
            const after = line.substring(index + fullMatch[0].length);
            line = before + fullMatch[0].replace(attrName, newVal) + after;
            lineChanged = true;
            recordChange(filePath, lineNum, `dataset.${attrName}`, `dataset.${newVal}`, "TS dataset access");
          }
        }
      }
    }

    // 2. Process template literals (backtick strings with interpolation)
    // Use templatePrefixes for compound identifiers (e.g., galeria-descricao → gallery-description)
    const templateRegex = /`([^`]*)`/g;
    let tMatch;
    const templateReplacements = [];
    while ((tMatch = templateRegex.exec(lines[i])) !== null) {
      const templateContent = tMatch[1];
      let newTemplate = templateContent;
      let tChanged = false;

      // First, replace known EXACT id/class fragments (longest match first to avoid partials)
      // Collect all possible replacements and their positions
      const allReplacements = [];

      // Add template prefix replacements (for compound identifiers like galeria-descricao → gallery-description)
      for (const [oldPrefix, newPrefix] of Object.entries(templatePrefixMap)) {
        const escapedOld = oldPrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Match when followed by -, _, /, or . (compound IDs, paths, selectors)
        const re = new RegExp(escapedOld + "(?=[-_/.])", "g");
        let pm;
        while ((pm = re.exec(templateContent)) !== null) {
          allReplacements.push({ index: pm.index, length: oldPrefix.length, old: oldPrefix, new: newPrefix });
        }
      }

      // Also add standalone id/class replacements (only when NOT followed by - or _)
      for (const [oldId, newId] of Object.entries(idMap)) {
        const escapedOld = oldId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`(?<!\\w)${escapedOld}(?![-_\\w])`, "g");
        let pm;
        while ((pm = re.exec(templateContent)) !== null) {
          allReplacements.push({ index: pm.index, length: oldId.length, old: oldId, new: newId });
        }
      }

      for (const [oldClass, newClass] of Object.entries(classMap)) {
        const escapedOld = oldClass.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`(?<!\\w)${escapedOld}(?![-_\\w])`, "g");
        let pm;
        while ((pm = re.exec(templateContent)) !== null) {
          allReplacements.push({ index: pm.index, length: oldClass.length, old: oldClass, new: newClass });
        }
      }

      // Sort by index descending (longer matches take priority at same index)
      allReplacements.sort((a, b) => {
        if (a.index !== b.index) return b.index - a.index;
        return b.length - a.length;
      });

      // Deduplicate overlapping replacements
      const applied = [];
      for (const rpl of allReplacements) {
        const overlaps = applied.some(
          a => rpl.index >= a.index && rpl.index < a.index + a.length
        );
        if (!overlaps) {
          applied.push(rpl);
        }
      }

      // Sort by index for in-order replacement
      applied.sort((a, b) => b.index - a.index);

      // Apply replacements from right to left
      for (const rpl of applied) {
        const before = newTemplate.substring(0, rpl.index);
        const after = newTemplate.substring(rpl.index + rpl.length);
        newTemplate = before + rpl.new + after;
        tChanged = true;
      }

      if (tChanged) {
        templateReplacements.push({
          index: tMatch.index,
          old: tMatch[0],
          new: "`" + newTemplate + "`",
        });
      }
    }

    // Apply template replacements in reverse order
    for (let r = templateReplacements.length - 1; r >= 0; r--) {
      const { index, old: oldStr, new: newStr } = templateReplacements[r];
      const before = line.substring(0, index);
      const after = line.substring(index + oldStr.length);
      line = before + newStr + after;
      lineChanged = true;
      recordChange(filePath, lineNum, oldStr, newStr, "TS template literal");
    }

    // 3. Process innerHTML / insertAdjacentHTML assignments with template literals
    // (These are harder — the Portuguese words appear inside HTML strings)
    // We look for `.innerHTML = ` and similar patterns, then scan the string
    const htmlAssignRegex = /\.(innerHTML|insertAdjacentHTML|outerHTML)\s*=\s*(`[^`]*`|"[^"]*"|'[^']*')/g;
    let haMatch;
    const htmlAssignReplacements = [];
    while ((haMatch = htmlAssignRegex.exec(lines[i])) !== null) {
      const strContent = haMatch[2];
      const quote = strContent[0];
      const inner = strContent.slice(1, -1);
      let newInner = inner;
      let haChanged = false;

      // Replace id="oldId" → id="newId"
      for (const [oldId, newId] of Object.entries(idMap)) {
        const idAttrRegex = new RegExp(`\\bid\\s*=\\s*["']${oldId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "g");
        if (idAttrRegex.test(inner)) {
          newInner = newInner.replace(idAttrRegex, `id="${newId}"`);
          haChanged = true;
        }
      }

      // Replace class="oldClass ..." → class="newClass ..."
      for (const [oldClass, newClass] of Object.entries(classMap)) {
        // In a class attribute, the class name could appear among others
        const classWordRegex = new RegExp(`\\b${oldClass.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g");
        if (classWordRegex.test(inner)) {
          newInner = newInner.replace(classWordRegex, newClass);
          haChanged = true;
        }
      }

      if (haChanged) {
        htmlAssignReplacements.push({
          index: haMatch.index,
          old: haMatch[0],
          new: haMatch[0].replace(strContent, quote + newInner + quote),
        });
      }
    }

    // Apply HTML assignment replacements in reverse order
    for (let r = htmlAssignReplacements.length - 1; r >= 0; r--) {
      const { index, old: oldStr, new: newStr } = htmlAssignReplacements[r];
      const before = line.substring(0, index);
      const after = line.substring(index + oldStr.length);
      line = before + newStr + after;
      lineChanged = true;
      recordChange(filePath, lineNum, oldStr, newStr, "TS HTML assignment");
    }

    if (lineChanged) fileChanged = true;
    newLines.push(line);
  }

  return { changed: fileChanged, content: newLines.join("\n") };
}

// ── Main execution ──────────────────────────────────────────────────────────

console.log("=".repeat(70));
console.log("ID / Class Translation Script");
console.log("=".repeat(70));
console.log(`Mode: ${dryRun ? "DRY RUN (no files will be modified)" : "WRITE (files will be modified)"}`);
console.log(`Mapping file: ${path.relative(ROOT, MAPPING_FILE)}`);
console.log(`ID mappings: ${Object.keys(idMap).length}`);
console.log(`Class mappings: ${Object.keys(classMap).length}`);
console.log(`Data attribute mappings: ${Object.keys(dataAttrMap).length}`);
console.log(`Template prefix mappings: ${Object.keys(templatePrefixMap).length}`);
console.log(`HTML files to scan: ${htmlFiles.length}`);
console.log(`CSS files to scan: ${cssFiles.length}`);
console.log(`TS files to scan: ${tsFiles.length}`);
console.log("");

// Process HTML files
console.log("─".repeat(70));
console.log("Processing HTML files...");
for (const file of htmlFiles) {
  const { changed, content } = processHTML(file);
  if (changed) {
    if (writeMode) {
      fs.writeFileSync(file, content, "utf-8");
    }
  }
}

// Process CSS files
console.log("Processing CSS files...");
for (const file of cssFiles) {
  const { changed, content } = processCSS(file);
  if (changed) {
    if (writeMode) {
      fs.writeFileSync(file, content, "utf-8");
    }
  }
}

// Process TS files
console.log("Processing TS files...");
for (const file of tsFiles) {
  const { changed, content } = processTS(file);
  if (changed) {
    if (writeMode) {
      fs.writeFileSync(file, content, "utf-8");
    }
  }
}

// ── Report ──────────────────────────────────────────────────────────────────

console.log("");
console.log("=".repeat(70));
console.log("RESULTS");
console.log("=".repeat(70));
console.log(`Total changes: ${changes.length}`);

if (changes.length > 0) {
  console.log("");
  console.log("─".repeat(70));
  console.log("Changes by file:");
  console.log("─".repeat(70));

  // Group by file
  const byFile = {};
  for (const c of changes) {
    if (!byFile[c.file]) byFile[c.file] = [];
    byFile[c.file].push(c);
  }

  for (const [file, fileChanges] of Object.entries(byFile)) {
    console.log(`\n  ${file} (${fileChanges.length} change(s)):`);
    for (const c of fileChanges) {
      console.log(`    Line ${c.line}: ${c.old}  →  ${c.new}`);
      console.log(`      [${c.context}]`);
    }
  }
}

if (ambiguous.length > 0) {
  console.log("");
  console.log("─".repeat(70));
  console.log("⚠ AMBIGUOUS MATCHES (manual review needed):");
  console.log("─".repeat(70));
  for (const a of ambiguous) {
    console.log(`  ${a.file}:${a.line} — "${a.word}" [${a.context}]`);
  }
}

console.log("");
if (dryRun) {
  console.log("Dry run complete. To apply changes, run with --write.");
  console.log("");
  console.log("⚠  Review the changes above BEFORE running --write.");
  console.log("   Pay special attention to template literals and dynamic IDs.");
} else {
  console.log(`Changes written to ${changes.length} location(s) across files.`);
  console.log("Run the build to verify: npm run build");
}

// ── Additional: report dynamic template literals that need manual review ────

console.log("");
console.log("─".repeat(70));
console.log("MANUAL SWEEP CHECKLIST (from plan Prompt 3, step 4):");
console.log("─".repeat(70));
console.log("The following dynamic template literal patterns may need manual review:");
console.log("");
const dynamicPatterns = [
  "`programacao-${...}` → `itinerary-${...}`",
  "`inner-programacao-madrugada-${...}` → `inner-itinerary-early-morning-${...}`",
  "`inner-programacao-manha-${...}` → `inner-itinerary-morning-${...}`",
  "`inner-programacao-tarde-${...}` → `inner-itinerary-afternoon-${...}`",
  "`inner-programacao-noite-${...}` → `inner-itinerary-night-${...}`",
  "`programacao-local-${...}` → `itinerary-location-${...}`",
  "`transporte-${...}` → `transportation-${...}`",
  "`galeria-${...}` → `gallery-${...}`",
  "`${categoria}-box` → `${category}-box`",
  "`collapse-${categoria}-${i}` → `collapse-${category}-${i}`",
  "`remove-${categoria}-${j}` → `remove-${category}-${j}`",
  "`radio-moeda-${j}` → `radio-currency-${j}`",
  "`tabs-moedas` → `tabs-currencies`",
  "`${type}-adicionar-box` → `${type}-add-box`",
];
for (const p of dynamicPatterns) {
  console.log(`  • ${p}`);
}
console.log("");
console.log("Run the following grep to find remaining Portuguese identifiers:");
console.log('  grep -rn "programacao\\|gastos\\|destinos\\|viagens\\|hospedagem\\|transporte\\|moeda\\|titulo\\|descricao\\|imagem\\|galeria\\|nota\\|legenda\\|turno\\|botao\\|categoria\\|planejado\\|resumo\\|habilitado\\|exibir\\|madrugada\\|manha\\|tarde\\|noite" public/*.html public/edit/*.html');
