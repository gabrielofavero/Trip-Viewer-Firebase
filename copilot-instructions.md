# TripViewer Project Instructions

## Project Identity

This is **TripViewer** — a vanilla TypeScript/JavaScript single-page application for planning and managing trips, destinations, expenses, and itineraries. Firebase Firestore (database), Firebase Auth (authentication), and Firebase Hosting (deployment). No framework, no bundler. Custom Node.js build pipeline with esbuild + HTML partial injection.

- **Language:** English (code, comments, identifiers). Portuguese only in user-facing i18n strings.
- **Version:** auto-calculated from completed tasks in README.md (currently 2.30.x).

## Skills

This workspace has **15 domain-specific agent skills** in `.github/skills/`. These are registered skills that Copilot discovers automatically — you do NOT need the user to invoke them with `/`. Load them proactively:

| Skill | When to Read |
|---|---|
| `browser-navigation` | Building TripViewer page URLs (t/d/l/e), emulator sign-in, waiting for Firestore-backed content, Loading Error triage |
| `query-firestore` | Reading the local Firestore emulator data |
| `data-model` | Understanding Firestore schemas, PIN-protected storage, security rules |
| `build-pipeline` | Building, watching, debugging the build process |
| `firebase-emulators` | Starting/stopping emulators, seeding data |
| `migration-system` | Running/creating Firestore data migrations — new migrations (18+) must be registered in `scripts/build/migrations-config.json` |
| `css-ui-patterns` | CSS architecture, dark mode, component styles |
| `typescript-conventions` | Module organization, page routing, service layer, coding conventions |
| `i18n-system` | Translations, language switching, JSON language packs |
| `implementation-plans` | Writing/updating/executing implementation plans — prompt every unanswered open question before starting |
| `backup-restore` | Account backup/restore, document export/import |
| `static-export` | Offline/static web export, export manifests, self-hosted assets, and image-proxy integration |
| `backlog-management` | README task IDs, readme.py script |
| `git-workflow` | Branch strategy, commit conventions, sync/deploy flow |
| `ntfy-notifications` | **ALWAYS** — see "**Notifications (do not skip)**" section below. Send an ntfy.sh notification (topic `DeepSeek`) via `scripts/dev/ntfy.mjs` when a task/milestone finishes, on long work, or before prompting the user |

**Rules for using these skills:**
1. **Before answering any question that touches one of these domains, you MUST read the matching `SKILL.md` first** — never answer from general knowledge.
2. The file-scoped skills (e.g. `typescript-conventions`, `css-ui-patterns`, `i18n-system`, `implementation-plans`, `build-pipeline`, `migration-system`, `firebase-emulators`, `backup-restore`, `backlog-management`, `git-workflow`) are auto-loaded via their `applyTo` globs when you touch matching files — do not skip them.
3. The task-scoped skills (`browser-navigation`, `query-firestore`, `data-model`) have no `applyTo`; load them based on the task description match. For `browser-navigation`, read it only when the task requires URL building, emulator sign-in, waiting for Firestore-backed content, or `Loading Error` triage — for a trivial re-check of an already-loaded/verified page, skip it and just re-read the page.
4. **Browser / Playwright requires explicit approval.** Do NOT open the integrated browser, navigate pages, click/type, take screenshots, or drive the app with Playwright unless the user has explicitly approved browser validation for the current task. When a task could be checked in the browser but the user hasn't approved it, **ask first** — don't assume. Prefer non-browser verification (`npm run build`, `query-firestore`, reading code) unless approval is given.
5. **`ntfy-notifications` is always-on.** Read `.github/skills/ntfy-notifications/SKILL.md` at the start of every task and follow it. See **Notifications (do not skip)** below — before ending ANY turn where you completed work, reached a milestone, hit an error, or need the user's input, you MUST have sent a notification. This applies even to the "which validation level?" question.

## 🚫 Hard rule: EMULATOR-ONLY. NEVER PRD / REAL DATA

Always run and validate against the **local Firebase emulator stack** (`npm run dev`, tab shows `[LOCAL]`). The coding agent must **never** use `npm run dev:prd`, `--use-emulator false`, `firebase serve`, or any real-project data path for validation, reproduction, or testing — unless the user explicitly asks for production work. If a page tab shows `[LOCAL PRD]`, that is the PRD build talking to the **real** `trip-viewer-prd` project: **stop**, rebuild in emulator mode (`node scripts/build/build.js --use-emulator true` — the default), and reload before proceeding.

## Notifications (do not skip)

