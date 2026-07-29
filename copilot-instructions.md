# TripViewer Project Instructions

## Project Identity

This is **TripViewer** — a vanilla TypeScript/JavaScript single-page application for planning and managing trips, destinations, expenses, and itineraries. Firebase Firestore (database), Firebase Auth (authentication), and Firebase Hosting (deployment). No framework, no bundler. Custom Node.js build pipeline with esbuild + HTML partial injection.

- **Language:** English (code, comments, identifiers). Portuguese only in user-facing i18n strings.
- **Version:** auto-calculated from completed tasks in README.md (currently 2.30.x).

## Skills

This workspace has **11 domain-specific skills** in `.github/copilot/skills/`. When working on relevant files or topics, read the corresponding SKILL.md:

| Skill | When to Read |
|---|---|
| `query-firestore` | Reading the local Firestore emulator data |
| `data-model` | Understanding Firestore schemas, PIN-protected storage, security rules |
| `build-pipeline` | Building, watching, debugging the build process |
| `firebase-emulators` | Starting/stopping emulators, seeding data |
| `migration-system` | Running/creating Firestore data migrations |
| `css-ui-patterns` | CSS architecture, dark mode, component styles |
| `typescript-conventions` | Module organization, page routing, service layer, coding conventions |
| `i18n-system` | Translations, language switching, JSON language packs |
| `backup-restore` | Account backup/restore, document export/import |
| `backlog-management` | README task IDs, readme.py script, version calculation |
| `git-workflow` | Branch strategy, commit conventions, sync/deploy flow |

**Before answering questions about any of these domains, read the relevant SKILL.md first.**

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
