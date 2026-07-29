---
name: backlog-management
description: 'Use when you need to add, update, or understand tasks in the README.md backlog; run the readme.py analysis script; interpret task IDs, emoji types, or version calculation; or modify the task tracking system.'
---

# Backlog & Task Management

TripViewer tracks all work in `README.md` using a structured task system with IDs, emoji types, and sections. A Python script (`scripts/utils/readme.py`) auto-updates task counts, checks for inconsistencies, and calculates the semantic version.

---

## Task ID Convention

Every task has a unique ID in the format `{TYPE}{NNN}`:

| Prefix | Emoji | Type | Example |
|---|---|---|---|
| `B` | 🐞 | Bug | `B161` |
| `F` | 🏆 | Feature | `F154` |
| `M` | 📈 | Improvement | `M158` |
| `E` | ⚔️ | Epic | `E051` |

Task numbers are sequential within each type. The script detects **gaps** (missing numbers) and **duplicates**.

### How tasks appear in README:

```markdown
- 🏆 **F154:** Add AI skills for project
- 🐞 **B158:** When clicking on last item of transportation tab, nothing happens
- 📈 **M157:** Expand single document import/export features by allowing all types
```

Epic sub-tasks use indented bullet points:
```markdown
- ⚔️ **E048:** Database overhaul
  - *[🐞B161] Fix page issues post migration*
  - *[📈M155] Load dark/light mode as soon as page starts*
```

---

## README Sections

### `## Backlog`
Active work — tasks not yet done. Organized by priority:
- **High Priority** — urgent bugs, active features
- **Medium Priority** — planned epics in progress
- **Low Priority** — future epics, long-term improvements

### `## Done`
Completed tasks, organized chronologically by month (newest first):
```markdown
### July 2026
- ⚔️ **E048:** Database overhaul
- 🐞 **B161:** Fix page issues post migration
```

### `### Discarded`
Cancelled/abandoned tasks. Kept for reference.

---

## The `readme.py` Script

```bash
npm run readme
# → python scripts/utils/readme.py
```

### What it does:

1. **Parses** all tasks from the three sections (Backlog, Done, Discarded)
2. **Counts** tasks by type and status (done, cancelled, pending)
3. **Checks for inconsistencies**:
   - Invalid ID format (must be `{TYPE}NNN` with 3 digits)
   - Emoji ↔ Type mismatches (e.g., 🐞 paired with `F123`)
   - Missing task numbers (gaps in sequence)
   - Duplicate task numbers (same ID appearing twice)
4. **Calculates version** using semantic versioning:
   - Major: hardcoded at `2`
   - Minor: increments for each completed Epic (E-type task)
   - Patch: increments for each completed non-Epic task
   - Version format: `2.{minor}.{patch}`
5. **Updates the summary table** at the top of README with current counts

### Output example:
```
============================================================
README.md Analysis
============================================================

📊 Task Distribution:
   Backlog:   25 tasks
   Done:      479 tasks
   Discarded: 30 tasks
   Total:     534 tasks

📈 Task Counts by Type:
   🐞 Bugs:         Total: 161  | Done: 158  | Cancelled: 3   | Pending: 0
   🏆 Features:     Total: 164  | Done: 140  | Cancelled: 22  | Pending: 2
   📈 Improvements: Total: 158  | Done: 133  | Cancelled: 23  | Pending: 2
   ⚔️ Epics:        Total: 51   | Done: 34   | Cancelled: 9   | Pending: 8

✓ No inconsistencies found

🏷️  Calculated Version: 2.30.5

✓ README.md table updated successfully
```

---

## Adding a New Task

### When implementing a feature:
```markdown
# In "## Done" → current month section:
- 🏆 **F172:** Description of the new feature
```

### When planning future work:
```markdown
# In "## Backlog" → appropriate priority section:
- 🏆 **F173:** Description of planned feature
```

### When an epic is completed:
Move the epic AND all its sub-tasks from Backlog to Done.

### After adding tasks:
```bash
npm run readme
```
This updates the counts table and recalculates the version. **Always run after modifying tasks.**

---

## Version Auto-Calculation

The version is **not manually maintained** — `readme.py` derives it from completed tasks:

```
2.30.5 = Major 2 + 30 completed Epics + 5 completed non-Epic tasks
```

- `2.30.0` → after completing epic E048
- `2.30.1` → after completing B161 (bug fix)
- `2.30.5` → current (E048 + E049 + E050 + F169 + F171 + M157)

### Epic detection edge case
If an Epic appears in **both** Backlog and Done, it's treated as still in progress (counted from Backlog only). This prevents epics with pending sub-tasks from inflating the version.

---

## Task ID Selection Rules

1. Use the **next available number** for the task type
2. Run `npm run readme` to see missing numbers (gaps) — fill gaps before creating new numbers
3. **Never reuse** a discarded task's number
4. Sub-tasks of epics get their own IDs (they're regular tasks that reference their parent epic)

---

## Pre-commit Integration

> **F132: Add pre-commit actions (formatting and read-me)** — completed June 2026.

Formatting and readme update are run as pre-commit hooks:
```bash
npx biome format --write
npm run readme
```
