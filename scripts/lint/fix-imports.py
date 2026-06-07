#!/usr/bin/env python3
"""
======= Automated Import Fixer =======

Reads the JSON output from check-cross-module-refs.py and automatically
fixes all resolvable issues by adding missing imports.

For each issue:
  - Finds which file exports the needed symbol
  - Adds the import to the file that needs it
  - Merges with existing imports from the same module when possible

Usage:
    python scripts/lint/check-cross-module-refs.py --json > issues.json
    python scripts/lint/fix-imports.py issues.json [--dry-run] [--verbose]

Exit code: 0 if all fixable issues resolved, 1 if some couldn't be fixed.
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
PROJECT_ROOT = SCRIPT_DIR.parent.parent
JS_ROOT = PROJECT_ROOT / "public" / "assets" / "js"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def resolve_import_path(from_rel: str, import_spec: str) -> str:
    """Resolve a relative import path to canonical form."""
    from_dir = os.path.dirname(from_rel)
    resolved = os.path.normpath(os.path.join(from_dir, import_spec))
    if not resolved.endswith('.js'):
        resolved += '.js'
    return resolved.replace('\\', '/')


def compute_import_spec(from_rel: str, to_rel: str) -> str:
    """Compute the relative import specifier from from_rel to to_rel."""
    from_dir = os.path.dirname(from_rel)
    rel = os.path.relpath(to_rel, from_dir).replace('\\', '/')
    if not rel.startswith('.'):
        rel = './' + rel
    # Remove .js extension for the import specifier
    if rel.endswith('.js'):
        rel = rel[:-3]
    return rel


def read_file_lines(rel_path: str) -> list[str]:
    """Read a file and return its lines."""
    abs_path = JS_ROOT / rel_path
    try:
        return abs_path.read_text(encoding='utf-8').split('\n')
    except Exception:
        return []


def write_file_lines(rel_path: str, lines: list[str]):
    """Write lines back to a file."""
    abs_path = JS_ROOT / rel_path
    abs_path.write_text('\n'.join(lines), encoding='utf-8')


def find_import_line(lines: list[str], module_spec: str) -> Optional[int]:
    """Find the line number (0-based) of an existing import from module_spec.
    Returns None if no existing import from that module."""
    # Normalize the module spec for comparison
    spec_pattern = module_spec.replace('.', r'\.')
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('import ') and 'from' in stripped:
            # Extract the module path
            m = re.search(r'from\s+[\'"]([^\'"]+)[\'"]', stripped)
            if m:
                existing_spec = m.group(1)
                # Compare resolved paths
                if existing_spec == module_spec:
                    return i
    return None


def add_import_to_line(line: str, symbol: str) -> str:
    """Add a symbol to an existing import statement's named imports.
    E.g., 'import { a, b } from "..."' -> 'import { a, b, symbol } from "..."'
    """
    # Find the opening brace
    m = re.search(r'import\s*\{([^}]*)\}\s*from', line)
    if not m:
        return line  # Can't handle non-named imports

    existing_names = m.group(1)
    # Parse existing names
    names = [n.strip() for n in existing_names.split(',') if n.strip()]
    if symbol in names:
        return line  # Already imported

    # Check if we need to add a line break (long imports)
    if len(','.join(names)) > 60:
        # Multi-line format
        new_import = line.replace(
            '{' + existing_names + '}',
            '{\n' + ',\n'.join('  ' + n for n in names) + ',\n  ' + symbol + '\n}'
        )
    else:
        new_import = line.replace(
            '{' + existing_names + '}',
            '{' + ', '.join(names + [symbol]) + '}'
        )
    return new_import


def create_import_line(symbol: str, module_spec: str) -> str:
    """Create a new import statement line."""
    return f'import {{ {symbol} }} from "{module_spec}";'


def find_insert_position(lines: list[str]) -> int:
    """Find the best position to insert a new import line (after last import)."""
    last_import = -1
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith('import ') and 'from' in stripped:
            last_import = i
        elif stripped.startswith('import ') and 'from' not in stripped:
            last_import = i
    return last_import + 1 if last_import >= 0 else 0


# ---------------------------------------------------------------------------
# Cross-reference builder (reuses logic from check-cross-module-refs.py)
# ---------------------------------------------------------------------------

def build_exports_map(js_root: Path) -> dict[str, set[str]]:
    """Build a map of file -> set of exported symbol names.
    Parses export statements from all .js files under js_root."""
    exports: dict[str, set[str]] = defaultdict(set)

    for root, dirs, files in os.walk(js_root):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for fname in files:
            if not fname.endswith('.js'):
                continue
            filepath = Path(root) / fname
            try:
                content = filepath.read_text(encoding='utf-8')
            except Exception:
                continue
            rel_path = str(filepath.relative_to(js_root)).replace('\\', '/')

            # Parse exports
            for m in re.finditer(
                r'export\s+(?:(?:async\s+)?function\s+(\w+)|'
                r'(?:const|let|var)\s+(\w+)|'
                r'class\s+(\w+))',
                content
            ):
                name = m.group(1) or m.group(2) or m.group(3)
                if name:
                    exports[rel_path].add(name)

            # export { a, b }
            for m in re.finditer(r'export\s*\{([^}]*)\}', content):
                for name in re.findall(r'\b(\w+)\b', m.group(1)):
                    exports[rel_path].add(name)

    return dict(exports)


# ---------------------------------------------------------------------------
# Main fixer logic
# ---------------------------------------------------------------------------

def fix_issues(issues: list[dict], exports_map: dict[str, set[str]], dry_run: bool = False, verbose: bool = False) -> dict:
    """Fix all resolvable issues. Returns stats."""
    stats = {'fixed': 0, 'skipped_no_source': 0, 'skipped_already_imported': 0, 'errors': 0}

    # Filter to missing-import issues only (most actionable)
    missing = [i for i in issues if i['type'] == 'missing-import']

    # Also handle undefined-reference issues that have suggestions
    undef_with_suggestions = [
        i for i in issues
        if i['type'] == 'undefined-reference' and i.get('suggestion')
    ]

    all_fixable = missing + undef_with_suggestions

    # Group fixes by (file, module_to_import_from) to batch them
    # This way we add multiple symbols to one import line
    fixes_by_file: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))

    for issue in all_fixable:
        file = issue['file']
        symbol = issue['symbol']

        # For missing imports: find source
        if issue['type'] == 'missing-import':
            # Find which file exports this symbol
            sources = [f for f, exps in exports_map.items() if symbol in exps and f != file]
            if not sources:
                stats['skipped_no_source'] += 1
                if verbose:
                    print(f"  ⚠ {file}:{issue['line']} — '{symbol}' not exported by any file")
                continue
            # Pick the best (shortest relative path) source
            best_source = min(sources, key=lambda s: len(
                os.path.relpath(s, os.path.dirname(file)).replace('\\', '/')
            ))
            import_spec = compute_import_spec(file, best_source)
            fixes_by_file[file][import_spec].add(symbol)

        # For undefined references with suggestion
        elif issue['type'] == 'undefined-reference' and issue.get('suggestion'):
            suggestion = issue['suggestion']
            # The suggestion is already a relative import path like './foo.js'
            # Remove .js extension for the import specifier
            if suggestion.endswith('.js'):
                suggestion = suggestion[:-3]
            fixes_by_file[file][suggestion].add(symbol)

    # Apply fixes
    for file, module_imports in sorted(fixes_by_file.items()):
        lines = read_file_lines(file)
        if not lines:
            if verbose:
                print(f"  ❌ {file}: could not read file")
            stats['errors'] += 1
            continue

        modified = False
        for module_spec, symbols in sorted(module_imports.items()):
            existing_line = find_import_line(lines, module_spec)

            if existing_line is not None:
                # Add to existing import
                old_line = lines[existing_line]
                new_line = old_line
                for sym in sorted(symbols):
                    new_line = add_import_to_line(new_line, sym)
                if new_line != old_line:
                    lines[existing_line] = new_line
                    modified = True
                    if verbose:
                        print(f"  ✅ {file}: added {symbols} to existing import from '{module_spec}'")
            else:
                # Create new import line
                insert_pos = find_insert_position(lines)
                for sym in sorted(symbols):
                    new_import = create_import_line(sym, module_spec)
                    lines.insert(insert_pos, new_import)
                    insert_pos += 1
                    modified = True
                    if verbose:
                        print(f"  ✅ {file}: added import {{ {sym} }} from '{module_spec}'")

        if modified:
            stats['fixed'] += len(symbols) if 'symbols' in dir() else 1
            if not dry_run:
                write_file_lines(file, lines)
            else:
                if verbose:
                    print(f"  📝 {file}: would write changes (dry-run)")

    return stats


def main():
    parser = argparse.ArgumentParser(description="Automated import fixer")
    parser.add_argument('issues_json', help='Path to JSON issues file from check-cross-module-refs.py')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be changed without applying')
    parser.add_argument('--verbose', '-v', action='store_true', help='Show detailed fix information')
    args = parser.parse_args()

    # Load issues
    try:
        issues = json.loads(Path(args.issues_json).read_text(encoding='utf-8'))
    except Exception as e:
        print(f"❌ Could not read issues file: {e}", file=sys.stderr)
        sys.exit(2)

    print(f"📋 Loaded {len(issues)} issues from {args.issues_json}")

    # Build exports map
    print(f"🔍 Building exports map from {JS_ROOT}...")
    exports_map = build_exports_map(JS_ROOT)
    print(f"   Found {len(exports_map)} files with exports")

    if args.dry_run:
        print("\n⚠ DRY RUN — no files will be modified\n")

    # Fix issues
    stats = fix_issues(issues, exports_map, dry_run=args.dry_run, verbose=args.verbose)

    # Summary
    print(f"\n{'='*60}")
    print(f"📊 FIX SUMMARY:")
    print(f"   Fixed:               {stats['fixed']}")
    print(f"   Skipped (no source): {stats['skipped_no_source']}")
    print(f"   Errors:              {stats['errors']}")
    print(f"{'='*60}")

    if stats['skipped_no_source'] > 0:
        print("\n⚠ Some symbols are not exported from any file.")
        print("  These need 'export' added to their source files first.")
        print("  Then re-run this script.")

    sys.exit(0 if stats['errors'] == 0 else 1)


if __name__ == '__main__':
    main()
