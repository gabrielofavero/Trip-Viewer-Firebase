# 🇬🇧 E050: Remaining English Cleanup Prompts

> **Created:** 2026-06-14
> **Based on:** Validation sweep from Prompt 8, cross-referenced with `docs/firestore-data-examples/` (post-migration) and `emulated.json` (pre-migration)
> **Status:** Not started

---

## Summary

After executing Prompt 8 sweep + fixes, the following Portuguese terms remain. They are organized into 5 standalone prompts by risk level and dependency.

| Prompt | Risk | What | Files |
|--------|------|------|-------|
| A | 🔴 HIGH | `inicio`/`fim` → `start`/`end` (HTML IDs + TS properties) | ~12 files |
| B | 🔴 HIGH | DB `tipo` values: `"transporte"`/`"hospedagens"`/`"destinos"` → `"transportation"`/`"accommodations"`/`"destinations"` | ~8 files |
| C | 🟡 MEDIUM | Destination categories: `restaurantes`/`lanches`/`saidas`/`turismo`/`lojas` | ~3 files |
| D | 🟢 LOW | CSS classes: `legenda`/`nota-*`/`turno-box`/`input-botao`/`imagem-*` | ~6 CSS + ~3 TS files |
| E | 🟢 LOW | HTML leftovers: `hospedagens-box` class, `data-category` on destination.html | 2 HTML files |

### DB Cross-Reference

The `docs/firestore-data-examples/` (post-migration) confirms:
- ✅ Trip fields: `start`, `end` — migrated from `inicio`/`fim`
- ✅ Trip module keys: `transportation`, `accommodations`, `itinerary`, `destinations`, `expenses`, `gallery` — migrated
- ✅ `protected` collection renamed, `sharing`/`owner` fields — migrated
- ✅ `cores.claro`/`cores.escuro` → `colors.light`/`colors.dark` — migrated
- ✅ `PERMISSOES` → `PERMISSIONS` — migrated

The pre-migration `emulated.json` uses: `usuario`, `viagens`, `destinos`, `listagens`, `gastos`, `protegido`, `inicio`, `fim`, `modulos.gastos`, `modulos.programacao`, `moeda`, `titulo`, `descricao`, `imagem`, `claro`, `escuro`, `cores`, `compartilhamento`, `dono`, `pessoas`, `transportes`, `hospedagens`, `galeria`, `programacoes`, `versao`, `ultimaAtualizacao`

---

## 📋 Prompt A — `inicio`/`fim` → `start`/`end`

### Context

The DB was migrated to `start`/`end`, but the code still uses `inicio`/`fim` for:
- HTML input IDs: `id="inicio"`, `id="fim"` (date picker hidden inputs)
- TS property names on `TIME_REPLACEMENT` object
- TS local variables
- Template literal IDs: `inner-itinerary-inicio`, `inner-itinerary-fim`

### Task

#### A1. HTML: `edit/trip.html`

Change:
```html
<input type="hidden" id="inicio" value="2023-01-22" />
<input type="hidden" id="fim" value="2023-01-22" />
```
To:
```html
<input type="hidden" id="start" value="2023-01-22" />
<input type="hidden" id="end" value="2023-01-22" />
```

#### A2. HTML: `content.ts` (inner-itinerary modal)

File: `public/assets/ts/pages/edit-trip/categories/itinerary-module/inner-itinerary/content.ts`

| Line | Old | New |
|------|-----|-----|
| 25 | `id="inner-itinerary-inicio"` | `id="inner-itinerary-start"` |
| 33 | `id="inner-itinerary-fim"` | `id="inner-itinerary-end"` |

#### A3. TS: All `getID("inicio")` → `getID("start")` and `getID("fim")` → `getID("end")`

