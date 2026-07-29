---
name: git-workflow
description: 'Use when you need to understand the git branch strategy, commit message conventions, sync workflow, or how to format commits for this project. Always consult this skill before writing commit messages or performing git operations.'
---

# Git Workflow

TripViewer uses a **develop → master** branching strategy with task-ID-based commit messages. All work happens on `develop`; `master` mirrors it via force-sync.

---

## Branch Strategy

```
develop  ← All commits go here (active development)
master   ← Force-synced from develop (production mirror)
```

- **No feature branches** — work directly on `develop`
- **No PRs from feature branches** — PR references in commit messages are from external tooling (GitKraken/GitHub issues)
- `master` is updated via `npm run sync` (calls `scripts/utils/sync.py`)

---

## Commit Message Conventions

### Primary format: Task IDs

Most commits reference README task IDs directly:

```
F171, F172
B158
E048 (#31)
E044 (#30)
B152, B153
E026, M146, B160
```

**Pattern:** `{TYPE}{NNN}[, {TYPE}{NNN}]* [(#{PR})]`

Multiple tasks can be listed comma-separated. Parenthesized numbers (e.g., `(#31)`) reference GitHub PR numbers.

### Secondary format: Conventional prefix

Some commits use conventional commit prefixes:

```
chore: deploy new version
docs: update refactoring plan
docs: add migration-plan
docs: update read-me
```

### Version bumps

```
version update
update version
```

These typically follow `npm run readme` which recalculates the version.

---

## The Sync Script (`scripts/utils/sync.py`)

```bash
npm run sync
# → python scripts/utils/sync.py
```

### What it does:
```
1. git fetch                    # Get latest refs
2. git checkout master          # Switch to master
3. git reset --hard origin/develop  # Force master = develop
4. git checkout develop         # Switch back to develop
```

### When to use:
- After deploying to production
- When master has diverged and needs to match develop
- **Interactive confirmation** — prompts `(y/n)` before proceeding
- **WARNING:** Uncommitted changes on master will be lost

---

## Pre-Commit Workflow

From `F132` (completed June 2026), pre-commit hooks run:

```bash
npx biome format --write   # Format staged files
npm run readme              # Update task counts + version
```

### Before committing:
1. Write your code changes
2. Add new task IDs to README (under `## Done` → current month)
3. Stage files: `git add .`
4. Commit with task ID(s): `git commit -m "F172, M158"`

---

## Environment & Configuration

### `.firebaserc`
Three Firebase project aliases:
```
dev → trip-viewer-dev
prd → trip-viewer-prd
tcc → trip-viewer-tcc
```

### `.gitignore`
Key exclusions:
```
node_modules/
dist/
.env
.emulator-data/
__pycache__/
*.pyc
.DS_Store
```

---

## Build & Deploy Flow

The typical development cycle:

```
1. Code changes on develop
   └─ npm run dev        (local emulators + watch mode)

2. Commit
   └─ Add task to README
   └─ npm run readme      (or let pre-commit hook run it)
   └─ git commit -m "F172, M158"

3. Build
   └─ npm run build       (one-shot production build)

4. Deploy
   └─ npm run deploy      (→ scripts/build/deploy.py)
   └─ Firebase Hosting deploys dist/

5. Sync master
   └─ npm run sync        (force master = develop)
```

---

## Common Git Operations

### Check where you are
```bash
git branch               # See current branch
git status               # See staged/unstaged changes
git log --oneline -10    # Recent commits
```

### Stash work-in-progress
```bash
git stash                # Save uncommitted changes
git stash pop            # Restore stashed changes
git stash list           # List stashes
```

### Undo last commit (keep changes)
```bash
git reset --soft HEAD~1
```

### Force-push (after sync or rebase)
```bash
git push --force-with-lease origin develop
```

---

## Commit Message Guidelines

| Situation | Format | Example |
|---|---|---|
| Feature/bug/improvement | `{TYPE}{NNN}` | `F172` |
| Multiple tasks | `{TYPE}{NNN}, {TYPE}{NNN}` | `F171, M157` |
| With PR reference | `{TYPE}{NNN} (#31)` | `E048 (#31)` |
| Documentation only | `docs: description` | `docs: update migration-plan` |
| Infrastructure | `chore: description` | `chore: deploy new version` |
| Version bump only | `version update` | `version update` |

---

## Important Notes

- **No merge commits** — the history is mostly linear on `develop`
- **No rebase workflow** — `sync.py` uses `reset --hard`, not merge or rebase
- **Task IDs are the source of truth** — commit messages reference them, README tracks them
- **Version is automatic** — never manually edit the version in `package.json`; it's derived from completed tasks
