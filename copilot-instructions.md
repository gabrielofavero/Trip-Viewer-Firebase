# TripViewer Project Instructions

## Project Identity

This is **TripViewer** — a vanilla TypeScript/JavaScript single-page application for planning and managing trips, destinations, expenses, and itineraries. Firebase Firestore (database), Firebase Auth (authentication), and Firebase Hosting (deployment). No framework, no bundler. Custom Node.js build pipeline with esbuild + HTML partial injection.

- **Language:** English (code, comments, identifiers). Portuguese only in user-facing i18n strings.
- **Version:** auto-calculated from completed tasks in README.md (currently 2.30.x).

## Skills

This workspace has **12 domain-specific agent skills** in `.github/skills/`. These are registered skills that Copilot discovers automatically — you do NOT need the user to invoke them with `/`. Load them proactively:

| Skill | When to Read |
|---|---|
| `browser-navigation` | Building TripViewer page URLs (t/d/l/e), emulator sign-in, waiting for Firestore-backed content, Loading Error triage |
| `query-firestore` | Reading the local Firestore emulator data |
| `data-model` | Understanding Firestore schemas, PIN-protected storage, security rules |
| `build-pipeline` | Building, watching, debugging the build process |
| `firebase-emulators` | Starting/stopping emulators, seeding data |
| `migration-system` | Running/creating Firestore data migrations |
| `css-ui-patterns` | CSS architecture, dark mode, component styles |
| `typescript-conventions` | Module organization, page routing, service layer, coding conventions |
| `i18n-system` | Translations, language switching, JSON language packs |
| `backup-restore` | Account backup/restore, document export/import |
| `backlog-management` | README task IDs, readme.py script |
| `git-workflow` | Branch strategy, commit conventions, sync/deploy flow |

**Rules for using these skills:**
1. **Before answering any question that touches one of these domains, you MUST read the matching `SKILL.md` first** — never answer from general knowledge.
2. The file-scoped skills (e.g. `typescript-conventions`, `css-ui-patterns`, `i18n-system`, `build-pipeline`, `migration-system`, `firebase-emulators`, `backup-restore`, `backlog-management`, `git-workflow`) are auto-loaded via their `applyTo` globs when you touch matching files — do not skip them.
3. The task-scoped skills (`browser-navigation`, `query-firestore`, `data-model`) have no `applyTo`; load them based on the task description match. For `browser-navigation`, read it only when the task requires URL building, emulator sign-in, waiting for Firestore-backed content, or `Loading Error` triage — for a trivial re-check of an already-loaded/verified page, skip it and just re-read the page.
4. **Browser / Playwright requires explicit approval.** Do NOT open the integrated browser, navigate pages, click/type, take screenshots, or drive the app with Playwright unless the user has explicitly approved browser validation for the current task. When a task could be checked in the browser but the user hasn't approved it, **ask first** — don't assume. Prefer non-browser verification (`npm run build`, `query-firestore`, reading code) unless approval is given.

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

## Feature Validation

After implementing a feature request, before wrapping up, confirm how it should be validated — don't assume:

1. **Simple** — just verify the build passes (`npm run build`). Good for changes that don't meaningfully alter runtime behavior (e.g. simple refactors, typing fixes, CSS tweaks, translation updates).
2. **Complex** — simulate the user flow with Playwright against the emulators (sign in, navigate to the feature, exercise it end-to-end). Good for anything that changes user-facing behavior, data flow, or backend logic. **Requires explicit approval** — do not open a browser or run Playwright unless the user approves this validation level for the task.

**Be adaptive:**
- If the change is truly trivial (e.g. a one-line comment, a copy change, or a small non-behavioral tweak), skip the question and note that no validation is needed.
- Otherwise, ask the user which validation level applies before declaring the feature done.
