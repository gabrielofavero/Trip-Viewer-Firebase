#!/usr/bin/env python3
"""
======= Cross-Module Reference Checker =======

Scans all .js files under public/assets/js/ and reports:

  1. BROKEN IMPORT PATHS (File Not Found)
     Relative import paths that don't resolve to any existing file.
     These cause "disallowed MIME type (text/html)" errors at runtime
     because the browser receives a 404 HTML page instead of JS.

  2. ASSIGNMENT TO UNDECLARED VARIABLE (Strict Mode Error)
     Assignments to variables never declared with var/let/const and never
     imported. In ES modules (always strict mode), this throws:
     ReferenceError: assignment to undeclared variable X

  3. UNDEFINED VARIABLE REFERENCES
     Variables used via bracket/dot access (e.g., `VAR[...]`, `VAR.prop`)
     that are never defined locally or imported. In ES modules, top-level
     `var` is module-scoped — not global. Causes ReferenceError at runtime.

  3. FUNCTIONS/VARIABLES CALLED BUT NOT IMPORTED
     Symbols called as functions (e.g., `name(...)`) that are neither:
     - Defined locally (function, var, let, const)
     - Imported via ES import
     - A known browser/JS global

  4. FUNCTIONS THAT SHOULD BE EXPORTED
     Symbols defined in a file that are imported by other files,
     but are NOT exported (missing `export` keyword).

  5. MODIFYING IMPORTED VARIABLES (Read-Only Error)
     ES module imports are live read-only bindings. Assigning to an
     imported binding (e.g., `importedVar = ...`) is a runtime error.

Usage:
    python scripts/lint/check-cross-module-refs.py [--verbose] [--json]

Exit code: 0 if clean, 1 if issues found.
"""

import os
import re
import sys
import json
import argparse
from pathlib import Path
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

# ---------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
JS_ROOT = PROJECT_ROOT / "public" / "assets" / "js"

EXCLUDE_DIRS = set()
EXCLUDE_FILES = set()

# Known browser/JS globals that don't need imports
BROWSER_GLOBALS = {
    # Common callback parameter names
    "fn", "callback", "done", "next", "resolve", "reject",
    "action", "check", "build", "batch", "task", "constructor",

    # Core JS
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

    # Browser / DOM
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

    # Module-level built-ins
    "crypto", "structuredClone",

    # Node.js globals (build scripts)
    "require", "module", "exports", "__dirname", "__filename", "process",
    "Buffer", "global", "globalThis",
    "undefined", "NaN", "Infinity",
    "new", "delete", "typeof", "instanceof", "void", "this", "super",
    "async", "await", "yield", "arguments",
}

# Known vendor/library globals loaded via <script> tags (not ES imports)
VENDOR_GLOBALS = {
    "firebase", "firestore",
    "$", "jQuery",
    "bootstrap",
    "AOS", "Swiper", "GLightbox", "Isotope", "Typed", "Waypoint",
    "Iconify",
    "google",
    "gsap", "ScrollTrigger", "Lenis", "imagesLoaded", "Macy",
    "Granim", "VanillaTilt", "Lightbox",
    "Chart",
    "moment",
    "L", "leaflet",
    "Sortable",
    "ClipboardItem",
}

ALL_GLOBALS = BROWSER_GLOBALS | VENDOR_GLOBALS

# Common callback/parameter names that get called
CALLBACK_NAMES = {
    "customFunction", "hoverFn", "onStartFunc", "onEndFunc",
    "afterAction", "addFn", "applyPreference", "applyContent",
    "applyExpenses", "embedAfterLoadAction", "restoreOnFileSelectionAction",
    "visibilityListenerAction", "sendHeightMessageToParent",
    "transportationAddListenerAction", "accommodationsAddListenerAction",
    "galeriaAdicionarListenerAction",
}

# Common single-letter / short parameter names used in arrow functions and callbacks.
# These are almost always locally scoped (function params), not globals or imports.
COMMON_PARAM_NAMES = {
    # Single letters (common in .map(), .filter(), .sort(), .forEach())
    "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
    "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z",
    # Short common param names
    "el", "fn", "cb", "id", "ev", "ok", "no",
    # DOM event handlers
    "evt", "event",
    # Common iteration params
    "key", "val", "idx", "arr", "obj", "res", "src", "dst", "acc", "cur",
    "item", "elem", "node", "child", "self",
    # Error params
    "err", "error", "e",
    # Sort comparators
    "a", "b",
}

# Words that look like function calls but are actually labels, properties, or keywords
NOT_FUNCTION_CALLS = {
    "if", "else", "for", "while", "do", "switch", "case", "break", "continue",
    "return", "throw", "try", "catch", "finally", "class", "extends",
    "import", "export", "default", "from", "as",
    "true", "false", "null", "undefined", "NaN", "Infinity",
    "function", "var", "let", "const", "static", "get", "set",
    # CSS functions that may appear in JS template literals
    "url", "inset", "blocked", "translateX",
}

# ── Known pre-existing issues (suppressed; tracked for cleanup) ──
# Format: { "relative/path.js": {"symbol1", "symbol2"} }
# When these get proper imports, remove them from this list.