| File | Lines | Old | New |
|------|-------|-----|-----|
| `utils/dates.ts` | 348-349 | `getID("inicio")`, `getID("fim")` | `getID("start")`, `getID("end")` |
| `pages/edit-trip/new-trip.ts` | 38-39 | `getID("inicio")`, `getID("fim")` | `getID("start")`, `getID("end")` |
| `pages/edit-trip/new-trip.ts` | 172,174 | `getID("inicio")`, `getID("fim")` | `getID("start")`, `getID("end")` |
| `pages/edit-trip/new-trip.ts` | 344-345 | `getID("inicio")`, `getID("fim")` | `getID("start")`, `getID("end")` |
| `pages/edit-trip/existing-trip.ts` | 49-50 | `getID("inicio")`, `getID("fim")` | `getID("start")`, `getID("end")` |
| `pages/edit-trip/edit-trip.ts` | 207-208 | `getID("inicio")`, `getID("fim")` | `getID("start")`, `getID("end")` |
| `pages/edit-trip/support/event-listeners.ts` | 98,202,219-220 | `getID("inicio")`, `getID("fim")` | `getID("start")`, `getID("end")` |

#### A4. TS: `TIME_REPLACEMENT.*.inicio`/`.fim` → `.start`/`.end`

File: `public/assets/ts/pages/edit-trip/categories/itinerary-module/inner-itinerary/text-replacement.ts`

Rename ALL occurrences of `.inicio` → `.start` and `.fim` → `.end` on the `TIME_REPLACEMENT` object (~40 occurrences across lines 16-170). The `TIME_REPLACEMENT` object shape:
```ts
const TIME_REPLACEMENT = {
    current: { start: "", end: "" },     // was inicio / fim
    replacement: { start: "", end: "" },  // was inicio / fim
};
```

#### A5. TS: Variable renames

| File | Old | New |
|------|-----|-----|
| `new-trip.ts:206` | `inicioFim` | `startEnd` |
| `new-trip.ts:245` | `inicioFim.inicio` | `startEnd.start` |
| `new-trip.ts:246` | `inicioFim.fim` | `startEnd.end` |
| `dates.ts:348-349` | `let inicio`, `let fim` | `let start`, `let end` |
| `edit-trip.ts:207-208` | `const inicio`, `const fim` | `const start`, `const end` |
| `event-listeners.ts:219-220` | `const inicioDiv`, `const fimDiv` | `const startDiv`, `const endDiv` |

### Validation
```bash
grep -rn "getID(\"inicio\")" public/assets/ts/ --include="*.ts"  # ZERO
grep -rn "getID(\"fim\")" public/assets/ts/ --include="*.ts"      # ZERO
grep -rn "\.inicio" public/assets/ts/ --include="*.ts"            # Only in comments/docs
grep -rn "\.fim" public/assets/ts/ --include="*.ts"               # Only in comments/docs
npm run build  # Must pass
```

---

## 📋 Prompt B — DB `tipo` Values: `"transporte"`/`"hospedagens"`/`"destinos"` → English

### Context

Itinerary items have a `tipo` (type) field stored in Firestore. The DB was NOT migrated for these values — they still use Portuguese strings. The code has a mix:
- `itinerary.model.ts` ALREADY uses `"destination"` with comment `// was "destinos"`
- But most other files still use `"destinos"`, `"transporte"`, `"hospedagens"`

⚠️ This requires a **Firestore migration** (new script `16-migrate-itinerary-tipo.ts`) to update all itinerary item `tipo` fields from Portuguese to English BEFORE changing the code.

### Step 1: Create Migration Script

Create `functions/src/migrations/16-migrate-itinerary-tipo.ts` following established patterns:

| Old `tipo` | New `tipo` |
|------------|------------|
| `"transporte"` | `"transportation"` |
| `"hospedagens"` | `"accommodations"` |
| `"destinos"` | `"destinations"` |

Must handle:
- Trip documents: `programacoes[].tipo`
- Trip documents: `programacoes[].itinerario[].tipo` (inner itinerary items)
- Idempotent (skip if already English)
- Dry-run support (`?dryRun=true`)

### Step 2: Update Code (after migration runs)

#### B1. Switch cases

