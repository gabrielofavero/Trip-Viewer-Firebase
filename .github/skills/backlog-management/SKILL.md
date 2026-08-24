---
name: backlog-management
description: 'Use for anything involving the README.md task backlog — including the MANDATORY end-of-task check: after every completed request, find its ticket in the backlog (or create one) and move it to Done. Also covers: navigating sections, adding/moving tasks (Done = newest month first, tasks old→new down each month), task IDs and emoji types, counts/version/next IDs, and `npm run readme` (scripts/utils/readme.py).'
applyTo: '*'
---

# Backlog & Task Management

TripViewer tracks all work in `README.md` using a structured task system with IDs, emoji types, and sections. A Python script (`scripts/utils/readme.py`) auto-updates task counts and checks for inconsistencies.

---

## End-of-Task Backlog Check (MANDATORY)

**Run this at the end of every completed request** — not only backlog-focused work. The README is the single source of truth for all project work, so any task you complete must end up in `## Done` before you end your turn.

### Workflow

1. **Search the backlog** for a ticket matching what you just completed.
   - Check `## Backlog` (all priority blocks) **and** epic sub-tasks.
   - Match on description, type, and keywords — wording need not be exact.
2. **Ticket found → move it to Done:**
   - Cut it from `## Backlog` and **append it to the bottom** of the current month's list under `## Done` (old on top, new at the bottom).
   - If the month section doesn't exist yet, create `### <Month Year>` at the **top** of `## Done` first.
   - Keep the same ID — never renumber or duplicate it.
   - Epic sub-task? Remove the indented bullet from under its parent epic; once an epic has no sub-tasks left, move the epic itself to Done too (keep it in Backlog until all sub-tasks are done — see *When an epic is completed*).
3. **No ticket found → create one straight into Done:**
   - Assess the type: 🐞 **Bug** (defect/fix), 🏆 **Feature** (new capability), 📈 **Improvement** (polish/refactor/DEV tooling), ⚔️ **Epic** (large multi-part initiative).
   - Pick the **next available ID** for that type (see *Task ID Selection Rules*; fill any gaps reported by `npm run readme`).
   - Format exactly like existing entries: `- 🐞 **B177:** Description of what was done`
   - **Append it to the bottom** of the current month's list under `## Done`.
4. **Run `npm run readme`** to refresh the summary table and check consistency.

> Skip only when no work was completed (e.g. a pure read-only answer or a question answered without making any changes). If in doubt, do the check.

---

## Navigating the README

`README.md` is the single source of truth for all project work. Reading it top-to-bottom:

| Location | Purpose |
|---|---|
| `# Tasks` table | Summary counts per type (auto-updated by `npm run readme`). **Don't hand-edit.** |
| `## Backlog` | Active work, grouped by `### High / Medium / Low Priority`. |
| `## Done` | Completed work, grouped by month (`### June 2026`, etc.). |
| `### Duplicated (Already Done)` | Tasks that were done but duplicated elsewhere — **counted as `done`**, never cancelled. Lives inside `## Done`. |
| `### Discarded` | Cancelled/abandoned tasks, kept for reference. Lives at the end of `## Done`. |

Quick orientation:
- **Looking for the version?** Run `npm run readme` — it prints the calculated version. There is no hardcoded version string in the repo.
- **Looking for a specific task?** Search by its ID (e.g. `B161`). Each task appears in exactly one place — Backlog, Done, or Discarded.
- **Wondering where a task belongs?** Not done → `## Backlog`; done → `## Done` under the current month; duplicated work that's already done → `### Duplicated (Already Done)`; abandoned → `### Discarded`.
- **Epics in Backlog** may show their sub-tasks as indented bullets underneath; each sub-task has its own ID and is listed in Done individually when finished.

### Ordering rules (important)

- **`## Done` months:** newest month at the top (`### August 2026` sits above `### July 2026`).
- **Within a `## Done` month:** old on top, **new at the bottom**. Newly completed tasks are *appended* to the bottom of the current month's list.
- **`## Backlog`:** grouped by priority (High → Medium → Low); add a new task to the block matching its priority. No strict top/bottom rule within a block — place it where it reads best.
- **Epic sub-tasks:** indented bullets directly under the epic, written as `*[🐞B161] description*`.
- **Brand-new month:** create `### <Month Year>` at the **top** of `## Done`, then put the task at the bottom of that new section.

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
Active work — tasks **not yet done**. Organized by priority:
- **High Priority** — urgent bugs, active features being worked on now
- **Medium Priority** — planned epics in progress, near-term improvements
- **Low Priority** — future epics, long-term improvements

