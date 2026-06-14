# 🇬🇧 E049: Final English Cleanup — Implementation Plan

> **Created:** 2026-06-14
> **Based on:** `ai/tasks/8-data-english-migration-plan.md` (partially executed), `functions/src/migrations/13-migrate-english-fields.ts` (database field/value translations)
> **Status:** Not started
> **Goal:** Eliminate ALL Portuguese (pt-BR) from the codebase — no mapping layers, no backward-compat aliases, no leftovers. Direct English everywhere.

---

## Summary

Previous rounds completed:
- ✅ **Round 1:** Function names & variables (partial — leftovers remain)
- ✅ **Round 2:** Database fields & values (migration script 13)
- ✅ **Round 3:** JSON data structure

This plan covers the **final sweep** across 8 prompts:

| Prompt | What | Files affected |
|--------|------|---------------|
| 1 | Translate all Portuguese comments → English | ~15 `.ts` files, ~5 `.css` files |
| 2 | Build the ID/class translation mapping script | New file: `scripts/build/translate-ids.ts` |
| 3 | Rename all HTML IDs + CSS classes → English (HTML + CSS + TS coordinated) | ~6 `.html`, ~5 `.css`, ~25 `.ts` files |
| 4 | Rename all Portuguese variable/function names → English | ~20 `.ts` files |
| 5 | Eliminate `COLLECTION_ALIASES`, fix raw collection strings, update URL params | `database.ts`, `restore.ts`, `set.ts`, `backup.ts` |
| 6 | JSON config keys, image directories, PoC files | ~3 JSON files, ~6 image dirs, ~6 PoC files |
| 7 | Firestore collection rename migration + deploy | New migration script, Firestore |
| 8 | Final validation — zero Portuguese grep, build passes | All files |

### Philosophy: No Layers, No Leftovers

- `COLLECTION_ALIASES` map → **deleted**. Use English collection names directly.
- `URL_PARAM_MAP` with `v`, `d`, `l` → changed to `t`, `d`, `l` (English abbreviations). No fallback to old params.
- All Portuguese variable names → renamed in-place. No `@deprecated` aliases.
- All Portuguese HTML IDs/classes → renamed. Old CSS rules deleted, not kept.

---

## 📋 Prompt 1 — Translate All Portuguese Comments → English

### Context

~25 TypeScript comments and ~5 CSS comments still contain Portuguese text. These are isolated, safe changes with no cascading effects. Execute first to clear the way for the larger renames.

### Task

Translate every Portuguese comment in the codebase to English. For each file listed below, find the comment at the specified line and replace the Portuguese text with the English translation.

#### 1A. TypeScript Comments

