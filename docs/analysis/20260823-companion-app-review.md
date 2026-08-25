# Companion App for Remote Copilot Access — Review (2026-08-23)

Review of how to get **this exact VS Code/Copilot agent experience** while away from home,
driven from a phone over mobile data. Covers **existing solutions** and a **custom bridge**,
with a phased recommendation.

## The ask, restated

1. Before leaving home, start a small server that listens for API calls.
2. From mobile data, send a message (exactly like this chat).
3. The agent (DeepSeek Flash via Copilot) starts working on the repo, like it does here.
4. It messages back whenever it needs input — push-style, like this chat.

## The key constraint: what "the agent" actually is

The agent in this chat is the **VS Code Copilot Chat agent** running inside the VS Code GUI.
It carries:

- project skills (`.github/skills/*`) and repo memory
- `AGENTS.md` + `copilot-instructions.md`
- terminal + build + git access, browser tools, the full workspace

**There is no supported public API to drive that exact agent headlessly from a phone.**
So every viable solution picks one of two shapes:

| Shape | What it means | Existing | Custom |
|---|---|---|---|
| **A. Reuse the full VS Code remotely** | The same VS Code + Copilot + skills, rendered on the phone | Remote Tunnels, Codespaces | thin launcher script only |
| **B. Headless agent + chat bridge** | A server runs a terminal agent (Copilot CLI / OpenHands / LLM API) and shuttles messages to your phone | OpenHands, ntfy | a small Node "bridge" server |

---

## Existing solutions (already exist)

### 1. ⭐ VS Code Remote Tunnels — the #1 candidate (built-in, free, zero code)

Built into VS Code. The home PC runs a tunnel; you open a `vscode.dev/tunnel/...` URL in any
browser — including a phone — sign in with your GitHub/Microsoft account, and you get **the
same VS Code, the same Copilot Chat, the same project skills** on your phone.

- Start: `code tunnel` (or `Remote Tunnels: Turn on Remote Tunnel Access…` from the Command
  Palette). To "turn on the server and go": `code tunnel service install` runs it as a service,
  and `code tunnel --no-sleep` keeps the machine awake.
- It is literally "this chat on the phone": full Copilot agent mode, skills, terminal, diff
  review, everything.
- **Caveats:** one client at a time; the machine must stay awake; mobile browser UI is usable
  but cramped; auth is your GitHub/Microsoft account (no inbound firewall changes needed).

### 2. GitHub Codespaces

A browser-based VS Code pointed at a cloud copy of the repo. Great anywhere, but it is **not
your machine** — no local Firebase emulators, no local-only secrets/tools unless you add them,
and it doesn't match the "turn on a little server at home" mental model. Keep as a fallback.

### 3. OpenHands Agent Canvas (formerly OpenDevin) — self-hosted agent server

Open source (MIT), runs on a home machine/server (Docker or Node), and gives you:

- a **web UI + REST API** to start conversations from any browser,
- **automations** triggered by webhooks (Slack, GitHub, Datadog…) or on a schedule,
- **bring-your-own-model** — can point at DeepSeek,
- it runs **OpenHands, Claude Code, Codex, Gemini, or any ACP-compatible agent**,
  on local, remote, or cloud backends.

This is the closest to "a little server that listens and runs the agent while I chat with it."
**Caveats:** it is *not* the VS Code Copilot agent — different context (no `.github/skills`
auto-loading, no VS Code extensions). You'd hand it the repo + the skills docs and configure
the model. It has full filesystem access by default, so read its `SELF_HOSTING.md` security
hardening before exposing it.

### 4. ntfy.sh — the messaging backbone (already in use here)

Not a full solution, but the right push channel and already wired into this repo (topic
`DeepSeek`). Relevant capabilities for a companion app:

- push notifications to the phone app (title, priority, tags/emoji),
- **Markdown** body (code blocks) and **attachments** (screenshots/logs),
- **action buttons** — including an `http` action that POSTs back to a URL (great for
  "Approve ✓ / Reject ✗" buttons),
- **publish-as-JSON** and **webhooks**, so a phone shortcut/script can publish a message,
- **message caching** (survives temporary phone disconnects) and scheduled delivery.

### 5. Honorable mentions

- **Tailscale** — secure overlay network so your phone can reach the home server without
  exposing ports (pair with any option below).