| File | Lines | Old | New |
|------|-------|-----|-----|
| `utils/dom.ts` | 275,609 | `case "transporte":` | `case "transportation":` |
| `utils/dom.ts` | 278,625 | `case "hospedagens":` | `case "accommodations":` |
| `utils/dom.ts` | 636 | `case "destinos":` | `case "destinations":` |
| `pages/trip-detail/.../inner-itinerary.ts` | 149,256 | `case "hospedagens":` | `case "accommodations":` |
| `pages/trip-detail/.../inner-itinerary.ts` | 152,267 | `case "destinos":` | `case "destinations":` |
| `pages/trip-detail/.../inner-itinerary.ts` | 240 | `case "transporte":` | `case "transportation":` |
| `pages/edit-trip/.../inner-itinerary.ts` | 186 | `case "transporte":` | `case "transportation":` |
| `pages/edit-trip/.../inner-itinerary.ts` | 194 | `case "hospedagens":` | `case "accommodations":` |
| `pages/edit-trip/.../inner-itinerary.ts` | 202 | `case "destinos":` | `case "destinations":` |

#### B2. Type assignment statements

| File | Lines | Old | New |
|------|-------|-----|-----|
| `inner-itinerary.ts` (edit) | 358 | `item.tipo = "transporte"` | `item.tipo = "transportation"` |
| `inner-itinerary.ts` (edit) | 364 | `item.tipo = "hospedagens"` | `item.tipo = "accommodations"` |
| `inner-itinerary.ts` (edit) | 370 | `item.tipo = "destinos"` | `item.tipo = "destinations"` |

#### B3. String comparisons

| File | Line | Old | New |
|------|------|-----|-----|
| `visibility.ts` | 32 | `tipo === "hospedagens"` | `tipo === "accommodations"` |
| `visibility.ts` | 58 | `tipo === "hospedagens"` | `tipo === "accommodations"` |
| `inner-itinerary.ts` (view) | 234 | `item?.tipo === "destinos"` | `item?.tipo === "destinations"` |

#### B4. Function call string args

| File | Lines | Old | New |
|------|-------|-----|-----|
| `transportation-module.ts` | 404 | `adjustCardsHeights("transporte")` | `adjustCardsHeights("transportation")` |
| `accommodation-module.ts` | 141 | `getSensitiveReservationHTML("hospedagens", ...)` | `getSensitiveReservationHTML("accommodations", ...)` |
| `accommodation-module.ts` | 169-170 | `"hospedagens"` (2x) | `"accommodations"` |
| `gallery.ts` | 65 | `loadImageLightbox("galeria")` | `loadImageLightbox("gallery")` |
| `visibility.ts` | 59 | `adjustSingleCardsHeights("hospedagens", ...)` | `adjustSingleCardsHeights("accommodations", ...)` |
| `text-replacement.ts` | 83 | `.includes("hospedagens")` | `.includes("accommodations")` |
| `text-replacement.ts` | 105 | `findJFromID(value, "transporte")` | `findJFromID(value, "transportation")` |
| `text-replacement.ts` | 181 | `findJFromID(value, "hospedagens")` | `findJFromID(value, "accommodations")` |
| `edit-trip.ts` | 44 | `loadDraggablesWithAccordions(["transporte", "hospedagens"])` | `loadDraggablesWithAccordions(["transportation", "accommodations"])` |
| `event-listeners.ts` | 253 | `addRemoveChildListenerDS("transporte", ...)` | `addRemoveChildListenerDS("transportation", ...)` |
| `event-listeners.ts` | 263 | `addRemoveChildListenerDS("galeria", ...)` | `addRemoveChildListenerDS("gallery", ...)` |
| `new-trip.ts` | 165 | `getCategoryID("transporte", j)` | `getCategoryID("transportation", j)` |
| `new-trip.ts` | 300 | `getCategoryID("hospedagens", j)` | `getCategoryID("accommodations", j)` |
| `new-trip.ts` | 301 | `addRemoveChildListener("hospedagens", ...)` | `addRemoveChildListener("accommodations", ...)` |
| `transportation.ts` | 34 | `getOrCreateCategoryID("transporte", j)` | `getOrCreateCategoryID("transportation", j)` |
| `transportation.ts` | 268,270 | `closeAccordions("transporte")`, `openLastAccordion("transporte")` | `"transportation"` |
| `itinerary-module.ts` | 33,84,270 | `getDestinationsFromCards("programacao", ...)`, etc. | `"itinerary"` |
| `destination.ts` | 43 | `updateActiveDestinationsCardsHTML("programacao")` | `updateActiveDestinationsCardsHTML("itinerary")` |
| `existing-trip.ts` | 270 | `updateActiveDestinationsCardsHTML("programacao")` | `updateActiveDestinationsCardsHTML("itinerary")` |
| `new-trip.ts` | 375 | `getActiveDestinationsCardOptions("programacao", j)` | `getActiveDestinationsCardOptions("itinerary", j)` |
| `inner-itinerary.ts` (edit) | 106-107 | `getInnerItinerarySelect("transporte")`, `getInnerItinerarySelect("hospedagens")` | `"transportation"`, `"accommodations"` |
| `inner-itinerary.ts` (edit) | 139 | `getDestinationsFromCards("programacao", j)` | `getDestinationsFromCards("itinerary", j)` |
| `destination.ts` | 137 | `tipo = "destinos"` (default param) | `tipo = "destinations"` |