| File | Line | Current (PT) | → English |
|------|------|-------------|-----------|
| `public/assets/ts/backup/backup.ts` | 301 | `// mensagem + lista rolável` | `// message + scrollable list` |
| `public/assets/ts/pages/trip-detail/categories/gallery.ts` | 106 | `// Implementação Antiga` | `// Old Implementation` |
| `public/assets/ts/pages/trip-detail/categories/gallery.ts` | 115 | `// Implementação Atual` | `// Current Implementation` |
| `public/assets/ts/pages/trip-detail/categories/gallery.ts` | 122 | `// Implementação Antiga` | `// Old Implementation` |
| `public/assets/ts/pages/trip-detail/categories/destination.ts` | 27 | `// Ímpar` | `// Odd` |
| `public/assets/ts/pages/expenses/categories.ts` | 63 | `// Gastos Prévios` | `// Pre-Trip Expenses` |
| `public/assets/ts/pages/edit-trip/support/event-listeners.ts` | 100 | `// Botões` | `// Buttons` |
| `public/assets/ts/pages/edit-trip/support/event-listeners.ts` | 145 | `// Validação de Imagens no módulo de Customização` | `// Image Validation in Customization module` |
| `public/assets/ts/pages/edit-trip/support/event-listeners.ts` | 156 | `// Validação de Links no módulo de Customização` | `// Link Validation in Customization module` |
| `public/assets/ts/pages/edit-trip/categories/transportation.ts` | 228 | `// Selects Dinâmicos` | `// Dynamic Selects` |
| `public/assets/ts/pages/edit-trip/categories/transportation.ts` | 236 | `// Título Dinâmico` | `// Dynamic Title` |
| `public/assets/ts/pages/edit-trip/categories/transportation.ts` | 251 | `// Cálculo Automático da Duração do Trajeto` | `// Automatic Route Duration Calculation` |
| `public/assets/ts/pages/edit-trip/categories/transportation.ts` | 261 | `// Validação de Link` | `// Link Validation` |
| `public/assets/ts/pages/edit-trip/categories/accommodation.ts` | 94 | `// Validação de Link` | `// Link Validation` |
| `public/assets/ts/pages/edit-trip/categories/itinerary-module/inner-itinerary/inner-itinerary.ts` | 231 | `// Navegação do Modal` | `// Modal Navigation` |
| `public/assets/ts/pages/edit-trip/categories/itinerary-module/inner-itinerary/inner-itinerary.ts` | 327 | `// Salvar Inner Programação` | `// Save Inner Itinerary` |
| `public/assets/ts/pages/edit-trip/categories/itinerary-module/inner-itinerary/inner-itinerary.ts` | 391 | `// Nova Inner Programação (Apenas Adição)` | `// New Inner Itinerary (Addition Only)` |
| `public/assets/ts/pages/edit-trip/categories/itinerary-module/inner-itinerary/inner-itinerary.ts` | 395 | `// Inner Programacao Existente (Substituição)` | `// Existing Inner Itinerary (Replacement)` |
| `public/assets/ts/pages/edit-trip/categories/itinerary-module/inner-itinerary/inner-itinerary.ts` | 398 | `// Substituição Simples` | `// Simple Replacement` |
| `public/assets/ts/pages/edit-trip/categories/itinerary-module/inner-itinerary/inner-itinerary.ts` | 401 | `// Substituição Composta` | `// Compound Replacement` |
| `public/assets/ts/pages/edit-trip/categories/itinerary-module/inner-itinerary/inner-itinerary.ts` | 413 | `// Deletar Inner Programação` | `// Delete Inner Itinerary` |
| `public/assets/ts/pages/edit-trip/categories/itinerary-module/inner-itinerary/content.ts` | 3 | `// Conteúdo do Modal (HTML)` | `// Modal Content (HTML)` |
| `public/assets/ts/pages/edit-trip/categories/gallery.ts` | 61 | `// Validação de Link` | `// Link Validation` |
| `public/assets/ts/pages/edit-trip/categories/destination.ts` | 59 | `// Destinos Cards para Programação` | `// Destination Cards for Itinerary` |
| `public/assets/ts/pages/edit-trip/categories/destination.ts` | 242 | `// Outros (Genérico)` | `// Other (Generic)` |
| `public/assets/ts/utils/messages.ts` | 91 | `// Container de Texto` | `// Text Container` |

#### 1B. CSS Comments

| File | Line | Current (PT) | → English |
|------|------|-------------|-----------|
| `public/assets/css/view/view.css` | 620 | `# Resume - Programação` | `# Resume - Itinerary` |
| `public/assets/css/view/view.css` | 2122 | `/* Hospedagem Box */` | `/* Accommodation Box */` |
| `public/assets/css/view/view.css` | 2374 | `/* Programação Pills */` | `/* Itinerary Pills */` |
| `public/assets/css/itinerary/itinerary.css` | 280 | `# Botões` | `# Buttons` |
| `public/assets/css/destination/destination.css` | 492 | `class='teste'` in SVG data URI | `class='test'` |

### Validation

```bash
grep -r "[áàâãéêíóôõúç]" public/assets/ts/ --include="*.ts"
grep -r "[áàâãéêíóôõúç]" public/assets/css/ --include="*.css"
```

Both should return zero results (only the name "Fávero" in HTML footer attributions is acceptable).

---

## 📋 Prompt 2 — Build the ID/Class Translation Mapping Script

### Context

Prompt 3 will rename ~80 HTML IDs and ~40 CSS classes from Portuguese to English. These IDs/classes are referenced across `.html` (in `id="..."` and `class="..."` attributes), `.css` (as selectors), and `.ts` (in `getID()`, `querySelector()`, template literals, etc.). Manual find-and-replace is error-prone at this scale. We need a script that validates context before replacing.

### Task

Create `scripts/build/translate-ids.ts` — a Node.js script that:

1. **Reads a JSON mapping file** (`scripts/build/id-class-map.json`) containing all old→new translations
2. **Scans** all `.html`, `.css`, and `.ts` files under `public/`
3. **Validates context** for each match before replacing:
   - In `.html`: only inside `id="..."`, `class="..."`, `for="..."`, `data-target="..."`, `data-group="..."`
   - In `.css`: only as CSS selectors (`.classname`, `#idname`, `[data-group="..."]`)
   - In `.ts`: only inside string literals passed to DOM functions (`getID()`, `getChildIDs()`, `querySelector()`, `querySelectorAll()`, `getElementById()`, `classList.add/remove/toggle/contains`, `matches()`, `closest()`), AND in template literals that clearly generate HTML (`innerHTML`, `createElement`, `insertAdjacentHTML`)