KNOWN_MISSING_IMPORTS = {
    "app/main.js": {"LOCAL"},
    "data/firebase/auth.js": {"openIndexPage", "unsubscribe"},
    "data/firebase/database.js": {"overwrite"},
    "data/firebase/storage.js": {"getLastDir", "getStorageErrorMessage", "deleteImageByLink"},
    "models/destination.model.js": {"getPriceBuckets"},
    "models/itinerary.model.js": {"getTurno", "getScheduleTitle"},
    "models/trip.model.js": {"getFormattedDate"},
    "pages/destination/categories.js": {"getPlannedDestinations"},
    "pages/destination/destination.js": {
        "getTripData", "loadPlannedDestination", "loadActiveCategory",
        "loadDestinationVisibility", "applyDestinationsMediaHeight", "adjustMediaEmbeds",
        "getDestinationsHTML", "loadEmbed", "loadSortAndFilter", "adjustInstagramMedia",
        "adjustEditVisibility", "restoreIfEditing", "adjustDrawer", "unloadMedias",
        "unloadMedia", "loadMedia", "updateActiveCategory",
    },
    "pages/destination/edit-destination.js": {
        "getDestinationID", "getEditHTML", "populatePlannedDestinationEditField",
        "getDestinationsHTML", "openDestinationsAccordion", "processAccordion",
        "getItem", "setPlannedDestination", "refreshTripData", "refreshDestination",
        "getPlanejado", "getDestinationsAccordionBodyHTML", "getItemFromJ",
    },
    "pages/destination/support/content.js": {"getPlanejado"},
    "pages/destination/support/media-embed.js": {"getSystemWidth"},
    "pages/destination/support/visibility.js": {"adjustEditVisibility"},
    "pages/destination/support/sort-and-filter/filter.js": {
        "getFilterPreferences", "shouldDisplayPlanned", "shouldDisplayPrices",
        "shouldDisplayScores", "shouldDisplayRegions", "getItem", "applyContent",
        "isPlanned", "loadFilterSortingData", "getPrices", "openFilterSortDrawer",
    },
    "pages/destination/support/sort-and-filter/sort-and-filter.js": {
        "loadFilterOptions", "loadSortOptions", "sort", "filter", "getDataSet",
        "getPriceBuckets", "isDrawerOpen", "closeDrawer", "openDrawer", "getInnerHTML",
        "getPrices",
    },
    "pages/destination/support/sort-and-filter/sort.js": {
        "getSortPreferences", "getItem", "applyContent", "isPlanned",
        "loadFilterSortingData", "shouldDisplayScores", "shouldDisplayPlanned",
        "shouldDisplayPrices", "openFilterSortDrawer",
    },
    "pages/destination/support/sort-and-filter/support/drawer.js": {
        "getFilterPreferences", "getSortPreferences", "filter", "sort", "applyPreference",
    },
    "pages/destination/support/sort-and-filter/support/price-bucket.js": {"getDataSet"},
    "pages/edit-destination/edit-destination.js": {
        "addRestaurantes", "addLanches", "addSaidas", "addTurismo", "addLojas",
        "setDocumento", "loadCurrencySelects", "loadDestinationsData",
        "emojisOnInputAction", "getDescription", "addDestino", "addDestinoHTML",
        "setDescription", "updateDescriptionButtonLabel",
    },
    "pages/edit-destination/existing-destination.js": {
        "loadMoedaOptions", "setDescription", "updateDescriptionButtonLabel",
        "addRestaurantes", "addLanches", "addSaidas", "addTurismo", "addLojas",
        "loadMoedaValorAndVisibility",
    },
    "pages/edit-destination/import-destination.js": {
        "loadMoedaValorAndVisibility", "setDescription", "updateDestinationsTitle",
        "updateDescriptionButtonLabel", "addFn",
    },
    "pages/edit-destination/new-destination.js": {
        "loadCurrencySelects", "addDestinationsListeners", "addListenerToRemoveDestination",
    },
    "pages/edit-destination/set-destination.js": {"getDescription"},
    "pages/edit-listing/edit-listing.js": {
        "loadDestinations", "loadUploadSelector", "autoFillDarkColor", "loadListData",
        "buildCompartilhamentoObject", "buildDestinosArray", "buildImagemObject",
        "buildLinksObject", "setDocumento",
    },
    "pages/edit-listing/existing-listing.js": {"loadCustomizacaoData", "loadDestinationsData"},
    "pages/edit-trip/categories/accommodation.js": {"addHospedagens"},
    "pages/edit-trip/categories/basic-data/set-protected-data.js": {"getNewPinObject", "isDataUnprotected"},
    "pages/edit-trip/categories/destination.js": {"loadItineraryListeners"},
    "pages/edit-trip/categories/expenses.js": {"getSharingObject", "getTravelersObject"},
    "pages/edit-trip/categories/gallery.js": {"addGaleria"},
    "pages/edit-trip/categories/transportation.js": {"addTransportation"},
    "pages/edit-trip/categories/travelers.js": {"loadItineraryData"},
    "pages/edit-trip/categories/itinerary-module/inner-itinerary/inner-itinerary.js": {
        "getInnerProgramacaoContent", "getActiveDestinations", "enableAllTravelersFieldset",
        "getDataSelectOptions", "getDestinosFromCheckbox", "updateTravelersFieldset",
        "loadTextReplacementCheckboxes", "replaceTextIfEnabled", "replaceTimeIfEnabled",
        "validateTravelersFieldset", "getCheckedTravelersIDs",
    },
    "pages/edit-trip/set-trip.js": {
        "addSetResponse",  # called at line 227, definition never created
    },
}

KNOWN_SHOULD_EXPORT = {}

KNOWN_MODIFYING_IMPORTS = {}

# ── Known broken import paths (suppressed; tracked for cleanup) ──
# Format: { "importing/file.js": { ("broken/path.js", line_number), ... } }
# When the import path is fixed, remove it from this list.
KNOWN_BROKEN_IMPORTS: dict[str, set[tuple[str, int]]] = {}


# ================================================================
# Data structures
# ================================================================

@dataclass
class ImportInfo:
    """Represents a single import specifier."""
    name: str           # local name (binding name in this module)
    source: str         # original name in source module (for named imports)
    module: str         # the module path this is imported from
    kind: str           # 'named', 'default', 'namespace', 'side-effect'
    line: int


@dataclass
class ExportInfo:
    """Represents a single export."""
    name: str           # exported name
    kind: str           # 'named', 'default', 'declaration'
    line: int
    is_default: bool = False


@dataclass
class DefinitionInfo:
    """Represents a local definition (function, var, let, const, class)."""
    name: str
    kind: str           # 'function', 'var', 'let', 'const', 'class'
    line: int


@dataclass
class UsageInfo:
    """Represents a usage of a symbol (call or reference)."""
    name: str
    line: int
    is_call: bool       # True if it looks like a function call: name(...)


@dataclass
class AssignmentInfo:
    """Represents an assignment to a variable."""
    name: str           # the target of assignment
    line: int
    is_reassignment: bool  # True if =, +=, -=, etc. (not just declaration)


@dataclass
class FileAnalysis:
    """All extracted info for a single file."""
    rel_path: str               # relative path from JS_ROOT
    abs_path: str               # absolute path
    imports: list[ImportInfo] = field(default_factory=list)
    exports: list[ExportInfo] = field(default_factory=list)
    definitions: list[DefinitionInfo] = field(default_factory=list)
    usages: list[UsageInfo] = field(default_factory=list)
    assignments: list[AssignmentInfo] = field(default_factory=list)
    references: list[UsageInfo] = field(default_factory=list)  # bracket/dot access refs
    re_exports: list[ImportInfo] = field(default_factory=list)  # export { x } from '...'


# ================================================================
# Parser
# ================================================================

# Regex patterns
# Match import statements (multi-line aware)
RE_IMPORT_BLOCK = re.compile(
    r'import\s+(?:'
    r'(?:\{([^}]*)\}\s*from\s*[\'"]([^\'"]+)[\'"])|'           # import { a, b } from '...'
    r'(?:(.+?)\s+from\s*[\'"]([^\'"]+)[\'"])|'                  # import defaultExport, { ... } from '...' or import * as ns from '...'
    r'([\'"]([^\'"]+)[\'"])'                                     # import '...' (side-effect)
    r')',
    re.DOTALL,
)

RE_IMPORT_DEFAULT = re.compile(r'import\s+(\w+)\s+from\s*[\'"]([^\'"]+)[\'"]')
RE_IMPORT_NAMESPACE = re.compile(r'import\s*\*\s*as\s+(\w+)\s+from\s*[\'"]([^\'"]+)[\'"]')
RE_IMPORT_NAMED = re.compile(r'import\s*\{([^}]*)\}\s*from\s*[\'"]([^\'"]+)[\'"]')
RE_IMPORT_SIDE_EFFECT = re.compile(r'import\s*[\'"]([^\'"]+)[\'"]\s*;?')
RE_IMPORT_DEFAULT_WITH_NAMED = re.compile(
    r'import\s+(\w+)\s*,\s*\{([^}]*)\}\s*from\s*[\'"]([^\'"]+)[\'"]'
)

# Match export statements
RE_EXPORT_NAMED = re.compile(r'export\s*\{([^}]*)\}')  # export { a, b }
RE_EXPORT_NAMED_FROM = re.compile(r'export\s*\{([^}]*)\}\s*from\s*[\'"]([^\'"]+)[\'"]')  # export { a } from '...'
RE_EXPORT_DEFAULT = re.compile(r'export\s+default\s+(?:function\s+(\w+)|class\s+(\w+)|(\w+))')
RE_EXPORT_DECLARATION = re.compile(
    r'export\s+(?:(?:async\s+)?function\s+(\w+)|(?:const|let|var)\s+(\w+)|class\s+(\w+))'
)
RE_EXPORT_DEFAULT_EXPR = re.compile(r'export\s+default\s+(\w+)\s*;?')

