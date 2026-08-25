# TripViewer agent guidance

Use the Codex-native skills in `.codex/skills/` whenever their descriptions match the task. Each wrapper points to the canonical project guide in `.github/skills/`; read that canonical `SKILL.md` in full before proceeding.

Read the `ntfy-notifications` skill at the start of every task and send its required notification before ending any completed, blocked, or input-seeking turn.

Also follow the project conventions, coding rules, and validation requirements in `copilot-instructions.md`. Do not use browser/Playwright tools unless the user explicitly approves browser validation for the current task.
