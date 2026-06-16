#!/usr/bin/env python3
"""
scan-ptbr.py — Scan TypeScript files for residual Portuguese (pt-BR) words.

Reads references/translations.json for the known PT-BR → EN mapping,
then scans .ts files under public/assets/ts for occurrences of those
Portuguese words.

Output: one compact JSON per scanned file in results/ (folder cleared each run),
plus an _index.json with aggregate summary + hotspots.

Usage:
    python scripts/translation/scan-ptbr.py                          # scan all, write results/
    python scripts/translation/scan-ptbr.py --summary                # terminal summary only
    python scripts/translation/scan-ptbr.py --file path/to/file.ts   # scan a single file
    python scripts/translation/scan-ptbr.py --strict                 # no auto-filters
    python scripts/translation/scan-ptbr.py --include-was            # include was comments
"""

import json
import re
import sys
import shutil
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Optional

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent.parent
HERE = Path(__file__).resolve().parent
TRANSLATIONS_PATH = HERE / "references" / "translations.json"
CONFLICTS_PATH = HERE / "references" / "conflicts.md"
TS_DIR = ROOT / "public" / "assets" / "ts"
IGNORE_PATH = HERE / "scan-ptbr-ignore.json"
RESULTS_DIR = HERE / "results"


# ---------------------------------------------------------------------------
# Load data
# ---------------------------------------------------------------------------

def load_translations(path: Path) -> Dict[str, str]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {k: v for k, v in data.items()}


def load_ignore_rules(path: Path) -> dict:
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_conflicts_context(path: Path) -> Dict[str, List[dict]]:
    if not path.exists():
        return {}
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    conflicts: Dict[str, List[dict]] = defaultdict(list)
    pattern = re.compile(
        r'##\s+\d+\.\s+`([^`]+)`.*?\n\n(.*?)(?=\n---\n|\n##\s+\d+\.|\Z)', re.DOTALL)
    for match in pattern.finditer(text):
        word = match.group(1).strip()
        for row in match.group(2).split('\n'):
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

def is_was_annotation(line: str, word: str) -> bool:
    """Check if this line is a 'was' annotation (any form).

    Handles all was-annotation patterns:
        code; // was "word"
        /** was "word" */
        /** was "a" (b|c|d) */
        // was {key: ..., otherKey: ...}
        * was word / other-word
        code; // was "parent.child"
    """
    return "was" in line.lower()


def find_ptbr_in_line(line: str, pt_words: List[str]) -> List[Tuple[str, int]]:
    matches = []
    for word in pt_words:
        pattern = re.compile(r'(?<![a-zA-Z0-9_])' + re.escape(word) + r'(?![a-zA-Z0-9_])')
        for m in pattern.finditer(line):
            matches.append((word, m.start()))
    return matches


# ---------------------------------------------------------------------------
# Scan
# ---------------------------------------------------------------------------