Send an ntfy.sh notification on topic `DeepSeek` via the helper below **before ending any turn** that (a) completes requested work, (b) finishes a meaningful step of a multi-step task, (c) hits an error needing the user, or (d) prompts the user with a question/approval/validation request.

```bash
# One command for everything (title = short + action-oriented, NO literal emoji)
node scripts/dev/ntfy.mjs "<Title>" "<one-line body>" [--tag <emoji>] [--priority <low|default|high|urgent>] [--click <url>]
```

| Situation | Command |
|---|---|
| Task done | `node scripts/dev/ntfy.mjs "TripViewer: Done" "<what was done>" --tag white_check_mark --priority default` |
| Step of multi-step task | `node scripts/dev/ntfy.mjs "TripViewer: Step 3 of 8 done" "<what this step did + what's next>" --tag chart_with_upwards_trend --priority default` |
| Still working (long task) | `node scripts/dev/ntfy.mjs "TripViewer: Still working..." "<in progress + what's left>" --tag hourglass_flowing_sand --priority low` |
| Prompting user | `node scripts/dev/ntfy.mjs "TripViewer: Need your input" "<the exact question>" --tag question --priority high` |
| Error / blocker | `node scripts/dev/ntfy.mjs "TripViewer: Needs attention" "<what failed / what's needed>" --tag warning --priority urgent` |

**Mandatory triggers (check before ending each turn):**
- Finished the task → send **Task done** (even if you already sent a milestone ping).
- Completed a meaningful step in a 3+ step task → send **Step**.
- Long-running work (> ~5 min expected, or any single long build/test/export) → send **Still working** at the start and after each milestone; if it finishes fast, skip heartbeats and just send **Done**.
- About to ask a question, request approval, or wait for validation → send **Prompting user**.
- Something failed and needs the user → send **Error / blocker**.

If the helper ever fails (e.g. no network), fall back to `curl.exe -H "Title: ..." -H "Tags: ..." -H "Priority: ..." -d "<body>" ntfy.sh/DeepSeek`.

## Key Files & Locations

| Concern | Location |
|---|---|
| Frontend source | `public/` (copied to `dist/` at build time) |
| TypeScript | `public/assets/ts/` (compiled by esbuild) |
| CSS | `public/assets/css/` (modular: base/, components/, per-page/) |
| Translations | `public/assets/json/languages/en.json` + `pt.json` |
| Cloud Functions | `functions/src/` (TypeScript → `functions/lib/`) |
| Migrations | `functions/src/migrations/` (15 numbered files) |
| Build scripts | `scripts/build/build.js` + `inject-partials.js` |
| Task tracking | `README.md` + `scripts/utils/readme.py` |
| Firestore rules | `firestore.rules` |
| Emulator data tool | `scripts/dev/query-firestore.js` |

## Quick Commands

```bash
npm run dev              # Full dev: emulators + watch + auto-open
npm run build            # One-shot production build
npm run readme           # Update task counts + version
node scripts/dev/query-firestore.js --list-collections   # Query emulator
```

## Coding Rules

1. Use `COLLECTION.TRIPS` constants, never hardcoded collection names
2. Pages call services (`trip.service.ts`), not raw `database.ts`
3. Use `translate('dot.path.key')` for all user-facing strings
4. Use `select()`, `getID()`, `on()` from `utils/dom.ts` instead of raw DOM APIs
5. Named exports only — no `export default`
6. Vendor libs (jQuery, Bootstrap, etc.) are globals — do not import them
7. Test locally with `npm run dev` before deploying
8. Use only theme or neutral colors (see `css-ui-patterns` skill) — never introduce ad-hoc hex/rgb colors into CSS or inline styles. If a non-theme/non-neutral color is needed, request user authorization first; never add one silently

## Feature Validation

After implementing a feature request, before wrapping up, confirm how it should be validated — don't assume:

1. **Simple** — just verify the build passes (`npm run build`). Good for changes that don't meaningfully alter runtime behavior (e.g. simple refactors, typing fixes, CSS tweaks, translation updates).
2. **Complex** — simulate the user flow with Playwright against the emulators (sign in, navigate to the feature, exercise it end-to-end). Good for anything that changes user-facing behavior, data flow, or backend logic. **Requires explicit approval** — do not open a browser or run Playwright unless the user approves this validation level for the task.

**Be adaptive:**
- If the change is truly trivial (e.g. a one-line comment, a copy change, or a small non-behavioral tweak), skip the question and note that no validation is needed.
- Otherwise, ask the user which validation level applies before declaring the feature done.
