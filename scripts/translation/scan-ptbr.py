#!/usr/bin/env python3
"""
scan-ptbr.py — Scan TypeScript files for residual Portuguese (pt-BR) words.

Reads translations/translations.json for the known PT-BR → EN mapping,
then scans all .ts files under public/assets/ts for occurrences of those
Portuguese words.  Generates a detailed report with file, line number,
matched word, and the full line content.

Supports an ignore file (scripts/scan-ptbr-ignore.json) to permanently
suppress specific matches that have been reviewed and won't be fixed.

By default, the scan skips:
  - Words that are identical in PT-BR and English (e.g., "link", "instagram").
  - Occurrences inside "was" annotations (intentional migration comments).
Use --strict to include everything, or --include-was to include "was" lines.

Usage:
    python scripts/translation/scan-ptbr.py                 # default: skip identical + was
    python scripts/translation/scan-ptbr.py --strict        # include EVERYTHING
    python scripts/translation/scan-ptbr.py --include-was   # include was comments
    python scripts/translation/scan-ptbr.py --summary       # counts only, no line details
    python scripts/translation/scan-ptbr.py --json          # machine-readable JSON to stdout
    python scripts/translation/scan-ptbr.py --json --save   # write JSON to report file
"""

import json
import re
import sys
import os
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Optional

# ---------------------------------------------------------------------------
# Paths (relative to project root)
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent.parent
TRANSLATIONS_PATH = Path(__file__).resolve().parent / "references" / "translations.json"
CONFLICTS_PATH = Path(__file__).resolve().parent / "references" / "conflicts.md"
TS_DIR = ROOT / "public" / "assets" / "ts"
IGNORE_PATH = Path(__file__).resolve().parent / "scan-ptbr-ignore.json"
REPORT_PATH = Path(__file__).resolve().parent / "scan-ptbr-report.json"


# ---------------------------------------------------------------------------
# Load data
# ---------------------------------------------------------------------------

def load_translations(path: Path) -> Dict[str, str]:
    """Load PT-BR → EN mapping from translations.json (keys are PT-BR)."""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {k: v for k, v in data.items()}  # k=ptBR, v=en


def load_ignore_rules(path: Path) -> dict:
    """Load ignore rules from scan-ptbr-ignore.json if it exists.

    Expected format:
    {
      "ignoreFiles": ["relative/path/to/file.ts"],
      "ignoreLines": { "relative/path/to/file.ts": [12, 34] },
      "ignoreWords": { "relative/path/to/file.ts": ["palavra1"] },
      "ignoreWordsGlobal": ["palavra1"]
    }
    """
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_conflicts_context(path: Path) -> Dict[str, List[dict]]:
    """Parse conflicts.md to extract context-dependent mapping info."""
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    conflicts: Dict[str, List[dict]] = defaultdict(list)
    pattern = re.compile(
        r'##\s+\d+\.\s+`([^`]+)`.*?\n\n'
        r'(.*?)(?=\n---\n|\n##\s+\d+\.|\Z)',
        re.DOTALL
    )
    for match in pattern.finditer(text):
        word = match.group(1).strip()
        body = match.group(2)
        for row in body.split('\n'):
            if '|' in row and 'Context' not in row and '---' not in row:
                parts = [p.strip() for p in row.split('|') if p.strip()]
                if len(parts) >= 2:
                    conflicts[word].append({
                        "english": parts[0].strip('`'),
                        "context": parts[1].strip('`') if len(parts) > 1 else "",
                    })
    return dict(conflicts)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_WAS_RE = re.compile(
    r'(?:was\s+|was\s*[:"\'])\s*"?([^"]*)"?|'
    r'/\*\*\s*was\s+("[^"]+")|'
    r'//\s*was\b',
    re.IGNORECASE
)


def is_was_annotation(line: str, word: str) -> bool:
    """Check if this occurrence is inside a 'was' migration annotation.

    Examples of intentional annotations we detect:
        /** was "inicio" */
        // was "valor"
        @param start - Start date (was "inicio")
        was "fim"
    """
    # Quick check: does the line contain "was" near the word?
    if "was" not in line.lower():
        return False
    # Check if this line looks like a was-annotation pattern
    return bool(re.search(
        r'(?:was|\(was)\s*["\']\s*' + re.escape(word) + r'\s*["\']',
        line, re.IGNORECASE
    ))


