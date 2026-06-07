# 🟦 TypeScript Migration Plan

> **Created:** 2026-06-06
> **Based on:** `ai/analysis/framework-recommendation.md`
> **Goal:** Replace fragile runtime debugging with compile-time error detection. 2 prompts total.

---

## Why

| Before (JS) | After (TS + esbuild) |
|---|---|
| Edit → build → open browser → guess → repeat | Edit → build → **compiler tells you what's wrong** → fix → done |
| `export` inside function body = runtime crash | **Build fails** with exact file + line |
| Import of non-existent symbol = runtime crash | **Build fails** with exact file + line |
| Duplicate imports = runtime crash | **Build fails** with exact file + line |

---

## Prompt 1 — Rename, Configure, Compile & Fix All Errors

Rename all `.js` → `.ts`, wire up esbuild in the build pipeline, then run `npm run build` and fix every error the compiler reports — all in one pass.

### Context

- `esbuild` is already in `devDependencies` (`^0.25.0`)
- The build pipeline is `scripts/build/build.js` (copies `public/` → `dist/`, injects HTML partials)
- HTML pages reference `.js` files — the build will compile `.ts` → `.js` so HTML stays unchanged
- There are 122 `.js` files in `public/assets/js/` plus 2 root files (`index.js`, `firebase-config.js`)

### Task

**Step 1: Rename all `.js` → `.ts`**

```powershell
Get-ChildItem -Recurse -Filter *.js -Path public/assets/js | Rename-Item -NewName { $_.Name -replace '\.js$','.ts' }
```

Also rename root entry points:
```
index.js           → index.ts
firebase-config.js → firebase-config.ts
```

**Step 2: Create `tsconfig.json` at project root**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "bundler",
    "strict": false,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "skipLibCheck": true
  },
  "include": ["public/assets/js/**/*.ts", "public/*.ts"]
}
```

> `strict: false` means TS only catches structural errors (bad imports/exports, duplicate declarations), not missing types. Gradual typing comes later.

**Step 3: Update `scripts/build/build.js`**

Add a TypeScript compilation step after the HTML injection. The build currently does:
1. Copy `public/` → `dist/`
2. Inject HTML partials
3. Copy Firebase config files

Add step 2.5 — compile `.ts` → `.js`:

```js
// 2.5 Compile TypeScript → JavaScript
console.log("[build] Compiling TypeScript...");
const glob = require("glob");
const tsFiles = glob.sync("dist/assets/js/**/*.ts");
if (tsFiles.length > 0) {
  require("esbuild").buildSync({
    entryPoints: tsFiles,
    outdir: "dist/assets/js",
    format: "esm",
    target: "es2020",
    allowOverwrite: true,
    logLevel: "error",
  });
}

// Also compile root .ts files
const rootTsFiles = ["dist/index.ts", "dist/firebase-config.ts"].filter(f => require("fs").existsSync(f));
if (rootTsFiles.length > 0) {
  require("esbuild").buildSync({
    entryPoints: rootTsFiles,
    outdir: "dist",
    format: "esm",
    target: "es2020",
    allowOverwrite: true,
    logLevel: "error",
  });
}
```

Install `glob` if not present: `npm install -D glob`

**Step 4: Update HTML script references**

In `public/shared/scripts-vendor.html`, the line `<script type="module" src="{{ASSET_PREFIX}}index.js">` should become `<script type="module" src="{{ASSET_PREFIX}}index.js">` (unchanged — esbuild outputs `.js` files, so HTML references stay `.js`).

In `public/shared/scripts-core.html`, the line `<script type="module" src="{{ENTRY_POINT}}">` references page-specific entry points like `assets/js/pages/home/index-entry.js`. These will now be `.ts` source files but esbuild compiles them to `.js` — **no HTML changes needed**.

**Step 5: Build and fix all errors**

```powershell
npm run build
```

The compiler will list every broken import/export with exact file + line. Fix them all:

| Error type | Fix |
|---|---|
| `Module X has no exported member Y` | Either add `export` to Y in X, or remove the import |
| `Cannot redeclare block-scoped variable X` | Remove the duplicate import/declaration |
| `File is not a module` | Add `export {}` or fix a missing import |
| `export` inside function body | Remove the invalid `export` (was `fix-imports.py` garbage) |

**Do NOT just suppress errors.** Fix each one properly so the file's dependency graph is correct.

### Validation
- `npm run build` completes with **zero errors**
- `dist/assets/js/` contains compiled `.js` files
- `dist/index.js` and `dist/firebase-config.js` exist as compiled output

---

## Prompt 2 — Runtime Validation

After the build succeeds, verify all 8 pages load without errors.

### Task

**Step 1: Start dev server**

```powershell
npm run dev
```

**Step 2: Check each page in the browser**

Open `http://localhost:5000` and navigate to:
- `index.html` — login page loads, buttons work
- `view.html` — trip view with calendar, destinations, transportation
- `destination.html` — destinations list with filter/sort
- `expenses.html` — expenses summary
- `itinerary.html` — itinerary view
- `edit/trip.html` — trip editor
- `edit/destination.html` — destination editor
- `edit/listing.html` — listing editor

**Step 3: Check browser console**

Open DevTools (F12) → Console on each page. There should be **zero red errors**. Firefox/Chrome warnings about Firebase emulator connection are expected and fine.

**Step 4: Fix any runtime issues**

If any page throws a runtime error that the compiler missed (rare with TypeScript, but possible with `strict: false`):
- Find the error in the console trace
- Fix the source `.ts` file
- Rebuild and retest

**Step 5: Clean up `KNOWN_MISSING_IMPORTS`**

If the file `scripts/lint/check-imports.js` still exists (it was deleted in Phase 0 cleanup), remove any remaining references. The 20 known issues tracked there should all be resolved by the TypeScript compiler.

### Validation
- All 8 pages render without console errors
- All interactive elements work (buttons, modals, drawers, navigation)
- `npm run build` still succeeds

---

## After Migration: Gradual Typing (no rush)

Once the build is green, add types at your own pace:

| Priority | What | Why |
|----------|------|-----|
| 1 | `models/` | Pure data shapes — biggest win, easiest to type |
| 2 | `utils/` | Pure functions, easy to type |
| 3 | `data/firebase/` | Firebase return types |
| 4 | `pages/` | Most complex, do last |

Per-file approach: enable `strict: true` in `tsconfig.json`, add `// @ts-nocheck` to files not ready yet. Remove the comment as you type each file.

---

## Optional: Framework for Complex Pages

Per `ai/analysis/framework-recommendation.md`, if you later want a framework:
- **Vue** is recommended for incremental adoption
- Start with `edit/trip.html` (most complex page)
- Works with esbuild via `esbuild-plugin-vue`

---

## Success Criteria

- [ ] `npm run build` completes with **zero errors**
- [ ] All 8 pages load without console errors
- [ ] All 122 source files are `.ts`
- [ ] `tsconfig.json` present at project root
- [ ] `scripts/build/build.js` includes TypeScript compilation step