- **Copilot CLI over a phone SSH/terminal app** (Blink, Termius, iSH) — works but a bad UX for
  chat-style messaging.
- **Cline / Roo Code in VS Code** — they run inside VS Code, so they already ride along with
  Remote Tunnels; not a separate solution.

---

## Custom solution (made by us)

### Architecture A — Tunnel-first (thinnest custom layer)

Wrap option 1 in a small launcher so "turn on the server" is one command:

- `npm run companion:start` → starts `code tunnel service` + `--no-sleep`, prints the
  `vscode.dev/tunnel/…` URL (and pings it to the phone via ntfy with the link).
- Effort: ~30 min of scripts. This is mostly the existing solution with convenience glue.

### Architecture B — Chat bridge (real custom work)

A small **Node server** (fits this repo's stack — it already runs Node scripts) that:

1. **Listens for inbound messages.** Two options:
   - *ntfy-as-inbox (recommended):* the phone publishes to a private topic; the server
     subscribes (outbound-only, no inbound port to expose — safer).
   - *HTTP endpoint:* expose `POST /msg` behind a token, or via Cloudflare Tunnel/Tailscale.
2. **Runs the headless agent.** Two engine choices:
   - **GitHub Copilot CLI in agent mode** (`copilot` CLI) — same Copilot subscription, reads
     `AGENTS.md`/`copilot-instructions.md`, edits files, runs commands. This is the closest
     "same agent" headless option; the project's custom skills in `.github/skills` won't
     auto-load the same way they do in VS Code, but the instruction files are honored.
   - **Direct LLM API** (e.g. DeepSeek) with a small custom agent loop that reuses the skills
     docs + repo memory as context, plus a tool runner (git, `npm run build`, file edits).
     Most control, most work, diverges from "the same agent."
3. **Sends replies back to the phone** via **ntfy.sh** — Markdown, code blocks, and
   approve/reject action buttons that POST the user's answer back into the loop (full duplex).
4. **Queueing/concurrency**: serialize agent runs (one job at a time), persist a session log,
   and ping status/`still working` heartbeats (the project already has `scripts/dev/ntfy.mjs`).

**Effort estimate:** ~1–2 days for a solid bridge (auth token, ntfy in/out, Copilot CLI
subprocess with streaming, one-job-at-a-time queue, session log), plus security hardening.
Biggest risk: **agent fidelity** — Copilot CLI ≠ VS Code Copilot Chat; skills auto-discovery
and the workspace GUI are lost, and interactive prompts (e.g. the "browser validation
approved?" question) must be re-expressed as ntfy action buttons.

---

## Recommendation (phased)

| Phase | What | Effort | Fidelity to "this chat" |
|---|---|---|---|
| **1. Today** | **VS Code Remote Tunnels** + a one-command launcher that auto-starts the tunnel service and pings the URL to the phone via ntfy | ~30 min, no new deps | 🟢 100% — same VS Code + Copilot + skills on the phone browser |
| **2. Optional** | **ntfy chat bridge** wrapping the Copilot CLI agent mode, for push-style chat without the full IDE | ~1–2 days | 🟡 high — same model/repo context, but skills are instructions-only |
| **3. Optional** | **OpenHands Agent Canvas** on a home/mini server, pointed at DeepSeek, with Slack/webhook triggers | ~half a day to stand up + hardening | 🟠 different agent — best for always-on automations, not the exact chat |

**Go Phase 1 first.** It is the only option that is *literally this chat*, it's free, built-in,
and needs no new infrastructure. Only build Phase 2 if you find the phone browser IDE painful
and want plain push-style messaging. Only reach for Phase 3 if you want scheduled/webhook
automations ("every morning, run X") rather than interactive sessions.

## Risks & notes

- **Security:** anything internet-reachable must be token/account-gated. Prefer outbound-only
  (ntfy) or Tailscale/Cloudflare Tunnel over opening an inbound port on the home router.
- **Machine must stay awake:** use `code tunnel --no-sleep` / a service; a sleeping PC ends
  all of these options.
- **Remote Tunnels is single-client:** one browser at a time.
- **Firebase emulators are local:** fine — the agent runs on the home machine, so localhost
  works. Only the *phone* is remote.
- **Fidelity ceiling:** the exact VS Code skills + repo-memory experience is only preserved by
  Remote Tunnels (or any VS Code remote host). Headless agents approximate it via instruction
  files.