# Match local definitions
RE_FUNCTION_DEF = re.compile(
    r'(?:^|\n)\s*(?:static\s+)?(?:async\s+)?function\s+(\w+)', re.MULTILINE
)
RE_VAR_DEF = re.compile(r'(?:^|\n)\s*(?:var|let|const)\s+(\w+)', re.MULTILINE)
RE_CLASS_DEF = re.compile(r'(?:^|\n)\s*class\s+(\w+)', re.MULTILINE)
RE_ARROW_ASSIGN = re.compile(
    r'(?:^|\n)\s*(?:var|let|const)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[\w]+)\s*=>',
    re.MULTILINE,
)
RE_DESTRUCTURING = re.compile(
    r'(?:^|\n)\s*(?:var|let|const)\s*\{([^}]+)\}\s*=',
    re.MULTILINE,
)

# Match function calls: identifier followed by (
RE_FUNCTION_CALL = re.compile(r'(?<![.\'"\w])(\w+)\s*\(')

# Match property accesses: obj.prop (to exclude from function calls in some cases)
RE_PROPERTY_CALL = re.compile(r'(?:\w+)\.(\w+)\s*\(')

# Match assignments to simple identifiers
RE_ASSIGNMENT = re.compile(
    r'(?<![.\w])(\w+)\s*(?:=|\+=|-=|\*=|/=|%=|\*\*=|<<=|>>=|>>>=|&&=|\|\|=|\?\?=)\s*[^=]',
)

# Match for...of / for...in loop variables and catch parameters
RE_FOR_OF = re.compile(r'for\s*(?:await\s*)?\(\s*(?:var|let|const)\s+(\w+)')
RE_FOR_IN = re.compile(r'for\s*\(\s*(?:var|let|const)\s+(\w+)\s+in')
# Bare for...in / for...of (missing let/const/var — causes ReferenceError in strict mode)
RE_BARE_FOR_IN_OF = re.compile(r'for\s*(?:await\s*)?\(\s*(\w+)\s+(in|of)\s')
RE_CATCH_PARAM = re.compile(r'catch\s*\(\s*(\w+)\s*\)')

# Match function parameters (first level only — captures param names)
RE_FUNC_PARAMS = re.compile(
    r'function\s+\w+\s*\(([^)]*)\)|\(\s*\{([^}]+)\}\s*\)\s*=>|\(\s*(\w+(?:\s*,\s*\w+)*)\s*\)\s*=>'
)

# Match class methods
RE_CLASS_METHOD = re.compile(r'(?:^|\n)\s*(?:static\s+)?(?:async\s+)?(\w+)\s*\(', re.MULTILINE)

# Match `import.meta` references (not a function call)
RE_IMPORT_META = re.compile(r'import\s*\.\s*meta')

# ── Variable reference detection (non-call, non-assignment usage) ──
# These catch patterns like `VARIABLE[...]` and `VARIABLE.prop` where
# VARIABLE is used but never defined/imported (common in script→module conversion bugs).

# Match identifier followed by `[` — bracket access base:  VARIABLE[...
# Excludes: keyword prefixes (if, for, while, etc.), property accesses (obj.VARIABLE[...])
RE_BRACKET_REF = re.compile(r'(?<![.\w])([a-zA-Z_]\w*)\s*\[')

# Match identifier followed by `.` — dot access base:  VARIABLE.prop
# Excludes: keyword prefixes, digits, and common JS globals like console, document, Math
RE_DOT_REF = re.compile(r'(?<![.\w])([a-zA-Z_]\w*)\s*\.')

# Match identifier used as property value in object literal:  key: NAME,  or  key: NAME}
# These are often callback references (e.g., onEnd: afterDragInnerItinerary)
RE_PROPERTY_VALUE_REF = re.compile(r':\s*([a-zA-Z_]\w+)\s*[,}]')


# ── Known undefined variable references (suppressed; tracked for cleanup) ──
# Format: { \"importing/file.js\": { (\"symbol_name\", line_number), ... } }
# When the variable is properly imported/exported, remove from this list.
KNOWN_UNDEFINED_REFS: dict[str, set[tuple[str, int]]] = {}


def collapse_multiline_statements(content: str) -> str:
    """Join multi-line import/export statements into single lines for easier parsing.
    
    Only collapses when the line is clearly continued (ends with comma, or is inside braces).
    Does NOT collapse lines that end with ';' or '}' (complete statements).
    A line ending with '{' is only complete if it also contains 'function' or 'class'.
    """
    result = []
    lines = content.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        # Only collapse import/export statements
        is_import_or_export = stripped.startswith('import ') or stripped.startswith('export ')
        # A line ending with '{' is a function/class body start (complete) only if it
        # contains 'function' or 'class'; otherwise '{' is a destructuring brace (incomplete)
        last_char = stripped.rstrip()[-1] if stripped.rstrip() else ''
        if last_char == '{' and ('function' in stripped or 'class' in stripped):
            has_terminator = True
        elif last_char in ';}' :
            has_terminator = True
        else:
            has_terminator = False
        has_from = 'from' in stripped
        
        if is_import_or_export and not has_terminator and not has_from:
            joined = line
            i += 1
            while i < len(lines):
                next_line = lines[i]
                next_stripped = next_line.strip()
                joined += ' ' + next_stripped
                if 'from' in next_line or next_stripped.rstrip().endswith(';') or \
                   next_stripped.rstrip().endswith('}') or next_stripped.rstrip().endswith('{'):
                    break
                i += 1
            result.append(joined)
        else:
            result.append(line)
        i += 1
    return '\n'.join(result)


def parse_imports(content: str, line_offset: int = 0) -> list[ImportInfo]:
    """Parse all import statements from file content (handles multi-line)."""
    imports = []
    # Pre-process: collapse multi-line import statements
    collapsed = collapse_multiline_statements(content)
    lines = collapsed.split('\n')

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped.startswith('import '):
            continue

        lineno = i + 1 + line_offset

        # import defaultExport, { named } from '...'
        m = RE_IMPORT_DEFAULT_WITH_NAMED.search(stripped)
        if m:
            imports.append(ImportInfo(
                name=m.group(1), source='default', module=m.group(3),
                kind='default', line=lineno,
            ))
            named_part = m.group(2)
            for spec in parse_named_imports(named_part):
                imports.append(ImportInfo(
                    name=spec['local'], source=spec['source'], module=m.group(3),
                    kind='named', line=lineno,
                ))
            continue

        # import { a, b } from '...'
        m = RE_IMPORT_NAMED.search(stripped)
        if m:
            module = m.group(2)
            for spec in parse_named_imports(m.group(1)):
                imports.append(ImportInfo(
                    name=spec['local'], source=spec['source'], module=module,
                    kind='named', line=lineno,
                ))
            continue

        # import * as ns from '...'
        m = RE_IMPORT_NAMESPACE.search(stripped)
        if m:
            imports.append(ImportInfo(
                name=m.group(1), source='*', module=m.group(2),
                kind='namespace', line=lineno,
            ))
            continue

        # import defaultExport from '...'
        m = RE_IMPORT_DEFAULT.search(stripped)
        if m:
            imports.append(ImportInfo(
                name=m.group(1), source='default', module=m.group(2),
                kind='default', line=lineno,
            ))
            continue

        # import '...' (side-effect only)
        m = RE_IMPORT_SIDE_EFFECT.search(stripped)
        if m:
            imports.append(ImportInfo(
                name='', source='', module=m.group(1),
                kind='side-effect', line=lineno,
            ))
            continue

    return imports