def scan_files(
    ts_dir: Path,
    pt_words: List[str],
    ignore_rules: dict,
    root: Path,
    *,
    skip_was: bool = True,
    target_file: Optional[str] = None,
) -> Dict[str, List[dict]]:
    """Scan .ts files, return {rel_path: [findings]}.

    Args:
        target_file: Relative path from project root to scan only that file.
    """
    findings_by_file: Dict[str, List[dict]] = defaultdict(list)
    ignore_files: Set[str] = set(ignore_rules.get("ignoreFiles", []))
    ignore_lines: Dict[str, Set[int]] = {
        k: set(v) for k, v in ignore_rules.get("ignoreLines", {}).items()}
    ignore_words_file: Dict[str, Set[str]] = {
        k: set(v) for k, v in ignore_rules.get("ignoreWords", {}).items()}
    ignore_words_global: Set[str] = set(ignore_rules.get("ignoreWordsGlobal", []))

    if target_file:
        # Resolve target: accept both project-relative and ts-dir-relative paths
        candidates = [
            root / target_file,
            ts_dir / target_file,
        ]
        ts_files = []
        for c in candidates:
            if c.exists() and c.is_file():
                ts_files = [c]
                break
        if not ts_files:
            print(f"ERROR: file not found: {target_file}", file=sys.stderr)
            sys.exit(1)
    else:
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
            findings_by_file[rel_path].append({
                "line": 0, "col": 0, "word": "",
                "lineContent": f"[ERROR: {e}]", "kind": "error",
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
                if skip_was and is_was_annotation(line, word):
                    continue
                kind = "was-annotation" if is_was_annotation(line, word) else "real"
                findings_by_file[rel_path].append({
                    "line": line_no,
                    "col": col,
                    "word": word,
                    "lineContent": line.rstrip("\n"),
                    "kind": kind,
                })

    return dict(findings_by_file)


# ---------------------------------------------------------------------------
# Results folder
# ---------------------------------------------------------------------------

def clear_results() -> None:
    if RESULTS_DIR.exists():
        shutil.rmtree(RESULTS_DIR)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)


def _safe_filename(rel_path: str) -> str:
    """Convert a relative TS path to a safe JSON filename."""
    return rel_path.replace("\\", "/").replace("/", "__").replace(".ts", ".json")


def write_results(
    findings_by_file: Dict[str, List[dict]],
    translations: Dict[str, str],
    conflicts: Dict[str, List[dict]],
) -> None:
    """Write one JSON per file into results/, plus _index.json."""
    clear_results()

    total_findings = 0
    index_files = {}

    for rel_path, findings in sorted(findings_by_file.items()):
        if not findings:
            continue

        # Group by word
        by_word: Dict[str, List[int]] = defaultdict(list)
        for f in findings:
            by_word[f["word"]].append(f["line"])

        words_out = {}
        for word, lines in sorted(by_word.items(), key=lambda x: -len(x[1])):
            unique = sorted(set(lines))
            entry: dict = {
                "en": translations.get(word),
                "n": len(lines),
                "lines": unique if len(unique) <= 12 else unique[:12] + ["..."],
            }
            if word in conflicts:
                entry["conflicts"] = conflicts[word]
            words_out[word] = entry

        total = len(findings)
        total_findings += total

        per_file = {
            "file": rel_path,
            "total": total,
            "words": words_out,
        }

        filename = _safe_filename(rel_path)
        with open(RESULTS_DIR / filename, "w", encoding="utf-8") as f:
            json.dump(per_file, f, indent=2, ensure_ascii=False)

        index_files[rel_path] = {"total": total, "file": filename}

    # --- _index.json: aggregate summary ---
    # Global word counts
    global_words: Dict[str, int] = defaultdict(int)
    for rel_path, findings in findings_by_file.items():
        for f in findings:
            global_words[f["word"]] += 1

    # Hotspots: top 40 file+word combos
    combos = []
    for rel_path, findings in findings_by_file.items():
        bw: Dict[str, int] = defaultdict(int)
        for f in findings:
            bw[f["word"]] += 1
        for word, n in bw.items():
            combos.append({"file": rel_path, "word": word, "en": translations.get(word), "n": n})
    combos.sort(key=lambda x: -x["n"])
    hotspots = combos[:40]

    index = {
        "summary": {
            "totalOccurrences": total_findings,
            "uniqueWords": len(global_words),
            "filesScanned": len(findings_by_file),
        },
        "topWords": {
            w: {"en": translations.get(w), "n": n}
            for w, n in sorted(global_words.items(), key=lambda x: -x[1])[:40]
        },
        "topFiles": {
            rel: info["total"]
            for rel, info in sorted(index_files.items(), key=lambda x: -x[1]["total"])[:20]
        },
        "hotspots": hotspots,
    }

    with open(RESULTS_DIR / "_index.json", "w", encoding="utf-8") as f:
        json.dump(index, f, indent=2, ensure_ascii=False)

    print(f"\nResults: {len(findings_by_file)} files → {RESULTS_DIR}", file=sys.stderr)
    print(f"  _index.json  — aggregate summary + hotspots", file=sys.stderr)
    print(f"  *.json       — one per scanned TS file", file=sys.stderr)


# ---------------------------------------------------------------------------
# Terminal reporting
# ---------------------------------------------------------------------------

def _count_kinds(findings: List[dict]) -> Dict[str, int]:
    counts = defaultdict(int)
    for f in findings:
        counts[f.get("kind", "real")] += 1
    return dict(counts)


def print_summary(findings_by_file: Dict[str, List[dict]], translations: Dict[str, str]):
    all_findings = [f for flist in findings_by_file.values() for f in flist]
    by_word = defaultdict(int)
    for f in all_findings:
        by_word[f["word"]] += 1

    by_file = {fp: len(fl) for fp, fl in findings_by_file.items()}

    kinds = _count_kinds(all_findings)
    kind_str = " | ".join(f"{v} {k}" for k, v in sorted(kinds.items()))

    print(f"\n{'='*70}")
    print(f"  SCAN SUMMARY — {len(all_findings)} occurrences  ({kind_str})")
    print(f"{'='*70}")

    if not all_findings:
        print("  ✅ No residual Portuguese words found!")
        return

    print(f"\n--- By word ({len(by_word)} unique, top 40) ---")
    for word, count in sorted(by_word.items(), key=lambda x: -x[1])[:40]:
        en = translations.get(word, "???")
        print(f"  {word:25s} → {en:25s}  {count:4d}")

    if len(by_word) > 40:
        print(f"  ... and {len(by_word) - 40} more words")

    print(f"\n--- By file ({len(by_file)} files, top 20) ---")
    for file, count in sorted(by_file.items(), key=lambda x: -x[1])[:20]:
        print(f"  {count:4d}  {file}")

    if len(by_file) > 20:
        print(f"  ... and {len(by_file) - 20} more files")


def print_detailed(findings_by_file: Dict[str, List[dict]],
                   translations: Dict[str, str],
                   conflicts: Dict[str, List[dict]]):
    all_findings = [f for flist in findings_by_file.values() for f in flist]
    kinds = _count_kinds(all_findings)
    kind_str = " | ".join(f"{v} {k}" for k, v in sorted(kinds.items()))

    print(f"\n{'='*70}")
    print(f"  DETAILED REPORT — {len(all_findings)} occurrences  ({kind_str})")
    print(f"{'='*70}")

    for file_path in sorted(findings_by_file):
        findings = findings_by_file[file_path]
        if not findings:
            continue
        print(f"\n── {file_path}  ({len(findings)} hits)")

        for f in findings:
            en = translations.get(f["word"], "???")
            guidance = ""
            if f["word"] in conflicts:
                ctxs = conflicts[f["word"]]
                guidance = "  ⚠ " + " | ".join(
                    f'{c["english"]} ({c["context"]})' for c in ctxs)
            kind_tag = "  [was-annotation]" if f.get("kind") == "was-annotation" else ""
            marker = "┃"
            print(f"  L{f['line']:04d}:{f['col']:03d}  {marker}  [{f['word']} → {en}]{guidance}{kind_tag}")
            print(f"         {marker}  {f['lineContent']}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    args = sys.argv[1:]
    mode_summary = "--summary" in args
    mode_strict = "--strict" in args
    mode_include_was = "--include-was" in args
    skip_was = not mode_strict and not mode_include_was
    target_file: Optional[str] = None

    # Parse --file <path>
    for i, a in enumerate(args):
        if a == "--file" and i + 1 < len(args):
            target_file = args[i + 1]
            break

    # Load
    print("Loading translations...", file=sys.stderr)
    translations = load_translations(TRANSLATIONS_PATH)

    identical_words = {k for k, v in translations.items() if k == v}
    if not mode_strict and identical_words:
        print(f"  Auto-skipping {len(identical_words)} identical PT==EN words "
              f"(use --strict to include): {', '.join(sorted(identical_words))}",
              file=sys.stderr)
    if skip_was:
        print("  Auto-skipping 'was' annotations (use --include-was or --strict)",
              file=sys.stderr)

    pt_words = sorted(
        [k for k in translations if mode_strict or k not in identical_words],
        key=lambda w: -len(w),
    )
    print(f"  {len(pt_words)} PT-BR words to scan", file=sys.stderr)

    ignore_rules = load_ignore_rules(IGNORE_PATH)
    if ignore_rules:
        nf = len(ignore_rules.get("ignoreFiles", []))
        nl = sum(len(v) for v in ignore_rules.get("ignoreLines", {}).values())
        nw = len(ignore_rules.get("ignoreWordsGlobal", []))
        print(f"  Ignore rules: {nf} files, {nl} lines, {nw} global words", file=sys.stderr)

    conflicts = load_conflicts_context(CONFLICTS_PATH)
    if conflicts:
        print(f"  {len(conflicts)} conflict entries loaded", file=sys.stderr)

    # Scan
    scope = target_file or str(TS_DIR)
    print(f"\nScanning {scope} ...", file=sys.stderr)
    findings_by_file = scan_files(
        TS_DIR, pt_words, ignore_rules, ROOT,
        skip_was=skip_was,
        target_file=target_file,
    )

    total = sum(len(v) for v in findings_by_file.values())
    nfiles = len(findings_by_file)
    print(f"  Done — {total} occurrences in {nfiles} files", file=sys.stderr)

    # Output
    if mode_summary:
        print_summary(findings_by_file, translations)
    else:
        print_summary(findings_by_file, translations)
        write_results(findings_by_file, translations, conflicts)
        if total > 0:
            print_detailed(findings_by_file, translations, conflicts)

    # Exit code
    real_count = sum(
        1 for fl in findings_by_file.values()
        for f in fl if f.get("kind") != "was-annotation")
    sys.exit(1 if real_count > 0 else 0)


if __name__ == "__main__":
    main()
