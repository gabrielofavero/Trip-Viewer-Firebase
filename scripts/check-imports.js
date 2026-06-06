/**
 * ======= Static Import & Window Pollution Checker =======
 *
 * Scans all .js files under public/assets/js/ and reports:
 *  1. Function calls to names that are neither defined locally nor imported
 *  2. `window.xxx =` assignments (global namespace pollution)
 *  3. Direct `FIRESTORE_DATA` references (should use getState()/setState())
 *
 * Usage: node scripts/check-imports.js [--verbose] [--json] [--all]
 *   --all   Show suppressed/known issues too
 * Exit code: 0 if clean or only known issues, 1 if new issues found
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
  "Uint32Array", "Int32Array", "Int16Array", "Int8Array",
  "Uint16Array", "Uint8ClampedArray", "Float32Array", "Float64Array",
  "BigInt64Array", "BigUint64Array",

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

// Common callback/parameter names that get called
const CALLBACK_NAMES = new Set([
  "customFunction", "hoverFn", "onStartFunc", "onEndFunc",
  "afterAction", "addFn", "applyPreference", "applyContent",
  "applyExpenses", "embedAfterLoadAction", "restoreOnFileSelectionAction",
  "visibilityListenerAction", "sendHeightMessageToParent",
  "transportationAddListenerAction", "accommodationsAddListenerAction",
  "galeriaAdicionarListenerAction",
]);

// ---------------------------------------------------------------
// Known pre-existing missing imports (from global-to-module migration)
// These are tracked but not treated as errors.
// Format: { filePattern: Set of function names }
// When these get proper imports, remove them from this list.
// ---------------------------------------------------------------

const KNOWN_MISSING_IMPORTS = {
  "app/main.js": new Set(["LOCAL"]),
  "data/firebase/auth.js": new Set(["openIndexPage", "unsubscribe"]),
  "data/firebase/database.js": new Set(["overwrite"]),
  "data/firebase/storage.js": new Set(["getLastDir", "getStorageErrorMessage", "deleteImageByLink"]),
  "models/destination.model.js": new Set(["getPriceBuckets"]),
  "models/itinerary.model.js": new Set(["getTurno", "getScheduleTitle"]),
  "models/trip.model.js": new Set(["getFormattedDate"]),
  "pages/destination/categories.js": new Set(["getPlannedDestinations"]),
  "pages/destination/destination.js": new Set([
    "getTripData", "loadPlannedDestination", "loadActiveCategory",
    "loadDestinationVisibility", "applyDestinationsMediaHeight", "adjustMediaEmbeds",
    "getDestinationsHTML", "loadEmbed", "loadSortAndFilter", "adjustInstagramMedia",
    "adjustEditVisibility", "restoreIfEditing", "adjustDrawer", "unloadMedias",
    "unloadMedia", "loadMedia", "updateActiveCategory",
  ]),
  "pages/destination/edit-destination.js": new Set([
    "getDestinationID", "getEditHTML", "populatePlannedDestinationEditField",
    "getDestinationsHTML", "openDestinationsAccordion", "processAccordion",
    "getItem", "setPlannedDestination", "refreshTripData", "refreshDestination",
    "getPlanejado", "getDestinationsAccordionBodyHTML", "getItemFromJ",
  ]),
  "pages/destination/support/content.js": new Set(["getPlanejado"]),
  "pages/destination/support/media-embed.js": new Set(["getSystemWidth"]),
  "pages/destination/support/visibility.js": new Set(["adjustEditVisibility"]),
  "pages/destination/support/sort-and-filter/filter.js": new Set([
    "getFilterPreferences", "shouldDisplayPlanned", "shouldDisplayPrices",
    "shouldDisplayScores", "shouldDisplayRegions", "getItem", "applyContent",
    "isPlanned", "loadFilterSortingData", "getPrices", "openFilterSortDrawer",
  ]),
  "pages/destination/support/sort-and-filter/sort-and-filter.js": new Set([
    "loadFilterOptions", "loadSortOptions", "sort", "filter", "getDataSet",
    "getPriceBuckets", "isDrawerOpen", "closeDrawer", "openDrawer", "getInnerHTML",
    "getPrices",
  ]),
  "pages/destination/support/sort-and-filter/sort.js": new Set([
    "getSortPreferences", "getItem", "applyContent", "isPlanned",
    "loadFilterSortingData", "shouldDisplayScores", "shouldDisplayPlanned",
    "shouldDisplayPrices", "openFilterSortDrawer",
  ]),
  "pages/destination/support/sort-and-filter/support/drawer.js": new Set([
    "getFilterPreferences", "getSortPreferences", "filter", "sort", "applyPreference",
  ]),
  "pages/destination/support/sort-and-filter/support/price-bucket.js": new Set(["getDataSet"]),
  "pages/edit-destination/edit-destination.js": new Set([
    "addRestaurantes", "addLanches", "addSaidas", "addTurismo", "addLojas",
    "setDocumento", "loadCurrencySelects", "loadDestinationsData",
    "emojisOnInputAction", "getDescription", "addDestino", "addDestinoHTML",
    "setDescription", "updateDescriptionButtonLabel",
  ]),
  "pages/edit-destination/existing-destination.js": new Set([
    "loadMoedaOptions", "setDescription", "updateDescriptionButtonLabel",
    "addRestaurantes", "addLanches", "addSaidas", "addTurismo", "addLojas",
    "loadMoedaValorAndVisibility",
  ]),
  "pages/edit-destination/import-destination.js": new Set([
    "loadMoedaValorAndVisibility", "setDescription", "updateDestinationsTitle",
    "updateDescriptionButtonLabel", "addFn",
  ]),
  "pages/edit-destination/new-destination.js": new Set([
    "loadCurrencySelects", "addDestinationsListeners", "addListenerToRemoveDestination",
  ]),
  "pages/edit-destination/set-destination.js": new Set(["getDescription"]),
  "pages/edit-listing/edit-listing.js": new Set([
    "loadDestinations", "loadUploadSelector", "autoFillDarkColor", "loadListData",
    "buildCompartilhamentoObject", "buildDestinosArray", "buildImagemObject",
    "buildLinksObject", "setDocumento",
  ]),
  "pages/edit-listing/existing-listing.js": new Set(["loadCustomizacaoData", "loadDestinationsData"]),
  "pages/edit-trip/categories/accommodation.js": new Set(["addHospedagens"]),
  "pages/edit-trip/categories/basic-data/set-protected-data.js": new Set(["getNewPinObject", "isDataUnprotected"]),
  "pages/edit-trip/categories/destination.js": new Set(["loadItineraryListeners"]),
  "pages/edit-trip/categories/expenses.js": new Set(["getSharingObject", "getTravelersObject"]),
  "pages/edit-trip/categories/gallery.js": new Set(["addGaleria"]),
  "pages/edit-trip/categories/transportation.js": new Set(["addTransportation"]),
  "pages/edit-trip/categories/travelers.js": new Set(["loadItineraryData"]),
  "pages/edit-trip/categories/itinerary-module/inner-itinerary/inner-itinerary.js": new Set([
    "getInnerProgramacaoContent", "getActiveDestinations", "enableAllTravelersFieldset",
    "getDataSelectOptions", "getDestinosFromCheckbox", "updateTravelersFieldset",
    "loadTextReplacementCheckboxes", "replaceTextIfEnabled", "replaceTimeIfEnabled",
    "validateTravelersFieldset", "getCheckedTravelersIDs",
  ]),
  "pages/edit-trip/categories/itinerary-module/inner-itinerary/text-replacement.js": new Set(["getTurno"]),
  "pages/edit-trip/categories/itinerary-module/itinerary-module.js": new Set([
    "getDestinosFromCheckbox", "addValuesForDestinosAtivosCheckbox",
    "loadInnerItineraryHTML", "loadItinerarySchedule", "updateDestinosAtivosCheckboxHTML",
  ]),
  "pages/edit-trip/edit-trip.js": new Set([
    "loadNewTrip", "loadEventListeners", "loadUploadSelector", "loadPinData", "loadTripData",
  ]),
  "pages/edit-trip/existing-trip.js": new Set([
    "updateTravelersButtonLabel", "setCurrentPreferencePIN", "switchPinVisibility",
    "switchPinLabel", "loadCustomizacaoImageData", "visibilityListenerAction",
    "addTransportation", "loadTransportationVisibility", "updateTransportationTitle",
    "applyTransportationTypeVisualization", "addHospedagens", "setImagemButtonLabel",
    "loadCheckIn", "loadCheckOut", "loadDestinations", "loadDestinosAtivos",
    "loadItinerarySchedule", "applyLoadedItineraryData", "updateDestinosAtivosCheckboxHTML",
    "addGaleria",
  ]),
  "pages/edit-trip/new-trip.js": new Set([
    "loadTransportationListeners", "loadTransportationVisibility",
    "applyTransportationTypeVisualization", "addRemoveTransportationListener",
    "updateTransportationTitle", "removeAccommodationImages", "loadAccommodationListeners",
    "getDestinationsItemCheckbox", "updateDestinosAtivosHTMLs", "updateItineraryTitle",
    "loadItineraryListeners", "reloadItinerary", "loadGaleriaListeners",
    "addRemoveGaleriaListener",
  ]),
  "pages/edit-trip/set-trip.js": new Set([
    "getCurrentPreferencePIN", "getDestinationsArray", "getProtectedAccommodationObject",
    "getProtectedTransportationObject", "getGaleriaObject", "getAccommodationArray",
    "getItineraryArray", "getTransportationObject", "getExpensesObject", "addSetResponse",
    "setDocumento",
  ]),
  "pages/edit-trip/support/event-listeners.js": new Set([
    "setTripData", "buildVisibilidadeObject", "reloadItinerary",
    "autoFillDarkColor", "applyTransportationTypeVisualization",
  ]),
  "pages/expenses/categories.js": new Set(["setTable", "setChart"]),
  "pages/expenses/expenses.js": new Set([
    "loadEmbedMode", "requestInvalidPin", "loadSummary",
    "loadPreTripExpenses", "loadDuringTripExpenses", "loadTravelerExpenses",
    "applyTravelerExpenses",
  ]),
  "pages/expenses/support/currency.js": new Set(["setTabListeners"]),
  "pages/expenses/support/embed.js": new Set(["setManualPin"]),
  "pages/home/index.js": new Set([]),
  "pages/home/support/data.js": new Set([
    "loadDestinationsTab", "loadListsTab", "closeDestDialog",
  ]),
  "pages/home/support/event-listeners.js": new Set([]),
  "pages/itinerary/itinerary.js": new Set(["requestInvalidPin"]),
  "pages/trip-detail/categories/accommodation-module.js": new Set([
    "loadImageLightbox", "getSensitiveReservationHTML", "initSwiper",
  ]),
  "pages/trip-detail/categories/destination.js": new Set(["openViewEmbed"]),
  "pages/trip-detail/categories/gallery.js": new Set(["loadImageLightbox"]),
  "pages/trip-detail/categories/itinerary-module/calendar.js": new Set(["refreshPills"]),
  "pages/trip-detail/categories/itinerary-module/inner-itinerary.js": new Set([
    "loadImageLightbox", "getFlightBoxHTML",
  ]),
  "pages/trip-detail/categories/itinerary-module/itinerary-module.js": new Set([
    "loadCalendar", "loadCalendarItem", "openViewEmbed",
  ]),
  "pages/trip-detail/categories/transportation-module.js": new Set([
    "getSensitiveReservationHTML", "initSwiper", "adjustCardsHeights",
  ]),
  "pages/trip-detail/support/embed.js": new Set(["updateProtectedDataFromExternalPin"]),
  "pages/trip-detail/support/sensitive-reservation.js": new Set(["copyToClipboard", "sendToExpenses"]),
  "pages/trip-detail/support/visibility.js": new Set([
    "adjustTransportationBoxContainerHeight", "sendToExpenses",
  ]),
  "pages/trip-detail/view.js": new Set([
    "mainView", "refreshCategorias", "adjustDestinationsHTML",
    "adjustCardsHeightsListener", "loadViewEmbed", "openExpensesEmbed",
    "loadDestinationsCustomSelect", "loadDestinationsHTML", "loadViewVisibility",
    "adjustPortfolioHeight", "loadSensitiveReservations", "adjustCardsHeights",
    "requestDocumentPin",
  ]),
  "theme/visibility.js": new Set([
    "loadTransportationImages", "loadViewCustomVisibilityRules",
    "applyAccordionArrowCustomColor", "changeChartsLabelsVisibility",
    "loadCurrenciesTab",
  ]),
  "utils/dom.js": new Set(["getFlightBoxHTML", "getHospedagensData", "getHotelBoxHTML"]),
  "utils/pin.js": new Set(["translate", "cloneObject", "getContainersInput", "displayFullMessage"]),
};

const ALL_KNOWN_GLOBALS = new Set([...BROWSER_GLOBALS, ...VENDOR_GLOBALS, ...CALLBACK_NAMES]);

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

// Class method definitions: methodName(args) {  (indented, no 'function' keyword)
// Matches:  method() {,  async method() {,  static method() {,  get prop() {,  set prop(val) {
const RE_CLASS_METHOD = /(?:^|\n)\s{2,}(?:static\s+)?(?:async\s+)?(?:get\s+|set\s+)?(\w+)\s*\([^)]*\)\s*\{/gm;

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
  // Replace with "x" so import paths retain a non-empty value for regex matching
  s = s.replace(RE_STRINGS, '"x"');
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

  // Class method definitions (methodName() { inside a class body)
  for (const m of cleanSource.matchAll(RE_CLASS_METHOD)) defs.add(m[1]);

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
    missingImports: [],     // { file, name, line }
    knownMissingImports: [], // { file, name, line } — pre-existing, tracked
    windowAssignments: [],  // { file, name, count }
    firestoreRefs: [],      // { file, count }
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

    // All names available locally (including known globals)
    const available = new Set([...imported, ...defined, ...ALL_KNOWN_GLOBALS]);

    // Known missing imports for this file
    const knownForFile = KNOWN_MISSING_IMPORTS[rel] || new Set();

    // Check for missing imports
    for (const name of called) {
      if (!available.has(name)) {
        const lineNum = findLineNumber(rawSource, name);
        const issue = { file: rel, name, line: lineNum };

        if (knownForFile.has(name)) {
          issues.knownMissingImports.push(issue);
        } else {
          issues.missingImports.push(issue);
        }
      }
    }

    // Check window assignments
    for (const name of windowAssigns) {
      issues.windowAssignments.push({
        file: rel,
        name,
        count: 1,
      });
    }

    // Check FIRESTORE_DATA
    if (firestoreRefs.length > 0) {
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

function printReport(issues, filesScanned, verbose, json, showAll) {
  if (json) {
    console.log(JSON.stringify({ issues, filesScanned }, null, 2));
    return;
  }

  const newCount = issues.missingImports.length;
  const knownCount = issues.knownMissingImports.length;

  console.log(`\n🔍 Static Analysis Report`);
  console.log(`   Files scanned: ${filesScanned}`);
  console.log("");

  // New missing imports (real issues)
  if (newCount > 0) {
    console.log(`❌ Missing Imports (${newCount} NEW):`);
    console.log(`   These functions are called but not imported or defined locally:\n`);
    for (const issue of issues.missingImports) {
      console.log(`   • ${issue.file}:${issue.line}  →  ${issue.name}()`);
    }
    console.log("");
  } else {
    console.log(`✅ Missing Imports: 0 new issues`);
  }

  // Known missing imports (tracked)
  if (knownCount > 0) {
    if (showAll) {
      console.log(`📋 Known Missing Imports (${knownCount} tracked, not errors):`);
      console.log(`   Pre-existing from global-to-module migration:\n`);
      for (const issue of issues.knownMissingImports) {
        console.log(`   • ${issue.file}:${issue.line}  →  ${issue.name}()`);
      }
    } else {
      console.log(`📋 Known Missing Imports: ${knownCount} tracked (use --all to show)`);
    }
    console.log("");
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
  const totalIssues = newCount +
    issues.windowAssignments.length +
    issues.firestoreRefs.length;

  console.log(`\n${"═".repeat(60)}`);
  if (totalIssues === 0) {
    console.log(`✅ ALL CLEAN — No new issues found.`);
    if (knownCount > 0) {
      console.log(`   ${knownCount} known issue(s) tracked (from migration).`);
    }
  } else {
    console.log(`❌ ${totalIssues} new issue(s) found. See details above.`);
    if (knownCount > 0) {
      console.log(`   + ${knownCount} known issue(s) tracked (from migration).`);
    }
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
const showAll = args.includes("--all");

if (!fs.existsSync(JS_ROOT)) {
  console.error(`❌ JS root not found: ${JS_ROOT}`);
  process.exit(1);
}

const { issues, filesScanned } = analyze(showAll);
const totalIssues = printReport(issues, filesScanned, verbose, json, showAll);

process.exit(totalIssues > 0 ? 1 : 0);