def parse_named_imports(named_str: str) -> list[dict]:
    """Parse a named import clause like 'a, b as c, d'."""
    specs = []
    # Handle multi-line
    named_str = named_str.replace('\n', ' ').replace('\r', '')
    for part in named_str.split(','):
        part = part.strip()
        if not part:
            continue
        if ' as ' in part:
            source, local = part.split(' as ', 1)
            specs.append({'source': source.strip(), 'local': local.strip()})
        else:
            name = part.strip()
            if name:
                specs.append({'source': name, 'local': name})
    return specs


def parse_exports(content: str) -> list[ExportInfo]:
    """Parse all export statements from file content."""
    exports = []
    collapsed = collapse_multiline_statements(content)
    lines = collapsed.split('\n')

    for i, line in enumerate(lines):
        stripped = line.strip()
        if not stripped.startswith('export '):
            continue
        lineno = i + 1

        # export { a } from '...' — re-export (track separately so cross-ref can follow chains)
        m = RE_EXPORT_NAMED_FROM.search(stripped)
        if m:
            # These are re-exports; the symbols are available from this file
            # but originated elsewhere. Still mark as exports for cross-ref.
            for name in parse_export_names(m.group(1)):
                exports.append(ExportInfo(name=name, kind='named', line=lineno))
            continue

        # export { a, b } (from local definitions)
        m = RE_EXPORT_NAMED.search(stripped)
        if m and 'from' not in stripped:
            for name in parse_export_names(m.group(1)):
                exports.append(ExportInfo(name=name, kind='named', line=lineno))
            continue

        # export default function name / class name / expression
        m = RE_EXPORT_DEFAULT.search(stripped)
        if m:
            name = m.group(1) or m.group(2)
            if name:
                exports.append(ExportInfo(name=name, kind='declaration', line=lineno, is_default=True))
            else:
                # export default identifier;
                expr_m = RE_EXPORT_DEFAULT_EXPR.search(stripped)
                if expr_m:
                    exports.append(ExportInfo(
                        name=expr_m.group(1), kind='named', line=lineno, is_default=True,
                    ))
            continue

        # export function/const/let/var/class name
        m = RE_EXPORT_DECLARATION.search(stripped)
        if m:
            name = m.group(1) or m.group(2) or m.group(3)
            if name:
                exports.append(ExportInfo(name=name, kind='declaration', line=lineno))

    return exports


def parse_export_names(names_str: str) -> list[str]:
    """Parse 'a, b as c, d' → ['a', 'b', 'd'] (only local names)."""
    result = []
    names_str = names_str.replace('\n', ' ').replace('\r', '')
    for part in names_str.split(','):
        part = part.strip()
        if not part:
            continue
        if ' as ' in part:
            # For local exports: export { localName as exportedName } — we care about exported name
            local, exported = part.split(' as ', 1)
            result.append(exported.strip())
        else:
            result.append(part.strip())
    return result


def parse_definitions(content: str) -> list[DefinitionInfo]:
    """Parse local variable/function/class definitions (including exported ones)
    AND function parameters (which are locally scoped)."""
    definitions = []
    lines = content.split('\n')

    for i, line in enumerate(lines):
        lineno = i + 1

        # Strip 'export' prefix to also match exported declarations
        stripped = re.sub(r'^\s*export\s+', '', line)

        # async function name / function name
        m = RE_FUNCTION_DEF.search(stripped)
        if m:
            name = m.group(1)
            definitions.append(DefinitionInfo(name=name, kind='function', line=lineno))
            # Also extract parameters from this function
            params = _extract_params_from_line(line, lines, i)
            for p in params:
                definitions.append(DefinitionInfo(name=p, kind='var', line=lineno))
            continue

        # var/let/const name (handle comma-separated: let a, b, c = 1)
        m = RE_VAR_DEF.search(stripped)
        if m and not re.search(r'(?:var|let|const)\s*[{\[]', stripped):
            # Get the full declaration clause after var/let/const
            decl_match = re.search(r'(?:var|let|const)\s+(.+?)(?:=|;|\n)', stripped)
            if decl_match:
                decl_part = decl_match.group(1)
                for part in decl_part.split(','):
                    name = part.strip().split('=')[0].strip()
                    if name and not name.startswith('[') and not name.startswith('{'):
                        definitions.append(DefinitionInfo(name=name, kind='var', line=lineno))
            else:
                name = m.group(1)
                definitions.append(DefinitionInfo(name=name, kind='var', line=lineno))
            continue

        # class name
        m = RE_CLASS_DEF.search(stripped)
        if m:
            name = m.group(1)
            definitions.append(DefinitionInfo(name=name, kind='class', line=lineno))
            continue

        # Destructuring: const { a, b } = ...
        m = RE_DESTRUCTURING.search(stripped)
        if m:
            for name in parse_named_imports(m.group(1)):
                definitions.append(DefinitionInfo(
                    name=name['local'], kind='var', line=lineno,
                ))

    # ── Also extract arrow-function constants as definitions ──
    # const name = (...) => { ... }
    for m in RE_ARROW_ASSIGN.finditer(content):
        name = m.group(1)
        lineno = content[:m.start()].count('\n') + 1
        definitions.append(DefinitionInfo(name=name, kind='var', line=lineno))
        # Extract params from arrow function
        params_str = m.group(0)
        params = _extract_arrow_params(params_str)
        for p in params:
            definitions.append(DefinitionInfo(name=p, kind='var', line=lineno))

    # ── Extract params from all function declarations (including those missed above) ──
    for m in re.finditer(
        r'(?:function\s+\w+|\(\s*(?:[\w\s,{}]*)\s*\)\s*=>)\s*\(([^)]*)\)',
        content,
    ):
        params_str = m.group(1)
        for p in re.split(r'\s*,\s*', params_str):
            p = p.strip()
            if p and re.match(r'^\w+$', p):
                lineno = content[:m.start()].count('\n') + 1
                definitions.append(DefinitionInfo(name=p, kind='var', line=lineno))

    # ── Extract params from inline arrow functions:  .method(param => ...)  ──
    # Matches patterns like:  .map(t =>    .forEach(x =>    .some(v =>
    # Also matches:  .method((a, b) =>    .method(({x, y}) =>
    for m in re.finditer(
        r'(?:\W)([a-zA-Z_]\w*)\s*=>', content
    ):
        param = m.group(1)
        if param not in NOT_FUNCTION_CALLS and param not in ALL_GLOBALS:
            lineno = content[:m.start()].count('\n') + 1
            definitions.append(DefinitionInfo(name=param, kind='var', line=lineno))
    # Also match:  .method((a, b) =>    .method((a) =>
    for m in re.finditer(
        r'\(\s*([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*\)\s*=>', content
    ):
        params_str = m.group(1)
        for p in re.split(r'\s*,\s*', params_str):
            p = p.strip()
            if p and p not in NOT_FUNCTION_CALLS and p not in ALL_GLOBALS:
                lineno = content[:m.start()].count('\n') + 1
                definitions.append(DefinitionInfo(name=p, kind='var', line=lineno))

    # ── Extract destructured function params:  { a, b = default }  ──
    # These create local bindings that shadow any imports
    for m in re.finditer(
        r'\{\s*([a-zA-Z_]\w*(?:\s*=\s*[^,}]+)?(?:\s*,\s*[a-zA-Z_]\w*(?:\s*=\s*[^,}]+)?)*)\s*\}',
        content
    ):
        params_str = m.group(1)
        for part in re.split(r'\s*,\s*', params_str):
            # Strip default values:  name = "value"  ->  name
            name = re.split(r'\s*=\s*', part.strip())[0].strip()
            if name and re.match(r'^[a-zA-Z_]\w*$', name):
                if name not in NOT_FUNCTION_CALLS and name not in ALL_GLOBALS:
                    lineno = content[:m.start()].count('\n') + 1
                    definitions.append(DefinitionInfo(name=name, kind='var', line=lineno))

    # ── Extract for...of / for...in loop variables ──
    for m in RE_FOR_OF.finditer(content):
        lineno = content[:m.start()].count('\n') + 1
        definitions.append(DefinitionInfo(name=m.group(1), kind='var', line=lineno))
    for m in RE_FOR_IN.finditer(content):
        lineno = content[:m.start()].count('\n') + 1
        definitions.append(DefinitionInfo(name=m.group(1), kind='var', line=lineno))
    # Catch params
    for m in RE_CATCH_PARAM.finditer(content):
        lineno = content[:m.start()].count('\n') + 1
        definitions.append(DefinitionInfo(name=m.group(1), kind='var', line=lineno))

    return definitions