### `## Done`
Completed tasks, organized chronologically by month (**newest month first**):
```markdown
### August 2026
- 🐞 **B163:** Fix color and destination image issues   ← older task (top)
- 🏆 **F159:** Add AI skill for browsing pages
- 📈 **M161:** Improve AI skills detection
- 🏆 **F155:** Add images for each destination item     ← newest task (bottom)

### July 2026
- ⚔️ **E048:** Database overhaul
...
```
New tasks are **appended to the bottom** of the current month. New months go at the **top** of `## Done`.

### `### Duplicated (Already Done)`
Tasks that were done but got duplicated elsewhere. Kept for reference inside `## Done`. **`readme.py` counts these as `done`** (not cancelled) — the only section counted as cancelled is `### Discarded`.

### `### Discarded`
Cancelled/abandoned tasks. Kept for reference. Located at the very end of `## Done`. **This is the only section counted as cancelled.**

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

## Calculating Things

Everything is derived from the README by `readme.py` — nothing is hand-maintained. **The AI only picks the next task ID and places tasks correctly; `npm run readme` does all the counting and inconsistency checks.**

### The summary table (`# Tasks`)
| Column | Meaning |
|---|---|
| `Total` | Every task of that type across Backlog + Done + Discarded |
| `Done` | Completed tasks of that type |
| `Cancelled` | Discarded tasks of that type |
| `Pending` | Open (Backlog) tasks of that type |

### Version
> **The AI never calculates the version.** Versions live in `CHANGELOG.md` and are chosen at deploy time via `scripts/build/deploy.py` (use the last version, bump minor, or bump patch). The deploy script stamps the `## [version] - <date>` entry and syncs `package.json` / `version.json`.

### Next available ID for a type
1. Find the highest existing number for that type (across Backlog + Done + Discarded). E.g. highest `M` is `M166` → next is `M167`.
2. Check for **gaps first**: `npm run readme` lists missing numbers — **fill gaps before creating a new number**.
3. Never reuse a Discarded task's number.

---

## Adding a New Task

### Step-by-step

1. **Pick the next ID** for the task type (see *Task ID Selection Rules* below).
2. **Add the task in the right place:**
   - **Just completed it** → `## Done`, **append to the bottom** of the current month's list (old on top, new at the bottom). If the month section doesn't exist yet, create `### <Month Year>` at the top of `## Done` first.
   - **Planning future work** → `## Backlog`, in the matching priority section (High/Medium/Low).
   - **Epic sub-task** → indented bullet under its parent epic.
3. **Format** exactly like existing entries:
   ```markdown
   - 🏆 **F172:** Description of the new feature
   ```
4. **Run `npm run readme`** to refresh the summary table and version. **Always run after adding/moving/removing tasks.**

### When an epic is completed
Move the epic **and all its sub-tasks** from Backlog to Done. Because the script treats an epic in *both* Backlog and Done as still in progress, keep the epic in Backlog until all sub-tasks are done.

### When a task is abandoned
Move it from Backlog to `### Discarded`. Its number is **never reused**.

---

## Versioning (CHANGELOG-driven)

The version is **not** derived from README task counts anymore. It lives in `CHANGELOG.md` and is chosen when deploying:

- `scripts/build/deploy.py` prompts for the version label after the project selection:
  - **Label as `X.X.X`** — use the last version on the changelog (stamps today's date on it).
  - **Create `X.X+1.X`** — bump minor.
  - **Create `X.X.X+1`** — bump patch.
- For production (`trip-viewer-prd`) deploys, the script adds/updates the `## [version] - <date>` entry at the top of `CHANGELOG.md`.
- The chosen version is applied to `package.json`, `package-lock.json` (during build/deploy) and `public/assets/json/version.json`.
- `npm run readme` no longer prints or calculates a version — it only maintains the task table and checks consistency.

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

---

## Quick Operations Reference

| What you want | Do this |
|---|---|
| Analyse README, update counts table, print version | `npm run readme` |
| Mark a task done | Append it to the **bottom** of the current month under `## Done`, then `npm run readme` |
| Add planned work | Add to the right priority block under `## Backlog`, then `npm run readme` |
| Abandon a task | Move it to `### Discarded`, then `npm run readme` |
| Find gaps / duplicates / emoji mismatches | `npm run readme` (it prints every inconsistency) |
| Check the current version | `npm run readme` (prints `🏷️ Calculated Version: X.Y.Z`) |
| Pick the next task ID | highest existing number + 1, after filling any gaps reported by `npm run readme` |
