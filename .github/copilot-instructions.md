# TripViewer Copilot Skill Registration

## Registered skills

All project-specific skills are located in `.github/skills/` and must be discovered and used proactively. Before working in a skill's domain, read its `SKILL.md`; do not rely on general knowledge where the skill applies.

| Skill | Use when |
|---|---|
| `backlog-management` | MANDATORY end-of-task check: after every completed request, find/create its ticket in the backlog and move it to `Done`. Also covers updating or interpreting `README.md` tasks, IDs, counts, versions, or `readme.py` |
| `backup-restore` | Working on account/document backup or restore flows |
| `browser-navigation` | Building app URLs, browser/emulator sign-in, load-state diagnosis, or browser validation |
| `build-pipeline` | Building, watching, diagnosing build issues, or editing build configuration |
| `css-ui-patterns` | Editing CSS, UI components, themes, or visual patterns |
| `data-model` | Working with Firestore schemas, protected storage, security rules, or data access |
| `firebase-emulators` | Managing, seeding, inspecting, exporting, or importing Firebase emulators |
| `git-workflow` | Performing Git operations or creating commit messages |
| `i18n-system` | Editing translations, language packs, language switching, or translation resolution |
| `migration-system` | Creating, running, or debugging Firestore migrations — new migrations (18+) must be registered in `scripts/build/migrations-config.json` |
| `ntfy-notifications` | Every task; send the required ntfy notification before ending a completed, blocked, or input-seeking turn |
| `query-firestore` | Reading current local Firestore emulator data |
| `static-export` | Working on offline/static web export, manifests, bundled assets, or image-proxy integration |
| `typescript-conventions` | Editing TypeScript, HTML page routing, modules, services, or DOM conventions |

Honor each skill's `applyTo` scope. For task-scoped skills without `applyTo`, select them from the task itself. Read `ntfy-notifications` at the start of every task.

## Operational constraints

- Do not use Playwright or browser tools unless the user explicitly approves browser validation for the current task.
- Prefer non-browser validation unless browser validation is approved.
- Follow the full project guidance in the repository-root `copilot-instructions.md`, including coding conventions and validation requirements.