def _extract_params_from_line(line: str, lines: list[str], idx: int) -> list[str]:
    """Extract parameter names from a function declaration spanning potentially multiple lines."""
    # Join lines until we find the closing paren of the parameter list
    joined = line
    if '(' in joined and ')' not in joined.split('(')[-1] if '(' in joined else True:
        j = idx + 1
        while j < len(lines) and ')' not in joined.split('(')[-1] if '(' in joined else True:
            joined += ' ' + lines[j]
            j += 1
    # Extract text between first ( and matching )
    match = re.search(r'\(([^)]*)\)', joined)
    if match:
        params_str = match.group(1)
        params = []
        for p in params_str.split(','):
            p = p.strip()
            # Handle destructured params: { a, b } — extract inner names
            if p.startswith('{') and p.endswith('}'):
                inner = p[1:-1]
                for name in re.findall(r'\b(\w+)\b', inner):
                    if name not in NOT_FUNCTION_CALLS:
                        params.append(name)
            elif p and re.match(r'^\w+$', p):
                params.append(p)
        return params
    return []


def _extract_arrow_params(text: str) -> list[str]:
    """Extract parameter names from an arrow function expression."""
    # Match const name = (params) => or const name = param =>
    m = re.search(r'=\s*(?:async\s*)?(?:\(([^)]*)\)|(\w+))\s*=>', text)
    if m:
        params_str = m.group(1) or m.group(2) or ''
        params = []
        for p in params_str.split(','):
            p = p.strip()
            if p.startswith('{') and p.endswith('}'):
                inner = p[1:-1]
                for name in re.findall(r'\b(\w+)\b', inner):
                    if name not in NOT_FUNCTION_CALLS:
                        params.append(name)
            elif p and re.match(r'^\w+$', p):
                params.append(p)
        return params
    return []


def parse_usages(content: str) -> list[UsageInfo]:
    """Parse standalone function calls (not method calls on objects).
    
    Only matches: functionName(...)
    Does NOT match: obj.method(...), import.meta, new ClassName(...), method definitions
    """
    usages = []

    # Remove strings and comments to avoid false positives
    clean_content = remove_strings_and_comments(content)

    for m in RE_FUNCTION_CALL.finditer(clean_content):
        name = m.group(1)
        if name in NOT_FUNCTION_CALLS:
            continue
        if name in ALL_GLOBALS:
            continue

        # Find the matching closing paren to check if this is a definition (followed by {)
        pos = m.end()
        depth = 1
        while pos < len(clean_content) and depth > 0:
            ch = clean_content[pos]
            if ch == '(':
                depth += 1
            elif ch == ')':
                depth -= 1
            pos += 1

        # Skip if next non-whitespace char after closing paren is '{' (function/method definition)
        while pos < len(clean_content) and clean_content[pos] in ' \t':
            pos += 1
        if pos < len(clean_content) and clean_content[pos] == '{':
            continue

        # Get line number by counting newlines up to match start
        lineno = clean_content[:m.start()].count('\n') + 1
        usages.append(UsageInfo(name=name, line=lineno, is_call=True))

    return usages


def parse_assignments(content: str) -> list[AssignmentInfo]:
    """Parse assignments to simple identifiers (potential import modification or
    undeclared variable). Also catches bare for...in / for...of loop variables
    (missing let/const/var), which cause ReferenceError in strict mode."""
    assignments = []
    clean_content = remove_strings_and_comments(content)

    for m in RE_ASSIGNMENT.finditer(clean_content):
        name = m.group(1)
        if name in NOT_FUNCTION_CALLS or name in ALL_GLOBALS:
            continue
        lineno = clean_content[:m.start()].count('\n') + 1
        assignments.append(AssignmentInfo(name=name, line=lineno, is_reassignment=True))

    # ── Bare for...in / for...of loop variables (missing let/const/var) ──
    for m in RE_BARE_FOR_IN_OF.finditer(clean_content):
        name = m.group(1)
        if name in NOT_FUNCTION_CALLS or name in ALL_GLOBALS:
            continue
        lineno = clean_content[:m.start()].count('\n') + 1
        assignments.append(AssignmentInfo(name=name, line=lineno, is_reassignment=True))

    return assignments


def remove_strings_and_comments(content: str) -> str:
    """Remove string literals and comments to avoid false positives.
    
    Preserves code inside template literal expressions ${...} so function
    calls and variable references within them are still detected.
    """
    # Remove single-line comments
    result = re.sub(r'//[^\n]*', '', content)
    # Remove multi-line comments
    result = re.sub(r'/\*.*?\*/', '', result, flags=re.DOTALL)

    # ── Handle template literals: preserve ${...} expressions ──
    # Extract all ${...} blocks from template literals and append them
    # so they're still scanned for function calls and references
    template_expressions = []
    for m in re.finditer(r'\$\{([^}]*)\}', result):
        template_expressions.append(m.group(1))
    # Now remove template literals (backtick-delimited strings)
    result = re.sub(r'`[^`]*`', '``', result, flags=re.DOTALL)
    # Append extracted template expressions so they're still analyzed
    if template_expressions:
        result += '\n' + ';\n'.join(template_expressions) + ';\n'

    # Remove string literals
    result = re.sub(r"'[^']*'", "''", result)
    result = re.sub(r'"[^"]*"', '""', result)
    return result


def parse_file(filepath: Path) -> Optional[FileAnalysis]:
    """Parse a single JS file and return its analysis."""
    try:
        content = filepath.read_text(encoding='utf-8')
    except Exception as e:
        print(f"  ⚠ Could not read {filepath}: {e}", file=sys.stderr)
        return None

    rel_path = str(filepath.relative_to(JS_ROOT)).replace('\\', '/')

    fa = FileAnalysis(
        rel_path=rel_path,
        abs_path=str(filepath),
        imports=parse_imports(content),
        exports=parse_exports(content),
        definitions=parse_definitions(content),
        usages=parse_usages(content),
        assignments=parse_assignments(content),
        references=parse_references(content),
    )

    return fa


# ================================================================
# Resolution helpers
# ================================================================

def resolve_import_path(from_rel: str, import_spec: str) -> Optional[str]:
    """Resolve a relative import path to a canonical relative path from JS_ROOT."""
    if import_spec.startswith('.'):
        from_dir = os.path.dirname(from_rel)
        resolved = os.path.normpath(os.path.join(from_dir, import_spec))
        # Add .js extension if missing
        if not resolved.endswith('.js'):
            resolved += '.js'
        return resolved.replace('\\', '/')
    return None  # Not a local module import