def find_ptbr_in_line(line: str, pt_words: List[str]) -> List[Tuple[str, int]]:
    """Return list of (word, column) for pt-BR words found on this line.

    Uses word-boundary matching to avoid false positives (e.g.,
    "inicio" matching inside "inicioTimestamp").
    """
    matches = []
    for word in pt_words:
        pattern = re.compile(r'(?<![a-zA-Z0-9_])' + re.escape(word) + r'(?![a-zA-Z0-9_])')
        for m in pattern.finditer(line):
            matches.append((word, m.start()))
    return matches


def scan_directory(
    ts_dir: Path,
    pt_words: List[str],
    ignore_rules: dict,
    root: Path,
    *,
    skip_identical: bool = True,
    skip_was: bool = True,
) -> List[dict]:
    """Scan all .ts files and return list of findings.

    Args:
        skip_identical: If True, skip words where PT-BR == EN (e.g., "link").
        skip_was: If True, skip occurrences inside "was" migration annotations.
    """
    findings = []
    ignore_files: Set[str] = set(ignore_rules.get("ignoreFiles", []))
    ignore_lines: Dict[str, Set[int]] = {
        k: set(v) for k, v in ignore_rules.get("ignoreLines", {}).items()
    }
    ignore_words_file: Dict[str, Set[str]] = {
        k: set(v) for k, v in ignore_rules.get("ignoreWords", {}).items()
    }
    ignore_words_global: Set[str] = set(ignore_rules.get("ignoreWordsGlobal", []))

    ts_files = sorted(ts_dir.rglob("*.ts"))

    for file_path in ts_files:
        rel_path = str(file_path.relative_to(root))

        if rel_path in ignore_files:
            continue

        file_line_ignores = ignore_lines.get(rel_path, set())
        file_word_ignores = ignore_words_file.get(rel_path, set())

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
        except (OSError, UnicodeDecodeError) as e:
            findings.append({
                "file": rel_path, "line": 0, "col": 0,
                "word": "", "english": "",
                "lineContent": f"[ERROR: {e}]",
                "kind": "error",
            })
            continue

        for line_no, line in enumerate(lines, start=1):
            if line_no in file_line_ignores:
                continue

            hits = find_ptbr_in_line(line, pt_words)
            for word, col in hits:
                if word in ignore_words_global:
                    continue
                if word in file_word_ignores:
                    continue

                kind = "real"
                if skip_was and is_was_annotation(line, word):
                    continue  # skip was annotations entirely
                elif is_was_annotation(line, word):
                    kind = "was-annotation"

                findings.append({
                    "file": rel_path,
                    "line": line_no,
                    "col": col,
                    "word": word,
                    "lineContent": line.rstrip("\n"),
                    "kind": kind,
                })

    return findings


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def _count_kinds(findings: List[dict]) -> Dict[str, int]:
    counts = defaultdict(int)
    for f in findings:
        counts[f.get("kind", "real")] += 1
    return dict(counts)


def print_summary(findings: List[dict], translations: Dict[str, str]):
    """Print a concise summary: counts by word and file."""
    by_word = defaultdict(int)
    by_file = defaultdict(int)
    for f in findings:
        by_word[f["word"]] += 1
        by_file[f["file"]] += 1

    kinds = _count_kinds(findings)
    kind_str = " | ".join(f"{v} {k}" for k, v in sorted(kinds.items()))

    print(f"\n{'='*70}")
    print(f"  SCAN SUMMARY — {len(findings)} occurrences  ({kind_str})")
    print(f"{'='*70}")

    if not findings:
        print("  ✅ No residual Portuguese words found!")
        return

    print(f"\n--- By word ({len(by_word)} unique, top 40) ---")
    for word, count in sorted(by_word.items(), key=lambda x: -x[1])[:40]:
        en = translations.get(word, "???")
        marker = ""
        if word in translations and translations[word] == word:
            marker = "  (PT==EN)"
        print(f"  {word:25s} → {en:25s}  {count:4d}{marker}")

    if len(by_word) > 40:
        print(f"  ... and {len(by_word) - 40} more words")

    print(f"\n--- By file ({len(by_file)} files, top 20) ---")
    for file, count in sorted(by_file.items(), key=lambda x: -x[1])[:20]:
        print(f"  {count:4d}  {file}")

    if len(by_file) > 20:
        print(f"  ... and {len(by_file) - 20} more files")