4. **Reports ambiguous matches** (Portuguese word found in a non-DOM context) for manual review
5. **Has a `--dry-run` flag** that logs all changes without writing
6. **Has a `--write` flag** that applies changes

#### The Mapping File: `scripts/build/id-class-map.json`

Create this file with ALL translations:

```json
{
  "ids": {
    "programacao-box": "itinerary-box",
    "programacao-modal": "itinerary-modal",
    "programacao-fechar": "itinerary-close",
    "programacao-titulo": "itinerary-title",
    "innner-programacao-travelers-checkboxes": "inner-itinerary-travelers-checkboxes",
    "programacao-data": "itinerary-date",
    "sem-programacao": "no-itinerary",
    "programacao-madrugada": "itinerary-early-morning",
    "programacao-itens-madrugada": "itinerary-items-early-morning",
    "programacao-manha": "itinerary-morning",
    "programacao-itens-manha": "itinerary-items-morning",
    "programacao-tarde": "itinerary-afternoon",
    "programacao-itens-tarde": "itinerary-items-afternoon",
    "programacao-noite": "itinerary-night",
    "programacao-itens-noite": "itinerary-items-night",
    "gastos-container": "expenses-container",
    "tab-moedas": "tab-currencies",
    "resumo-titulo": "summary-title",
    "resumo-total": "summary-total",
    "resumo-container": "summary-container",
    "titulo": "title",
    "titulo-label": "title-label",
    "moeda": "currency",
    "outra-moeda": "other-currency",
    "mapa": "map-section",
    "habilitado-mapa": "map-enabled",
    "habilitado-mapa-label": "map-enabled-label",
    "habilitado-mapa-content": "map-enabled-content",
    "mapa-link": "map-link",
    "mapa-link-label": "map-link-label",
    "subtitulo": "subtitle",
    "descricao": "description",
    "exibir-em-destinos": "show-in-destinations",
    "exibir-em-destinos-label": "show-in-destinations-label",
    "destinos": "destinations",
    "habilitado-destinos-content": "destinations-enabled-content",
    "sem-destinos": "no-destinations",
    "com-destinos": "has-destinations",
    "destinos-search": "destinations-search",
    "destinos-checkboxes": "destinations-checkboxes",
    "todos-destinos-utilizados": "all-destinations-used",
    "gastos": "expenses-section",
    "meios-de-transporte": "transportation-modes",
    "habilitado-transporte": "transportation-enabled",
    "habilitado-transporte-content": "transportation-enabled-content",
    "transporte-box": "transportation-box",
    "transporte-adicionar-box": "transportation-add-box",
    "transporte-adicionar": "transportation-add",
    "habilitado-destinos": "destinations-enabled",
    "programacao": "itinerary-section",
    "habilitado-programacao": "itinerary-enabled",
    "habilitado-programacao-content": "itinerary-enabled-content",
    "galeria": "gallery-section",
    "habilitado-galeria": "gallery-enabled",
    "habilitado-galeria-content": "gallery-enabled-content",
    "galeria-box": "gallery-box",
    "galeria-adicionar-box": "gallery-add-box",
    "galeria-adicionar": "gallery-add",
    "hospedagens-adicionar": "accommodation-add",
    "habilitado-hospedagens": "accommodations-enabled",
    "habilitado-cores": "colors-enabled",
    "radio-moeda": "radio-currency",
    "progDescription": "itineraryDescription"
  },
  "classes": {
    "programacao-item": "itinerary-item",
    "programacao-titulo-box": "itinerary-title-box",
    "programacao-linha": "itinerary-line",
    "programacao-data-box": "itinerary-date-box",
    "programacao-box": "itinerary-box",
    "programacao-container": "itinerary-container",
    "destinos-container": "destinations-container",
    "transporte-categoria": "transport-category",
    "transporte-box": "transportation-box",
    "destinos-titulo": "destination-title",
    "notas-box": "rating-box",
    "nota-sem-margem": "rating-no-margin",
    "nota-5": "rating-5",
    "nota-4": "rating-4",
    "nota-3": "rating-3",
    "nota-2": "rating-2",
    "nota-1": "rating-1",
    "nota-ausente": "rating-absent",
    "nota-texto": "rating-text",
    "destinos-topicos-box": "destination-topics-box",
    "destinos-descricao": "destination-description",
    "destinos-text": "destination-text",
    "destinos-topico": "destination-topic",
    "gastos-item": "expenses-item",
    "gastos-container": "expenses-container",
    "gastos-card": "expenses-card",
    "gastos-titulo": "expenses-title",
    "gastos-subtitulo": "expenses-subtitle",
    "gastos-recibo": "expenses-receipt",
    "gastos-box": "expenses-box",
    "destinos-cards": "destinations-cards",
    "destino-card": "destination-card",
    "destino-card-name": "destination-card-name",
    "destinos-checkboxes": "destinations-checkboxes",
    "destinos-select-container": "destinations-select-container",
    "destinos-select": "destinations-select",
    "turno-box": "period-box",
    "itinerario-cards": "itinerary-cards",
    "galeria-box": "gallery-box",
    "titulo": "title",
    "imagem-checkbox": "image-checkbox",
    "imagem-uploadbox": "image-uploadbox",
    "imagem-input": "image-input",
    "input-botao": "input-button",
    "input-botao-container": "input-button-container",
    "legenda": "caption",
    "accordion-transporte": "accordion-transportation",
    "accordion-programacao": "accordion-itinerary",
    "accordion-galeria": "accordion-gallery",
    "inner-programacao": "inner-itinerary",
    "planejado": "planned"
  },
  "dataAttributes": {
    "turno": "period"
  }
}
```