def build_cross_reference(analyses: dict[str, FileAnalysis]) -> dict:
    """Build cross-reference data: what each file exports and what imports point to it."""
    # Map: canonical_path -> set of exported names
    file_exports: dict[str, set[str]] = defaultdict(set)

    # Map: (canonical_path, export_name) -> list of (importing_file, import_line)
    importers: dict[tuple[str, str], list[tuple[str, int]]] = defaultdict(list)

    for fa in analyses.values():
        for exp in fa.exports:
            file_exports[fa.rel_path].add(exp.name)

    for fa in analyses.values():
        for imp in fa.imports:
            resolved = resolve_import_path(fa.rel_path, imp.module)
            if resolved and resolved in analyses:
                name = imp.source
                if imp.kind == 'default':
                    name = 'default'
                elif imp.kind == 'namespace':
                    name = '*'
                importers[(resolved, name)].append((fa.rel_path, imp.line))

    return {
        'exports': dict(file_exports),
        'importers': dict(importers),
    }


# ================================================================
# Issue detectors
# ================================================================

def find_missing_imports(analyses: dict[str, FileAnalysis]) -> list[dict]:
    """
    Find function calls / variable usages where the symbol is:
    - Not defined locally in the file
    - Not imported by the file
    - Not a known global
    """
    issues = []

    for fa in analyses.values():
        # Collect all locally available names
        local_names: set[str] = set()
        for d in fa.definitions:
            local_names.add(d.name)
        for imp in fa.imports:
            local_names.add(imp.name)
        # Also collect function parameter names (rough: names in function signatures)
        # ... skip for now, handled by CALLBACK_NAMES and global excludes

        known_missing = KNOWN_MISSING_IMPORTS.get(fa.rel_path, set())

        for usage in fa.usages:
            name = usage.name
            if name in local_names:
                continue
            if name in ALL_GLOBALS:
                continue
            if name in CALLBACK_NAMES:
                continue
            if name in known_missing:
                continue
            # Skip names that start with capital letter and might be class/constructor refs
            # (handled by BROWSER_GLOBALS check already)

            issues.append({
                'type': 'missing-import',
                'file': fa.rel_path,
                'line': usage.line,
                'symbol': name,
                'is_call': usage.is_call,
            })

    return issues


def parse_references(content: str) -> list[UsageInfo]:
    """Parse variable references (bracket access and dot access bases) that are NOT
    function calls. These catch patterns like `VARIABLE[...]` and `VARIABLE.prop`
    where VARIABLE must be in scope.
    
    Excludes:
    - Identifiers preceded by `.` (property of something else)
    - Keywords (if, for, while, etc.)
    - Known globals
    """
    refs = []
    clean = remove_strings_and_comments(content)

    # ── Bracket access:  VARIABLE[  (not preceded by .) ──
    for m in RE_BRACKET_REF.finditer(clean):
        name = m.group(1)
        if name in NOT_FUNCTION_CALLS:
            continue
        if name in ALL_GLOBALS:
            continue
        lineno = clean[:m.start()].count('\n') + 1
        refs.append(UsageInfo(name=name, line=lineno, is_call=False))

    # ── Dot access:  VARIABLE.prop  (not preceded by .) ──
    for m in RE_DOT_REF.finditer(clean):
        name = m.group(1)
        if name in NOT_FUNCTION_CALLS:
            continue
        if name in ALL_GLOBALS:
            continue
        # Exclude: obj.VARIABLE.prop (VARIABLE is a property, not base)
        start = m.start()
        if start > 0 and clean[start - 1] == '.':
            continue
        lineno = clean[:start].count('\n') + 1
        refs.append(UsageInfo(name=name, line=lineno, is_call=False))

    # ── Property value refs:  key: NAME,  or  key: NAME}  (callback references) ──
    for m in RE_PROPERTY_VALUE_REF.finditer(clean):
        name = m.group(1)
        if name in NOT_FUNCTION_CALLS:
            continue
        if name in ALL_GLOBALS:
            continue
        if name in COMMON_PARAM_NAMES:
            continue
        # Exclude common literals that look like identifiers
        if name in ('true', 'false', 'null', 'undefined', 'NaN', 'Infinity'):
            continue
        lineno = clean[:m.start()].count('\n') + 1
        refs.append(UsageInfo(name=name, line=lineno, is_call=False))

    return refs


def find_undefined_references(analyses: dict[str, FileAnalysis], xref: dict) -> list[dict]:
    """Find variables that are referenced (bracket/dot access) but never
    defined locally or imported. These cause ReferenceError at runtime
    in ES modules (top-level var is module-scoped, not global).
    
    Uses a pragmatic heuristic: if an identifier appears ANYWHERE in the
    file as a standalone name (not followed by `[`, `.`, or `(`), it's
    likely defined locally (var, param, import, etc.) and is NOT flagged.
    Only identifiers that appear exclusively in bracket/dot access patterns
    are flagged as potential undefined cross-module references.
    """
    issues = []

    for fa in analyses.values():
        # Collect locally available names from imports and explicit definitions
        local_names: set[str] = set()
        for d in fa.definitions:
            local_names.add(d.name)
        for imp in fa.imports:
            local_names.add(imp.name)

        try:
            content = Path(fa.abs_path).read_text(encoding='utf-8')
        except Exception:
            continue

        # ── Heuristic: find all identifiers used standalone in the file ──
        # A standalone identifier is one that appears as a word NOT followed by
        # `(`, `[`, `.`, or `:` (label). These are likely local vars/params/imports.
        clean = remove_strings_and_comments(content)
        standalone_ids: set[str] = set()
        for m in re.finditer(r'(?<![.\w])([a-zA-Z_]\w+)(?![(\[\.:=])', clean):
            name = m.group(1)
            if name not in NOT_FUNCTION_CALLS and name not in ALL_GLOBALS:
                standalone_ids.add(name)

        # Combine: imports + explicit defs + standalone heuristic = likely locals
        # But first, remove property-value refs from the heuristic only
        # (they might be cross-module callback references like `onEnd: fn`)
        for m in RE_PROPERTY_VALUE_REF.finditer(clean):
            name = m.group(1)
            if name not in NOT_FUNCTION_CALLS:
                standalone_ids.discard(name)

        all_likely_locals = local_names | standalone_ids

        known_undefined = KNOWN_UNDEFINED_REFS.get(fa.rel_path, set())

        for ref in fa.references:
            name = ref.name
            if name in all_likely_locals:
                continue
            if name in ALL_GLOBALS:
                continue
            if name in COMMON_PARAM_NAMES:
                continue
            if (name, ref.line) in known_undefined:
                continue

            issues.append({
                'type': 'undefined-reference',
                'file': fa.rel_path,
                'line': ref.line,
                'symbol': name,
                'suggestion': _suggest_export_source(fa.rel_path, name, xref['exports']),
            })

    return issues


def _suggest_export_source(from_rel: str, symbol: str, file_exports: dict) -> Optional[str]:
    """Find which file exports the given symbol and suggest an import path."""
    exporters = [
        f for f, exports in file_exports.items()
        if symbol in exports and f != from_rel
    ]
    if not exporters:
        return None
    from_dir = os.path.dirname(from_rel)
    best = min(exporters, key=lambda e: len(
        os.path.relpath(e, from_dir).replace('\\', '/')
    ))
    rel = os.path.relpath(best, from_dir).replace('\\', '/')
    if not rel.startswith('.'):
        rel = './' + rel
    return rel