def print_detailed(findings: List[dict], translations: Dict[str, str],
                   conflicts: Dict[str, List[dict]]):
    """Print a detailed report grouped by file."""
    by_file = defaultdict(list)
    for f in findings:
        by_file[f["file"]].append(f)

    kinds = _count_kinds(findings)
    kind_str = " | ".join(f"{v} {k}" for k, v in sorted(kinds.items()))

    print(f"\n{'='*70}")
    print(f"  DETAILED REPORT — {len(findings)} occurrences  ({kind_str})")
    print(f"{'='*70}")

    for file_path in sorted(by_file):
        file_findings = by_file[file_path]
        print(f"\n── {file_path}  ({len(file_findings)} hits)")

        for f in file_findings:
            en = translations.get(f["word"], "???")
            guidance = ""
            if f["word"] in conflicts:
                ctxs = conflicts[f["word"]]
                guidance = "  ⚠ " + " | ".join(
                    f'{c["english"]} ({c["context"]})' for c in ctxs
                )
            kind_tag = ""
            if f.get("kind") == "was-annotation":
                kind_tag = "  [was-annotation]"
            marker = "┃"
            print(f"  L{f['line']:04d}:{f['col']:03d}  {marker}  [{f['word']} → {en}]{guidance}{kind_tag}")
            print(f"         {marker}  {f['lineContent']}")


def output_json(findings: List[dict], translations: Dict[str, str],
                conflicts: Dict[str, List[dict]], path: Optional[Path] = None):
    """Output findings as JSON (to stdout or file)."""
    enriched = []
    for f in findings:
        entry = dict(f)
        entry["english"] = translations.get(f["word"], None)
        entry["conflicts"] = conflicts.get(f["word"], [])
        enriched.append(entry)

    output = {
        "summary": {
            "totalOccurrences": len(findings),
            "uniqueWords": len(set(f["word"] for f in findings)),
            "uniqueFiles": len(set(f["file"] for f in findings)),
            "byKind": _count_kinds(findings),
        },
        "findings": enriched,
    }

    if path:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        print(f"JSON report written to: {path}")
    else:
        print(json.dumps(output, indent=2, ensure_ascii=False))


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    args = sys.argv[1:]
    mode_json = "--json" in args
    mode_summary = "--summary" in args
    mode_strict = "--strict" in args
    mode_include_was = "--include-was" in args

    skip_identical = not mode_strict
    skip_was = not mode_strict and not mode_include_was

    # Load data
    print("Loading translations...", file=sys.stderr)
    translations = load_translations(TRANSLATIONS_PATH)

    # Filter: words where PT-BR key == EN value are auto-ignored (unless --strict)
    identical_words = {k for k, v in translations.items() if k == v}
    if skip_identical and identical_words:
        print(f"  Auto-skipping {len(identical_words)} identical PT==EN words "
              f"(use --strict to include): {', '.join(sorted(identical_words))}",
              file=sys.stderr)
    if skip_was:
        print("  Auto-skipping 'was' annotations (use --include-was or --strict to include)",
              file=sys.stderr)

    # Build word list (longest first for correct greedy matching)
    if skip_identical:
        pt_words = sorted(
            [k for k in translations if k not in identical_words],
            key=lambda w: -len(w)
        )
    else:
        pt_words = sorted(translations.keys(), key=lambda w: -len(w))

    print(f"  {len(pt_words)} PT-BR words to scan", file=sys.stderr)

    ignore_rules = load_ignore_rules(IGNORE_PATH)
    if ignore_rules:
        n_files = len(ignore_rules.get("ignoreFiles", []))
        n_lines = sum(len(v) for v in ignore_rules.get("ignoreLines", {}).values())
        n_words = len(ignore_rules.get("ignoreWordsGlobal", []))
        print(f"  Ignore rules loaded: {n_files} files, {n_lines} lines, {n_words} global words",
              file=sys.stderr)

    conflicts = load_conflicts_context(CONFLICTS_PATH)
    if conflicts:
        print(f"  {len(conflicts)} conflict entries loaded", file=sys.stderr)

    # Scan
    print(f"\nScanning {TS_DIR} ...", file=sys.stderr)
    findings = scan_directory(
        TS_DIR, pt_words, ignore_rules, ROOT,
        skip_identical=skip_identical,
        skip_was=skip_was,
    )
    kinds = _count_kinds(findings)
    kind_str = " | ".join(f"{v} {k}" for k, v in sorted(kinds.items()))
    print(f"  Done — {len(findings)} occurrences found ({kind_str})", file=sys.stderr)

    # Report
    if mode_json:
        output_json(findings, translations, conflicts,
                    REPORT_PATH if "--save" in args else None)
    elif mode_summary:
        print_summary(findings, translations)
    else:
        print_summary(findings, translations)
        if findings:
            print_detailed(findings, translations, conflicts)

    # Exit code: only fail on "real" findings (not was-annotations)
    real_count = sum(1 for f in findings if f.get("kind") != "was-annotation")
    if real_count > 0:
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