### Validation

```bash
node scripts/build/translate-ids.ts --dry-run
# Should output a list of all files that would be changed, with old→new pairs
# Verify no unexpected matches before proceeding to Prompt 3
```

### Expected Output

- `scripts/build/id-class-map.json` — the mapping file
- `scripts/build/translate-ids.ts` — the script

---

## 📋 Prompt 3 — Execute ID/Class Renames (HTML + CSS + TS Coordinated)

### Context

Prompt 2 built the mapping script. Now we run it to apply all ID/class renames across the entire codebase. This is the largest single change — ~120 identifiers across ~35 files.

### Task

1. **Run the script in dry-run mode** first:

```bash
node scripts/build/translate-ids.ts --dry-run
```

2. **Review the dry-run output** for any unexpected matches. The following patterns are expected:

   - In `.html` files: `id="programacao-box"` → `id="itinerary-box"`, `class="gastos-card"` → `class="expenses-card"`, etc.
   - In `.css` files: `.programacao-item` → `.itinerary-item`, `#gastos-container` → `#expenses-container`, etc.
   - In `.ts` files: `getID("programacao-box")` → `getID("itinerary-box")`, `classList.add("nota-5")` → `classList.add("rating-5")`, template literals like `` `programacao-${j}` `` → `` `itinerary-${j}` ``, etc.

3. **Apply the changes:**

```bash
node scripts/build/translate-ids.ts --write
```

4. **Handle dynamic template literals that the script may miss.** Manually verify and fix these patterns in TS files:

   - `` `programacao-${j}` `` → `` `itinerary-${j}` ``
   - `` `inner-programacao-madrugada-${j}` `` → `` `inner-itinerary-early-morning-${j}` ``
   - `` `inner-programacao-manha-${j}` `` → `` `inner-itinerary-morning-${j}` ``
   - `` `inner-programacao-tarde-${j}` `` → `` `inner-itinerary-afternoon-${j}` ``
   - `` `inner-programacao-noite-${j}` `` → `` `inner-itinerary-night-${j}` ``
   - `` `programacao-local-${j}` `` → `` `itinerary-location-${j}` ``
   - `` `transporte-${j}` `` → `` `transportation-${j}` ``
   - `` `galeria-${j}` `` → `` `gallery-${j}` ``
   - `` `${categoria}-box` `` → `` `${category}-box` ``
   - `` `collapse-${categoria}-${i}` `` → `` `collapse-${category}-${i}` ``
   - `` `remove-${categoria}-${j}` `` → `` `remove-${category}-${j}` ``
   - `` `radio-moeda-${j}` `` → `` `radio-currency-${j}` ``
   - `` `tabs-moedas` `` → `` `tabs-currencies` ``
   - `` `${type}-adicionar-box` `` → `` `${type}-add-box` ``

5. **Manual sweep** for any remaining Portuguese IDs/classes:

```bash
grep -rn "programacao\|gastos\|destinos\|viagens\|hospedagem\|transporte\|moeda\|titulo\|descricao\|imagem\|galeria\|nota\|legenda\|turno\|botao\|categoria\|planejado\|resumo\|habilitado\|exibir\|madrugada\|manha\|tarde\|noite" public/*.html public/edit/*.html
```

If any matches remain, they should only be in:
- `data-translate` attributes (i18n keys, which are fine)
- Comments from Prompt 1 (if not yet processed)
- User-visible Portuguese text content (names, descriptions — not IDs)

### Validation

```bash
npm run build
# Should succeed with no errors
```

---

## 📋 Prompt 4 — Rename All Portuguese Variable & Function Names → English