def find_missing_exports(analyses: dict[str, FileAnalysis], xref: dict) -> list[dict]:
    """
    Find symbols that are imported from a file but are NOT exported by that file.
    
    Also find: symbols defined in a file that are used by other files
    (via import) but were never exported.
    """
    issues = []
    file_exports = xref['exports']
    importers = xref['importers']

    for fa in analyses.values():
        for imp in fa.imports:
            if imp.kind == 'side-effect':
                continue
            if imp.kind == 'namespace':
                continue  # import * as ns — can't check individual members

            resolved = resolve_import_path(fa.rel_path, imp.module)
            if not resolved or resolved not in analyses:
                continue  # Not a local module

            name = imp.source
            if imp.kind == 'default':
                name = 'default'

            target_exports = file_exports.get(resolved, set())

            if name not in target_exports:
                known = KNOWN_SHOULD_EXPORT.get(resolved, set())
                if name in known:
                    continue

                issues.append({
                    'type': 'should-export',
                    'file': resolved,
                    'line': 0,
                    'symbol': name,
                    'imported_by': fa.rel_path,
                    'import_line': imp.line,
                })

    return issues


def find_broken_imports(analyses: dict[str, FileAnalysis]) -> list[dict]:
    """
    Find relative import paths that do NOT resolve to an existing file.
    
    This catches the most common source of "disallowed MIME type (text/html)"
    errors at runtime — the browser tries to load a .js file, gets a 404
    HTML page, and blocks the import.
    
    Common patterns detected:
      - Wrong number of ../ segments (e.g., ../../set-trip.js vs ../set-trip.js)
      - Missing subdirectory (e.g., ../categories/ vs ./categories/)
      - Typo in path (e.g., ../view/ when the dir is ../trip-detail/)
      - File moved to a subdirectory (e.g., ./inner-itinerary.js vs ./inner-itinerary/inner-itinerary.js)
    """
    issues = []

    for fa in analyses.values():
        known_broken = KNOWN_BROKEN_IMPORTS.get(fa.rel_path, set())

        for imp in fa.imports:
            if imp.kind == 'side-effect':
                # Side-effect imports can have no file (e.g., import './styles.css')
                # Still check them — if the path doesn't resolve, it's still broken
                pass

            # Only check relative imports
            if not imp.module.startswith('.'):
                continue

            # Resolve the path
            from_dir = os.path.dirname(fa.rel_path)
            resolved = os.path.normpath(os.path.join(from_dir, imp.module))
            if not resolved.endswith('.js'):
                resolved += '.js'
            resolved = resolved.replace('\\', '/')

            # Check if the resolved file exists in our analysis
            if resolved not in analyses:
                # Also check on disk (in case file exists but wasn't parsed)
                resolved_abs = JS_ROOT / resolved
                if resolved_abs.exists():
                    continue  # File exists on disk, just wasn't in analysis

                # Check suppression list
                if (imp.module, imp.line) in known_broken:
                    continue

                # Generate suggestion: find closest matching file
                suggestion = _suggest_import_fix(fa.rel_path, imp.module, from_dir, analyses)

                issues.append({
                    'type': 'broken-import',
                    'file': fa.rel_path,
                    'line': imp.line,
                    'import_path': imp.module,
                    'resolved_to': resolved,
                    'suggestion': suggestion,
                })

    return issues


def _suggest_import_fix(
    from_rel: str, import_spec: str, from_dir: str, analyses: dict[str, FileAnalysis]
) -> Optional[str]:
    """Suggest the correct import path by searching for the target filename."""
    # Extract the target filename (last component of the import path)
    target_filename = os.path.basename(import_spec)
    if not target_filename.endswith('.js'):
        target_filename += '.js'

    # Find all files in the analysis that end with this name
    candidates = [p for p in analyses if p.endswith('/' + target_filename) or p == target_filename]

    if not candidates:
        return None

    # For each candidate, compute what the relative import would be from from_dir
    suggestions = []
    for candidate in candidates:
        # Compute relative path from from_dir to candidate
        try:
            rel = os.path.relpath(candidate, from_dir).replace('\\', '/')
            if not rel.startswith('.'):
                rel = './' + rel
            suggestions.append(rel)
        except ValueError:
            pass

    if not suggestions:
        return None

    # Return the shortest suggestion (usually the most correct)
    suggestions.sort(key=len)
    return suggestions[0] if suggestions else None


def find_import_modifications(analyses: dict[str, FileAnalysis]) -> list[dict]:
    """
    Find assignments to imported bindings (which would cause
    a runtime TypeError: Assignment to constant variable).
    
    Only flag direct assignments (x = ...), not property mutations (x.prop = ...).
    Skips assignments when the variable is locally redeclared (shadowing the import).
    """
    issues = []

    for fa in analyses.values():
        # Build set of imported names (only named imports are at risk)
        imported_names: dict[str, ImportInfo] = {}
        for imp in fa.imports:
            if imp.kind == 'named':
                imported_names[imp.name] = imp

        # Build set of locally redeclared names (shadows the import)
        local_redeclared: set[str] = set()
        for d in fa.definitions:
            if d.name in imported_names:
                local_redeclared.add(d.name)

        known_modifying = KNOWN_MODIFYING_IMPORTS.get(fa.rel_path, set())

        for assign in fa.assignments:
            name = assign.name
            if name not in imported_names:
                continue
            if name in known_modifying:
                continue

            # Skip if locally redeclared (e.g., let isAlreadyLoading shadows the import)
            if name in local_redeclared:
                continue

            # Check if this is actually a declaration (let/const/var x = ...)
            imp = imported_names[name]
            if assign.line == imp.line:
                continue

            issues.append({
                'type': 'modifying-import',
                'file': fa.rel_path,
                'line': assign.line,
                'symbol': name,
                'imported_from': imp.module,
                'import_line': imp.line,
            })

    return issues


def find_undeclared_assignments(analyses: dict[str, FileAnalysis]) -> list[dict]:
    """Find assignments to variables that are never declared (var/let/const)
    and never imported. In ES modules (strict mode), this throws:
        ReferenceError: assignment to undeclared variable X
    
    Uses explicit definitions + a restricted standalone heuristic that
    excludes assignment targets (identifiers followed by `=`).
    """
    issues = []

    for fa in analyses.values():
        local_names: set[str] = set()
        for d in fa.definitions:
            local_names.add(d.name)
        for imp in fa.imports:
            local_names.add(imp.name)

        try:
            content = Path(fa.abs_path).read_text(encoding='utf-8')
        except Exception:
            continue
        clean = remove_strings_and_comments(content)
        for m in re.finditer(r'(?<![.\w])([a-zA-Z_]\w+)(?![(\[\.:=])', clean):
            name = m.group(1)
            if name not in NOT_FUNCTION_CALLS and name not in ALL_GLOBALS:
                local_names.add(name)

        # Remove bare for...in / for...of variables
        for m in RE_BARE_FOR_IN_OF.finditer(clean):
            name = m.group(1)
            local_names.discard(name)

        for assign in fa.assignments:
            name = assign.name
            if name in local_names:
                continue
            if name in ALL_GLOBALS:
                continue
            if name in NOT_FUNCTION_CALLS:
                continue
            if name in COMMON_PARAM_NAMES:
                continue

            issues.append({
                'type': 'undeclared-assignment',
                'file': fa.rel_path,
                'line': assign.line,
                'symbol': name,
            })

    return issues

    return issues


# ================================================================
# Output formatters
# ================================================================