### Validation
```bash
grep -rn '"transporte"\|"hospedagens"\|"destinos"\|"programacao"\|"galeria"' public/assets/ts/ --include="*.ts" | grep -v "// was"
# Should return ZERO (only comments like "// was ..." are acceptable)
npm run build
```

---

## 📋 Prompt C — Destination Category Names

### Context

The `edit/destination.html` page uses Portuguese category names as `data-category` values:
`restaurantes`, `lanches`, `saidas`, `turismo`, `lojas`

These match `loadEditModule()` calls in `edit-destination.ts` and HTML element IDs.

⚠️ These category names are ALSO stored in destination documents as subcollection keys (`destinos/{id}/restaurantes/{itemId}`). The Firestore subcollections use these names. Changing them requires a migration AND updating all references.

### Step 1: Create Migration

Create `functions/src/migrations/17-migrate-destination-categories.ts`:

| Old Category | New Category |
|-------------|-------------|
| `restaurantes` | `restaurants` |
| `lanches` | `snacks` |
| `saidas` | `nightlife` |
| `turismo` | `tourism` |
| `lojas` | `shopping` |

Must migrate both:
- Subcollection paths: `destinos/{id}/restaurantes/{itemId}` → `destinos/{id}/restaurants/{itemId}`
- The `modulos` map keys inside each destination doc
- Document data references

### Step 2: Update Code (after migration)

#### C1. HTML: `edit/destination.html`

| Line | Old | New |
|------|-----|-----|
| 107 | `data-category="restaurantes"` | `data-category="restaurants"` |
| 145 | `data-category="lanches"` | `data-category="snacks"` |
| 187 | `data-category="saidas"` | `data-category="nightlife"` |
| 224 | `data-category="turismo"` | `data-category="tourism"` |
| 261 | `data-category="lojas"` | `data-category="shopping"` |

Also rename all matching `id` attributes (href-targets, boxes, add-buttons).

#### C2. TS: `edit-destination.ts`

| Line | Old | New |
|------|-----|-----|
| 60-65 | `loadEditModule("restaurantes")` etc. | `loadEditModule("restaurants")` etc. |
| 78-106 | `getID("restaurantes-adicionar")` etc. | `getID("restaurants-add")` etc. |
| 296-301 | Option keys in `openMoveDestinationModal` | Same English keys |

Also rename: `addRestaurantes()` → `addRestaurants()`, `addLanches()` → `addSnacks()`, etc.

### Validation
```bash
grep -rn "restaurantes\|lanches\|saidas\|turismo\|lojas" public/edit/destination.html
# Should only show data-translate attributes (i18n keys), not IDs or data-category
npm run build
```

---

## 📋 Prompt D — CSS Class Name Translations

### Context

CSS classes with Portuguese names, referenced in both CSS and TS files. These are pure UI — no DB dependency.

### Task

#### D1. `legenda` → `caption`

| File | Old | New |
|------|-----|-----|
| `new-destination.ts` | `class="legenda"` (6 occurrences) | `class="caption"` |
| Any CSS `.legenda` selectors | `.legenda` | `.caption` |

#### D2. `nota-*` → `rating-*`

