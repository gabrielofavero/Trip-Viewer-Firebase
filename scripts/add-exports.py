#!/usr/bin/env python3
"""
======= Export Adder (Phase 1 of import fix) =======

Finds functions and variables that are used by other files but never
exported, and adds the `export` keyword to their definitions.

Run this BEFORE fix-imports.py when symbols are defined but not exported.

Usage:
    python scripts/check-cross-module-refs.py --json > issues.json
    python scripts/add-exports.py issues.json [--dry-run] [--verbose]
    python scripts/check-cross-module-refs.py --json > issues.json
    python scripts/fix-imports.py issues.json
"""

import os
import re
import sys
import json
import argparse
from pathlib import Path
from collections import defaultdict
from typing import Optional

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
JS_ROOT = PROJECT_ROOT / "public" / "assets" / "js"


def find_definition(rel_path: str, symbol: str) -> Optional[tuple[int, str]]:
    """Find where a symbol is defined in a file.
    Returns (line_number, definition_kind) or None."""
    abs_path = JS_ROOT / rel_path
    try:
        lines = abs_path.read_text(encoding='utf-8').split('\n')
    except Exception:
        return None

    patterns = [
        # async function name / function name (not already exported)
        (re.compile(r'^\s*function\s+' + re.escape(symbol) + r'\b'), 'function'),
        (re.compile(r'^\s*async\s+function\s+' + re.escape(symbol) + r'\b'), 'function'),
        # var/let/const name = ... (not already exported)
        (re.compile(r'^\s*var\s+' + re.escape(symbol) + r'\b'), 'var'),
        (re.compile(r'^\s*let\s+' + re.escape(symbol) + r'\b'), 'var'),
        (re.compile(r'^\s*const\s+' + re.escape(symbol) + r'\b'), 'var'),
    ]

    for i, line in enumerate(lines):
        for pat, kind in patterns:
            if pat.search(line) and 'export' not in line:
                return (i, kind)
    return None


def add_export_to_line(line: str, kind: str) -> str:
    """Add 'export ' prefix to a definition line."""
    stripped = line.lstrip()
    indent = line[:len(line) - len(stripped)]
    if kind == 'function':
        if stripped.startswith('async '):
            return indent + 'export async ' + stripped[6:]
        return indent + 'export ' + stripped
    elif kind == 'var':
        return indent + 'export ' + stripped
    return line


def main():
    parser = argparse.ArgumentParser(description="Add export to cross-module symbols")
    parser.add_argument('issues_json', help='Path to JSON issues file')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--verbose', '-v', action='store_true')
    args = parser.parse_args()

    try:
        issues = json.loads(Path(args.issues_json).read_text(encoding='utf-8'))
    except Exception as e:
        print(f"❌ Could not read issues file: {e}", file=sys.stderr)
        sys.exit(2)

    # Collect all symbols that need exporting, grouped by defining file
    # For "missing-import" issues: the symbol is not imported, find where it's defined
    # For "undefined-reference" issues: the symbol is not imported, find where it's defined

    symbols_to_export: dict[str, set[tuple[str, str]]] = defaultdict(set)
    # key: defining_file -> set of (symbol, kind)

    # First, build a map of where each symbol is defined across all files
    print(f"🔍 Scanning all JS files for symbol definitions...")
    all_definitions: dict[str, list[tuple[str, str, int]]] = defaultdict(list)
    # symbol -> [(file, kind, line), ...]

    for root, dirs, files in os.walk(JS_ROOT):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for fname in files:
            if not fname.endswith('.js'):
                continue
            filepath = Path(root) / fname
            try:
                lines = filepath.read_text(encoding='utf-8').split('\n')
            except Exception:
                continue
            rel_path = str(filepath.relative_to(JS_ROOT)).replace('\\', '/')

            for i, line in enumerate(lines):
                stripped = line.strip()
                if 'export' in stripped:
                    continue

                # function name / async function name
                m = re.match(r'(?:async\s+)?function\s+(\w+)', stripped)
                if m:
                    all_definitions[m.group(1)].append((rel_path, 'function', i))
                    continue

                # var/let/const name
                m = re.match(r'(?:var|let|const)\s+(\w+)', stripped)
                if m:
                    all_definitions[m.group(1)].append((rel_path, 'var', i))

    print(f"   Found {len(all_definitions)} unique symbol names across files")

    # For each issue, find where the symbol is defined and mark it for export
    for issue in issues:
        symbol = issue['symbol']
        file = issue['file']

        if symbol not in all_definitions:
            continue

        # Find the definition that's NOT in the same file (cross-module)
        for def_file, kind, line in all_definitions[symbol]:
            if def_file != file:
                symbols_to_export[def_file].add((symbol, kind))
                break  # Only need one definition

    if not symbols_to_export:
        print("\n✅ No symbols need exporting — all cross-module symbols already exported.")
        return

    print(f"\n📋 {len(symbols_to_export)} files need exports added for cross-module symbols.\n")

    if args.dry_run:
        print("⚠ DRY RUN — no files will be modified\n")

    stats = {'fixed': 0, 'errors': 0}

    for def_file, symbols in sorted(symbols_to_export.items()):
        abs_path = JS_ROOT / def_file
        try:
            lines = abs_path.read_text(encoding='utf-8').split('\n')
        except Exception:
            print(f"  ❌ {def_file}: could not read")
            stats['errors'] += 1
            continue

        modified = False
        for symbol, kind in sorted(symbols):
            result = find_definition(def_file, symbol)
            if result is None:
                if args.verbose:
                    print(f"  ⚠ {def_file}: '{symbol}' — definition not found (may already be exported)")
                continue

            line_idx, found_kind = result
            old_line = lines[line_idx]
            new_line = add_export_to_line(old_line, found_kind)
            lines[line_idx] = new_line
            modified = True
            stats['fixed'] += 1
            if args.verbose:
                print(f"  ✅ {def_file}:{line_idx+1} — added export to {found_kind} '{symbol}'")

        if modified and not args.dry_run:
            abs_path.write_text('\n'.join(lines), encoding='utf-8')

    print(f"\n{'='*60}")
    print(f"📊 EXPORT SUMMARY:")
    print(f"   Exports added: {stats['fixed']}")
    print(f"   Errors:        {stats['errors']}")
    print(f"{'='*60}")

    if stats['fixed'] > 0 and not args.dry_run:
        print("\n✅ Now re-run check-cross-module-refs.py and fix-imports.py")


if __name__ == '__main__':
    main()