def format_issues(issues: list[dict], verbose: bool = False) -> str:
    """Format issues for human-readable output."""
    if not issues:
        return ""

    # Group by type
    by_type = defaultdict(list)
    for issue in issues:
        by_type[issue['type']].append(issue)

    lines = []
    total = len(issues)

    # ── Missing imports ──
    missing = by_type.get('missing-import', [])
    if missing:
        lines.append(f"\n{'='*60}")
        lines.append(f"🔴 FUNCTIONS/VARIABLES CALLED BUT NOT IMPORTED ({len(missing)} issues)")
        lines.append(f"{'='*60}")
        # Group by file
        by_file = defaultdict(list)
        for m in missing:
            by_file[m['file']].append(m)
        for file, items in sorted(by_file.items()):
            lines.append(f"\n  📄 {file}")
            for item in items:
                suffix = "()" if item['is_call'] else ""
                lines.append(f"     Line {item['line']:>4}: {item['symbol']}{suffix}")

    # ── Undefined references ──
    undef = by_type.get('undefined-reference', [])
    if undef:
        lines.append(f"\n{'='*60}")
        lines.append(f"🔴 UNDEFINED VARIABLE REFERENCES ({len(undef)} issues)")
        lines.append(f"{'='*60}")
        lines.append(f"   Variables used (bracket/dot access) but never defined or imported.")
        lines.append(f"   Likely from script→module conversion: top-level `var` is module-scoped.\n")
        by_file = defaultdict(list)
        for ur in undef:
            by_file[ur['file']].append(ur)
        for file, items in sorted(by_file.items()):
            lines.append(f"  📄 {file}")
            for item in items:
                lines.append(
                    f"     Line {item['line']:>4}: '{item['symbol']}' — used but not defined or imported"
                )
                if item.get('suggestion'):
                    lines.append(
                        f"            💡 import {{ {item['symbol']} }} from '{item['suggestion']}'"
                    )

    # ── Should export ──
    should_export = by_type.get('should-export', [])
    if should_export:
        lines.append(f"\n{'='*60}")
        lines.append(f"🟡 FUNCTIONS THAT SHOULD BE EXPORTED ({len(should_export)} issues)")
        lines.append(f"{'='*60}")
        by_file = defaultdict(list)
        for se in should_export:
            by_file[se['file']].append(se)
        for file, items in sorted(by_file.items()):
            lines.append(f"\n  📄 {file}")
            for item in items:
                lines.append(
                    f"     '{item['symbol']}' — imported by {item['imported_by']} "
                    f"(line {item['import_line']})"
                )

    # ── Broken imports ──
    broken = by_type.get('broken-import', [])
    if broken:
        lines.append(f"\n{'='*60}")
        lines.append(f"🔴 BROKEN IMPORT PATHS — FILE NOT FOUND ({len(broken)} issues)")
        lines.append(f"{'='*60}")
        lines.append(f"   These imports will cause 'disallowed MIME type' errors at runtime.")
        lines.append(f"   The browser gets a 404 HTML page instead of JavaScript.\n")
        by_file = defaultdict(list)
        for bi in broken:
            by_file[bi['file']].append(bi)
        for file, items in sorted(by_file.items()):
            lines.append(f"  📄 {file}")
            for item in items:
                lines.append(
                    f"     Line {item['line']:>4}: import from '{item['import_path']}'"
                )
                lines.append(
                    f"            resolves to '{item['resolved_to']}' — NOT FOUND"
                )
                if item.get('suggestion'):
                    lines.append(
                        f"            💡 did you mean: '{item['suggestion']}' ?"
                    )

    # ── Undeclared assignments ──
    undeclared = by_type.get('undeclared-assignment', [])
    if undeclared:
        lines.append(f"\n{'='*60}")
        lines.append(f"🔴 ASSIGNMENT TO UNDECLARED VARIABLE ({len(undeclared)} issues)")
        lines.append(f"{'='*60}")
        lines.append(f"   In ES modules (strict mode), assigning to an undeclared variable")
        lines.append(f"   throws: ReferenceError: assignment to undeclared variable X\n")
        by_file = defaultdict(list)
        for ua in undeclared:
            by_file[ua['file']].append(ua)
        for file, items in sorted(by_file.items()):
            lines.append(f"  📄 {file}")
            for item in items:
                lines.append(
                    f"     Line {item['line']:>4}: '{item['symbol']}' — assigned but never declared"
                )

    # ── Modifying imports ──
    modifying = by_type.get('modifying-import', [])
    if modifying:
        lines.append(f"\n{'='*60}")
        lines.append(f"🔴 MODIFYING IMPORTED VARIABLES — READ-ONLY ERROR ({len(modifying)} issues)")
        lines.append(f"{'='*60}")
        by_file = defaultdict(list)
        for mi in modifying:
            by_file[mi['file']].append(mi)
        for file, items in sorted(by_file.items()):
            lines.append(f"\n  📄 {file}")
            for item in items:
                lines.append(
                    f"     Line {item['line']:>4}: '{item['symbol']}' assigned — "
                    f"imported from '{item['imported_from']}' (line {item['import_line']})"
                )

    # ── Summary ──
    lines.append(f"\n{'='*60}")
    lines.append(f"📊 SUMMARY: {total} total issue(s) found")
    lines.append(f"   Broken imports:       {len(broken)}")
    lines.append(f"   Undeclared assignments:{len(undeclared)}")
    lines.append(f"   Undefined refs:       {len(undef)}")
    lines.append(f"   Missing imports:      {len(missing)}")
    lines.append(f"   Should export:        {len(should_export)}")
    lines.append(f"   Modifying imports:    {len(modifying)}")
    lines.append(f"{'='*60}")

    return '\n'.join(lines)


def format_issues_json(issues: list[dict]) -> str:
    """Format issues as JSON."""
    return json.dumps(issues, indent=2)


# ================================================================
# Main
# ================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Cross-module reference checker for JS files"
    )
    parser.add_argument(
        '--verbose', '-v', action='store_true',
        help='Show detailed output including file-by-file analysis',
    )
    parser.add_argument(
        '--json', '-j', action='store_true',
        help='Output results as JSON',
    )
    args = parser.parse_args()

    if not JS_ROOT.exists():
        print(f"❌ JS root not found: {JS_ROOT}", file=sys.stderr)
        sys.exit(2)

    # ── Collect all JS files ──
    js_files = []
    for root, dirs, files in os.walk(JS_ROOT):
        # Skip excluded dirs
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        rel_root = os.path.relpath(root, JS_ROOT)
        for fname in files:
            if fname in EXCLUDE_FILES:
                continue
            if fname.endswith('.js'):
                js_files.append(Path(root) / fname)

    print(f"🔍 Scanning {len(js_files)} JS files in {JS_ROOT}...", file=sys.stderr)

    # ── Parse all files ──
    analyses: dict[str, FileAnalysis] = {}
    for fp in sorted(js_files):
        fa = parse_file(fp)
        if fa:
            analyses[fa.rel_path] = fa

    print(f"✅ Parsed {len(analyses)} files successfully.", file=sys.stderr)

    # ── Build cross-reference ──
    xref = build_cross_reference(analyses)

    if args.verbose:
        print(f"\n📦 Cross-reference: {len(xref['exports'])} files export symbols", file=sys.stderr)
        for file, exports in sorted(xref['exports'].items()):
            if exports:
                print(f"   {file}: exports {sorted(exports)}", file=sys.stderr)

    # ── Detect issues ──
    all_issues = []
    all_issues.extend(find_broken_imports(analyses))
    all_issues.extend(find_undeclared_assignments(analyses))
    all_issues.extend(find_undefined_references(analyses, xref))
    all_issues.extend(find_missing_imports(analyses))
    all_issues.extend(find_missing_exports(analyses, xref))
    all_issues.extend(find_import_modifications(analyses))

    # ── Output ──
    if args.json:
        print(format_issues_json(all_issues))
    else:
        output = format_issues(all_issues, verbose=args.verbose)
        if output:
            print(output)
        else:
            print("\n✅ No cross-module reference issues found!")

    # ── Exit code ──
    if all_issues:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == '__main__':
    main()