### Context

With IDs/classes renamed (Prompt 3), we now rename all Portuguese-named variables and functions. Use VS Code's `F2` rename where possible; for string-literal references, use find-and-replace.

### Task

Rename every identifier in the tables below. Process file-by-file.

#### 4A. Global Variables

| File | Old Name | New Name |
|------|---------|----------|
| `public/assets/ts/vendor.d.ts:44` | `PERMISSOES` | `PERMISSIONS` |
| `public/assets/ts/data/firebase/storage.ts:12` | `PERMISSOES` | `PERMISSIONS` |
| `public/assets/ts/vendor.d.ts:33` | `GASTOS` | `EXPENSES_DATA` |

After renaming, update ALL references in `.ts` files that use `PERMISSOES` or `GASTOS`.

#### 4B. Module-Level Constants

| File | Old Name | New Name |
|------|---------|----------|
| `database.ts:6` (import) | `DESTINOS_ATIVOS` | `ACTIVE_DESTINATIONS` |
| `database.ts:523,541-542` | `DESTINOS_ATIVOS` | `ACTIVE_DESTINATIONS` |
| `pages/expenses/support/currency.ts:11` | `MOEDAS` | `CURRENCIES` |
| `ui/fields.ts:106` | `dadosBasicos` | `basicFields` |

#### 4C. Function Names

| File | Old Name | New Name |
|------|---------|----------|
| `pages/destination/support/content.ts` | `getNotaIcon()` | `getRatingIcon()` |
| `pages/destination/support/content.ts` | `getNotaClass()` | `getRatingClass()` |
| `pages/destination/support/content.ts` | `getNotaTranslation()` | `getRatingTranslation()` |
| `pages/destination/support/content.ts` | `getValorVisibility()` | `getPriceVisibility()` |
| `pages/destination/support/content.ts` | `getDescricaoVisibility()` | `getDescriptionVisibility()` |
| `pages/edit-trip/categories/itinerary-module/inner-itinerary/inner-itinerary.ts` | `deleteInnerProgramacao()` | `deleteInnerItinerary()` |

Update all call sites for these functions.

#### 4D. Local Variables — File by File

**`public/assets/ts/app/main.ts`:**
- `versoes` → `versions`

**`public/assets/ts/data/firebase/storage.ts`:**
- `caminho` → `path` (all occurrences)
- `imagem` → `image` (all occurrences)
- `hospedagens` → `accommodations` (all occurrences)
- `galeria` → `gallery` (all occurrences)

**`public/assets/ts/data/firebase/database.ts`:**
- All `data.destinos` → `data.destinationRefs` (field access on trip data)
- All `ref.destinosID` → `ref.id` (destination ref ID field)
- All `tripData.destinos[i].destinos` → `tripData.destinationRefs[i].data`
- `refs[i].destinosID` → `refs[i].id`
- `userData.viagens` → `userData.trips` (the backward-compat block should be REMOVED entirely — migration 13 already ran)

**`public/assets/ts/data/services/destination.service.ts`:**
- `destData?.titulo` → `destData?.title`
- `destData?.moeda` → `destData?.currency`

**`public/assets/ts/backup/backup.ts`:**
- `titulo` → `title` (all occurrences)
- `viagens` → `trips` (all occurrences)
- `viagem` → `trip` (all occurrences)
- `gastos` → `expenses` (collection name references)
- `protegido` → `protected` (collection name references)
- `hospedagens` → `accommodations`
- `transportes` → `transportation`

**`public/assets/ts/backup/restore.ts`:**
- `titulo` → `title`
- `destinos` → `destinations` (collection name references)
- `gastos` → `expenses` (collection name references)
- `listagens` → `listings` (collection name references)
- `protegido` → `protected` (collection name references)
- `viagens` → `trips`
- `viagemID` → `tripID`
- `compartilhamento` → `sharing`
- `dono` → `owner`

**`public/assets/ts/utils/set.ts`:**
- `hospedagens: []` → `accommodations: []`
- `galeria: []` → `gallery: []`
- `destinos` → `destinations` (case labels and data references)
- `listagens` → `listings`
- `viagens` → `trips`
- `moeda` → `currency`
- `titulo` → `title`
- `descricao` → `description`
- `imagem` → `image`
- `subtitulo` → `subtitle`
- `modulos` → `modules`

**`public/assets/ts/utils/pin.ts`:**
- `properties.titulo` → `properties.title`

**`public/assets/ts/utils/messages.ts`:**
- All `titulo` property names → `title`
- All `properties.titulo` → `properties.title`

