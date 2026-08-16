---
name: ntfy-notifications
description: 'ALWAYS keep the user notified via ntfy.sh (topic DeepSeek). Fire when: a task is done, a milestone/step completes, long-running work is in progress, before prompting/asking the user anything, or on error. Read this skill at the start of EVERY task and send a notification before ending any turn that completes work or needs input — do not skip even for quick or trivial turns.'
---

# ntfy.sh Notifications (Task Done / Prompt)

TripViewer uses [ntfy.sh](https://ntfy.sh) to notify the user when a task is done or when their input is needed. The topic is **`DeepSeek`**. This lets the user step away from the computer and come back only when there's something to see or answer.

**ALWAYS send a notification** in these situations — there are NO exceptions, not even for quick turns:

1. **Task completed** — after finishing the requested work (build passed, changes made, analysis done, etc.)
2. **Milestone completed** — when you finish a meaningful step within a multi-step task (e.g. "step 3 of 8 done")
3. **Status update / still working** — during long-running work, send check-ins so the user knows progress is happening
4. **Prompting the user** — right before you ask the user a question, request approval, or wait for input/validation (including the "which validation level?" question)
5. **Error / needs attention** — if something failed and you need the user to act

---

## Commands

Use the project helper (`scripts/dev/ntfy.mjs`) — one command for everything, no curl quoting issues:

```bash
node scripts/dev/ntfy.mjs "<Title>" "<one-line body>" [--tag <emoji>] [--priority <low|default|high|urgent>] [--click <url>]
```

### Task done
```bash
node scripts/dev/ntfy.mjs "TripViewer: Done" "<one-line summary of what was done>" --tag white_check_mark --priority default
```

### Need user input / prompt
```bash
node scripts/dev/ntfy.mjs "TripViewer: Need your input" "<the exact question in one line>" --tag question --priority high
```

### Error / urgent attention
```bash
node scripts/dev/ntfy.mjs "TripViewer: Needs attention" "<what failed / what is needed>" --tag warning --priority urgent
```

### Milestone completed (a step of a multi-step task)
```bash
node scripts/dev/ntfy.mjs "TripViewer: Step 3 of 8 done" "<what this step accomplished + what's next>" --tag chart_with_upwards_trend --priority default
```

### Status update / still working (long-running tasks)
```bash
node scripts/dev/ntfy.mjs "TripViewer: Still working..." "<what's in progress + what's left>" --tag hourglass_flowing_sand --priority low
```

### Add a clickable URL (optional)
```bash
node scripts/dev/ntfy.mjs "TripViewer: Done" "Preview ready" --click http://localhost:5000
```

If the helper is unavailable (no Node, no network), fall back to curl:
```bash
curl -H "Title: TripViewer: Done" -H "Tags: white_check_mark" -H "Priority: default" -d "<one-line summary>" ntfy.sh/DeepSeek
```

---

## Mandatory checklist (run before ending ANY turn)

Before you finish your response, confirm you have sent ONE of the following (send a new one for each new situation):

- [ ] Finished the requested work → **Task done** (send even if you already sent a milestone ping)
- [ ] Completed a meaningful step of a 3+ step task → **Step**
- [ ] Long work in progress (> ~5 min expected, or any single long build/test/export running) → **Still working**
- [ ] About to ask a question / request approval / wait for validation → **Prompting user**
- [ ] Something failed and needs the user → **Error / blocker**

If you cannot check any of these boxes for a given turn, you probably aren't in a situation that needs one (e.g. a pure read-only status answer with no work done and no question asked).

---

## Formatting rules

- **The title is the most important part** — the user reads only the title to decide whether to come back. Keep it short and action-oriented: state what's needed or that the task is done.
- **Emoji comes from `Tags` only.** ntfy renders the tag as the emoji (e.g. `white_check_mark` → ✅, `question` → ❓, `warning` → ⚠️). Do **not** also put a literal emoji in the `Title`, or the notification will show a double icon (e.g. ✅✅).
- **Body: one line only.** Just enough context (e.g. "Build passed — new version 2.30.x", "Approve browser validation?").
- **Milestones/status include progress context** so the user can gauge time: e.g. "Step 3 of 8 — about half done", "Installing deps, ~3 min left".
- If there's a URL the user should open, add `-H "Click: <url>"` (e.g. `Click: http://localhost:5000`).

## When to send milestones & status updates

- **Multi-step tasks (3+ steps):** notify at each milestone completion, then one final "Done" at the end.
- **Long-running tasks (big builds, test suites, long migrations, large exports):** send a **"Still working"** ping as soon as you start the long operation (so the user knows it began), then one after each meaningful checkpoint/milestone, then a final **"Done"**. A single long tool call (e.g. a multi-minute build) also deserves a **"Still working"** ping right after it completes if the task isn't finished yet. If the task finishes quickly (< ~5 min), skip the heartbeats and just send the final "Done".
- **Never spam:** status heartbeats use `Priority: low` so they don't buzz — save `high`/`urgent` for prompts and errors.
- **Every turn that matters gets a ping.** The most common miss is finishing a turn (work done, or a question asked) with no notification — always fire before you end your response.

## Priority guidance

| Situation | Priority |
|---|---|
| Status update / still working (heartbeat) | `low` |
| Milestone completed (step done) | `default` |
| Task done (informational) | `default` |
| Waiting on user input (non-urgent) | `high` |
| Blocker / error / user must act now | `urgent` |

## Windows / PowerShell note

**Prefer the helper** `node scripts/dev/ntfy.mjs` — it avoids the PowerShell `curl` alias problem entirely. If you must use raw curl, PowerShell's `curl` is an alias for `Invoke-WebRequest`; use **`curl.exe`** instead (same flags). Example:
```bash
curl.exe -H "Title: TripViewer: Done" -H "Tags: white_check_mark" -d "done" ntfy.sh/DeepSeek
```