| File | Old | New |
|------|-----|-----|
| CSS (`dark-mode.css`, etc.) | `.nota-texto`, `.nota-sem-margem`, `.nota-5`, `.nota-4`, `.nota-3`, `.nota-2`, `.nota-1`, `.nota-ausente` | `.rating-text`, `.rating-no-margin`, `.rating-5`, `.rating-4`, `.rating-3`, `.rating-2`, `.rating-1`, `.rating-absent` |
| TS files | `classList.add("nota-5")` etc. | `classList.add("rating-5")` etc. |

Check TS: `destination/support/content.ts` uses `getNotaClass()`, `getNotaIcon()`, `getNotaTranslation()` — rename functions AND their internal class references.

#### D3. `turno-box` → `period-box`

| File | Old | New |
|------|-----|-----|
| CSS (`edit.css`, `dark-mode.css`) | `.turno-box` | `.period-box` |
| TS (`new-trip.ts`, `inner-itinerary.ts`) | `class='turno-box'` | `class='period-box'` |

#### D4. `input-botao` → `input-button`

| File | Old | New |
|------|-----|-----|
| CSS (`edit.css`, `dark-mode.css`) | `.input-botao` | `.input-button` |
| CSS | `.input-botao-container` | `.input-button-container` |
| TS files | `class="input-botao"` etc. | `class="input-button"` |

#### D5. `imagem-*` → `image-*`

| File | Old | New |
|------|-----|-----|
| CSS | `.imagem-checkbox` | `.image-checkbox` |
| CSS | `.imagem-uploadbox` | `.image-uploadbox` |
| CSS | `.imagem-input` | `.image-input` |
| TS files | `class="imagem-checkbox"` etc. | `class="image-checkbox"` |

### Validation
```bash
grep -rn "legenda\|nota-\|turno-box\|input-botao\|imagem-checkbox\|imagem-uploadbox\|imagem-input" public/assets/css/ public/assets/ts/
# Should return ZERO
npm run build
```

---

## 📋 Prompt E — HTML Leftovers

### Context

Two small remaining Portuguese items in HTML that don't fit the other prompts.

### Task

#### E1. `hospedagens-box` CSS class in `edit/trip.html`

Line ~512:
```html
<div class="item-box accordion hospedagens-box draggable-area" ...
```
Change to:
```html
<div class="item-box accordion accommodations-box draggable-area" ...
```

Also update any CSS `.hospedagens-box` selectors → `.accommodations-box`.

#### E2. `nota` field in `import-destination.ts`

Line 36: `{ key: "nota", field: "nota", type: "value" }` — this reads a `nota` field from imported data. Check if imported data still uses `nota` or if it was migrated to `rating`. If migrated, change both `key` and `field` to `"rating"`.

---

## Final Validation (After All Prompts)

```bash
# 1. No accented Portuguese in TS (except "Fávero" name in attributions)
grep -r "[áàâãéêíóôõúç]" public/assets/ts/ --include="*.ts"

# 2. No accented Portuguese in CSS
grep -r "[áàâãéêíóôõúç]" public/assets/css/ --include="*.css"

# 3. No Portuguese variable/function names
grep -rn "\binicio\b|\bfim\b|\btransporte\b|\bhospedagens\b|\bdestinos\b|\bprogramacao\b|\bgaleria\b|\bmoeda\b|\btitulo\b|\bdescricao\b|\bimagem\b|\bnota\b|\blegenda\b|\bturno\b|\bcategoria\b|\bplanejado\b|\bresumo\b|\bhabilitado\b|\bviagens\b|\blistagens\b|\busuarios\b|\bprotegido\b|\bcompartilhamento\b|\bdono\b|\bmodulos\b|\bpessoas\b" public/assets/ts/ --include="*.ts" | grep -v "// was"

# 4. No Portuguese HTML IDs/classes (excluding data-translate)
grep -rn 'id=".*inicio\|id=".*fim\|class=".*legenda\|class=".*nota\|class=".*turno-box\|class=".*input-botao\|class=".*imagem-\|class=".*hospedagens-box\|data-category="restaurantes\|data-category="lanches\|data-category="saidas\|data-category="turismo\|data-category="lojas' public/ --include="*.html"

# 5. Build + type-check
npm run build
npx tsc --noEmit
```

All should return **zero results** (only `// was ...` comments acceptable).