**`public/assets/ts/utils/dom.ts`:**
- `planejado` → `planned`
- `moeda` → `currency`
- `destinosID` → `destinationID`
- `valores` → `values`

**`public/assets/ts/theme/visibility.ts`:**
- `adicionarBox` → `addButtonBox`

**`public/assets/ts/pages/trip-detail/view.ts`:**
- `destinosID` → `destinationID`
- `destinos` → `destinationData` (when it's a fetched destination object, not the array)

**`public/assets/ts/pages/trip-detail/categories/accommodation-module.ts`:**
- `galeriaItems` → `galleryItems`
- `galeriaId` → `galleryId`
- `imagem` → `image`
- `descricao` → `description`

**`public/assets/ts/pages/trip-detail/categories/gallery.ts`:**
- `categoria` → `category`
- `galeria` → `gallery` (CSS class reference)

**`public/assets/ts/pages/expenses/support/currency.ts`:**
- `moeda` → `currency` (local variable)
- `moedasTab` → `currencyTab`
- All `MOEDAS` references → `CURRENCIES`

**`public/assets/ts/pages/destination/support/content.ts`:**
- `nota` → `rating` (all occurrences)
- `regiao` → `region`
- `planejado` → `planned`

**`public/assets/ts/pages/edit-trip/categories/destination.ts`:**
- `destinosID` → `destinationID`
- `titulo` → `title`

**`public/assets/ts/pages/edit-trip/categories/itinerary-module/inner-itinerary/inner-itinerary.ts`:**
- `turno` → `period` (all occurrences)

**`public/assets/ts/pages/edit-trip/support/event-listeners.ts`:**
- `turno` → `period` (all occurrences)

**`public/assets/ts/pages/edit-trip/set-trip.ts`:**
- `hospedagens` → `accommodations`
- `destinos` → `destinations`
- `programacao` → `itinerary`
- `transportes` → `transportation`

**`public/assets/ts/pages/edit-listing/existing-listing.ts`:**
- `destinosID` → `destinationID`

**`public/assets/ts/pages/edit-destination/new-destination.ts`:**
- `categoria` → `category` (all occurrences)

**`public/assets/ts/pages/edit-destination/edit-destination.ts`:**
- `getNotaClass` → `getRatingClass`
- `getNotaIcon` → `getRatingIcon`

**`public/assets/ts/models/expense.model.ts`:**
- All `MOEDAS` references → `CURRENCIES`
- `resumo` → `summary`

**`public/assets/ts/ui/accordion.ts`:**
- `categoria` → `category` (parameter name)
- `childs` → `children` (local variable)

**`public/assets/ts/ui/dynamic-select.ts`:**
- `categoria` → `category` (parameter name)

### Validation

```bash
npx tsc --noEmit
```

Fix any type errors from renamed variables.

---

## 📋 Prompt 5 — Eliminate COLLECTION_ALIASES, Fix Raw Collection Strings, Update URL Params

### Context

`database.ts` currently has a `COLLECTION_ALIASES` map (English→Portuguese fallback) and `URL_PARAM_MAP` with `v`/`d`/`l` (Portuguese abbreviations). Some files bypass the constants entirely with raw Portuguese strings. **All layers must be removed.** English only, directly.

### Task

#### 5A. Remove `COLLECTION_ALIASES` from `database.ts`

Delete the entire `COLLECTION_ALIASES` constant. Also delete any code that references it. Search for `COLLECTION_ALIASES` across the codebase to confirm no other file imports it.

#### 5B. Fix Raw Portuguese Collection Strings

Replace every raw Portuguese collection name string with its English equivalent:

| File | Old Code | New Code |
|------|---------|----------|
| `database.ts` | Any `"viagens"` string literal | `COLLECTION.TRIPS` |
| `database.ts` | Any `"protegido"` string literal | `COLLECTION.PROTECTED` |
| `database.ts` | Any `"gastos"` string literal | `COLLECTION.EXPENSES` |
| `database.ts` | Any `"usuarios"` string literal | `COLLECTION.USERS` |
| `database.ts` | Any `"destinos"` string literal | `COLLECTION.DESTINATIONS` |
| `restore.ts` | `"viagens"` | `"trips"` |
| `restore.ts` | `"protegido"` | `"protected"` |
| `restore.ts` | `"gastos"` | `"expenses"` |
| `restore.ts` | `"usuarios"` | `"users"` |
| `restore.ts` | `"destinos"` | `"destinations"` |
| `restore.ts` | `"listagens"` | `"listings"` |
| `set.ts` | `` `usuarios/${uid}` `` | `` `users/${uid}` `` |

Also fix protected subcollection paths:
- `` `viagens/protected/${pin}/${tripID}` `` → `` `trips/protected/${pin}/${tripID}` ``
- `` `gastos/protected/${pin}/${tripID}` `` → `` `expenses/protected/${pin}/${tripID}` ``

#### 5C. Update `URL_PARAM_MAP` to English Abbreviations

In `database.ts`, change:

```ts
const URL_PARAM_MAP: Record<string, string> = {
    [COLLECTION.TRIPS]: "t",         // was "v" (viagens)
    [COLLECTION.DESTINATIONS]: "d",  // was "d" (destinos) — same, but explicit
    [COLLECTION.LISTINGS]: "l",      // was "l" (listagens) — same, but explicit
};
```

#### 5D. Update All URL Param Readers

Find every `getURLParam("v")` and `getURLParam("g")` in the codebase and change to `getURLParam("t")` and `getURLParam("e")`:

| File | Old | New |
|------|-----|-----|
| `pages/trip-detail/view.ts` | `getURLParam("v")` | `getURLParam("t")` |
| `pages/edit-trip/edit-trip.ts` | `getURLParam("v")` | `getURLParam("t")` |
| `pages/itinerary/itinerary.ts` | `getURLParam("v")` | `getURLParam("t")` |
| `pages/trip-detail/support/embed.ts` | `getURLParam("v")` | `getURLParam("t")` |
| `pages/expenses/expenses.ts` | `getURLParam("g")` | `getURLParam("e")` |

Also update URL construction in template strings:
| File | Old | New |
|------|-----|-----|
| `embed.ts` | `` `expenses.html?...&g=...` `` | `` `expenses.html?...&e=...` `` |
| `expenses.ts` | `view.html?v=...` | `view.html?t=...` |

No backward compatibility — old `?v=` and `?g=` params will stop working. This is intentional.

#### 5E. Remove the Backward-Compat Block in `deleteAccountDocuments`

In `database.ts`, the block that checks `userData.viagens` (old Portuguese field name) should be removed entirely since migration 13 already translated all documents. Only use `userData.trips`.

### Validation

```bash
grep -rn '"viagens"\|"protegido"\|"gastos"\|"usuarios"\|"destinos"\|"listagens"' public/assets/ts/ --include="*.ts"
# Should return ZERO results
```

---

## 📋 Prompt 6 — JSON Config Keys, Image Directories, PoC Files

### Context

These are smaller, lower-risk changes that can be done independently.

### Task

#### 6A. JSON Config Files

In `public/assets/json/transportes.json`, rename all `claro` keys to `light` and `escuro` keys to `dark`. Then update all `.ts` files that read these keys:

| File | Old Access | New Access |
|------|-----------|-----------|
| Any file reading transport JSON | `.claro` | `.light` |
| Any file reading transport JSON | `.escuro` | `.dark` |

Delete `public/assets/json/transportes.json.bak` if it exists and is not needed.

Check all other JSON files in `public/assets/json/` for Portuguese keys and rename them.

#### 6B. Image Directory Names

Rename the following directories and update ALL path references in `.ts` and `.json` files:

| Old Path | New Path |
|----------|----------|
| `public/assets/img/transportation/carro/` | `public/assets/img/transportation/car/` |
| `public/assets/img/transportation/onibus/` | `public/assets/img/transportation/bus/` |
| `public/assets/img/transportation/voo/` | `public/assets/img/transportation/flight/` |
| `storage/transportation/carro/` | `storage/transportation/car/` |
| `storage/transportation/onibus/` | `storage/transportation/bus/` |
| `storage/transportation/voo/` | `storage/transportation/flight/` |

#### 6C. PoC / Template Files

The `pocs/html templates/` directory contains legacy templates. Do a quick pass to translate obvious Portuguese text (IDs, labels, comments) or move the entire directory to `pocs/archive/` with a README noting they're pre-migration legacy files.

### Validation

```bash
# Verify image paths resolve
dir public\assets\img\transportation\car
dir public\assets\img\transportation\bus
dir public\assets\img\transportation\flight
```

---

## 📋 Prompt 7 — Firestore Collection Rename Migration

### Context

All collection path references in code now use English names (Prompt 5). But the actual Firestore collections still have Portuguese names (`usuarios`, `viagens`, `destinos`, `listagens`, `gastos`, `protegido`). We need a migration to rename them.

⚠️ **Firestore has no "rename collection" operation.** Migration means: read all docs from old collection → write to new collection → delete old docs.

### Task

Create `functions/src/migrations/15-migrate-collection-names.ts` following the established pattern (HTTP trigger, batched writes, idempotent, dry-run support via `?dryRun=true`).

The migration must:

1. **Copy documents** from each old collection to the new English-named collection:

| Old Collection | New Collection |
|---------------|---------------|
| `usuarios` | `users` |
| `viagens` | `trips` |
| `destinos` | `destinations` |
| `listagens` | `listings` |
| `gastos` | `expenses` |
| `protegido` | `protected` |

2. **Handle subcollections** — if any exist under the old paths, migrate them too:
   - `viagens/{id}/protected/{pin}/{id}` → `trips/{id}/protected/{pin}/{id}`
   - `gastos/{id}/protected/{pin}/{id}` → `expenses/{id}/protected/{pin}/{id}`

3. **Be idempotent** — if a document already exists in the target collection, skip it (or verify content matches and skip).

4. **After all documents are copied and verified**, delete the old source documents.

5. **Dry-run mode** (`?dryRun=true`) logs what would be copied/deleted without writing.

### Validation

```bash
cd functions && npm run build

# Test with emulators
npx firebase emulators:start --only functions
curl "http://localhost:5001/.../migrateCollectionNames?dryRun=true"
curl "http://localhost:5001/.../migrateCollectionNames"
```

After running in production, verify via Firebase Console that all old Portuguese-named collections are empty and all new English-named collections have the correct documents.

---

## 📋 Prompt 8 — Final Validation Sweep

### Context

All changes are complete. Run the full validation suite to confirm zero Portuguese remains.

### Task

Run each command below. Every one must return **zero results** (or only acceptable matches as noted).

```bash
# 1. No Portuguese accented characters in TS (except name "Fávero" in HTML attributions)
grep -r "[áàâãéêíóôõúç]" public/assets/ts/ --include="*.ts"

# 2. No Portuguese accented characters in CSS
grep -r "[áàâãéêíóôõúç]" public/assets/css/ --include="*.css"

# 3. No Portuguese variable/function names
grep -rn "\bprogramacao\b\|\bgastos\b\|\bdestinos\b\|\bviagens\b\|\bhospedagem\b\|\btransporte\b\|\bmoeda\b\|\btitulo\b\|\bdescricao\b\|\bimagem\b\|\bgaleria\b\|\bnota\b\|\blegenda\b\|\bturno\b\|\bbotao\b\|\bcategoria\b\|\bplanejado\b\|\bresumo\b\|\bhabilitado\b\|\bexibir\b\|\bmadrugada\b\|\bmanha\b\|\btarde\b\|\bnoite\b\|\bprotegido\b\|\blistagens\b\|\busuarios\b\|\bversoes\b\|\bcaminho\b\|\bPERMISSOES\b\|\bMOEDAS\b\|\bDESTINOS_ATIVOS\b\|\bGASTOS\b\|\bdadosBasicos\b\|\bviagem\b\|\bcompartilhamento\b\|\bdono\b\|\bmodulos\b\|\bsubtitulo\b\|\badicionar\b\|\blanches\b\|\blojas\b\|\bsaidas\b\|\bturismo\b\|\bvalor\b" public/assets/ts/ --include="*.ts"

# 4. No raw Portuguese collection name strings
grep -rn '"viagens"\|"protegido"\|"gastos"\|"usuarios"\|"destinos"\|"listagens"' public/assets/ts/ --include="*.ts"

# 5. No Portuguese HTML IDs/classes (non-data-translate)
grep -rn 'id=".*programacao\|id=".*gastos\|id=".*destinos\|id=".*moeda\|id=".*titulo\|id=".*descricao\|id=".*imagem\|id=".*galeria\|id=".*habilitado\|id=".*resumo\|id=".*subtitulo\|id=".*exibir\|id=".*mapa"\|id=".*meios-de\|id=".*transporte\|id=".*hospedagem\|id=".*adicionar\|class=".*programacao\|class=".*gastos\|class=".*destinos\|class=".*transporte\|class=".*nota\|class=".*turno\|class=".*botao\|class=".*categoria\|class=".*planejado\|class=".*legenda\|class=".*imagem\|class=".*galeria\|class=".*titulo\|class=".*resumo\|class=".*itinerario' public/ --include="*.html"

# 6. Build succeeds
npm run build

# 7. TypeScript compiles
npx tsc --noEmit
```

### Final Manual Tests

1. Start dev server: `npm run dev`
2. Open `http://localhost:5000` — home page loads
3. Navigate to a trip (`view.html?t=<id>`) — all modules display correctly
4. Open expenses (`expenses.html?e=<id>`) — currencies tab, summary, pre/during trip all work
5. Open itinerary (`itinerary.html?t=<id>`) — calendar and schedule display
6. Open edit pages — all forms load, save works, no console errors
7. Check Firebase Console — all new English-named collections populated
