# Low-Priority Backlog Review (2026-08-23)

Review of the six low-priority backlog items, ranked by **gain vs. work required**.
Findings verified against the current codebase.

## Ranking (recommended order)

| # | Task | Gain | Work | Gain/Work | Verdict |
|---|------|------|------|-----------|---------|
| 1 | **E047** Unit Tests | ★★★★★ | Medium | **Best ROI** | Do first — foundational |
| 2 | **M171** Access message | ★★ | Tiny | Quick win | Mostly done; close it out |
| 3 | **M182** Kill dev env | ★★ | Medium | Decent | Mechanical cleanup, low risk |
| 4 | **E046** Playwright | ★★★★ | High | Good (after #1) | Build on top of unit tests |
| 5 | **E019** Sonarqube | ★★ | Medium | Weak | Skip — biome already covers this |
| 6 | **E051** Encryption-at-rest | ★★★★★ | Very High | Worst ROI | Last + riskiest; needs test infra first |

---

## 1. ⚔️ E047 — Implement Unit Tests → **DO FIRST**

**Why:** highest-gain, no existing safety net. You're generating code with AI against a codebase with **zero automated tests** — one regression slips silently into prod. Tests unlock everything else on this list (they make E051 actually verifiable, and let you refactor freely).

**What's already there (less work than you think):**
- `functions/` already has **`firebase-functions-test` ^3.1.0** in devDeps — function/migration tests are partially scaffolded already.
- Pure-logic modules that are cheap to cover: `utils/dates.ts`, `utils/diff.ts`, `utils/pin.ts`, `utils/set.ts`, `i18n/translation.ts` (dot-path resolution), `backup/normalize.ts`, `backup/document-bundle.ts`, `static-export/data-gather.ts`, the service layer, migration code.

**Work:** add **Vitest** (TS-native, pairs with esbuild), write a first suite for the pure modules + a few functions tests, wire `npm test` + a GitHub Actions job. ~2–4 days for a meaningful first suite. Then make it a habit: train the AI to always add tests per feature (async in dev, or sync before build as you suggested).

---

## 2. 📈 M171 — Safeguard unauthenticated access message → **QUICK WIN (mostly done)**

Your hunch is right — **this was already shadow-done**, mostly via **F174** (edit-trip guard):

- `utils/access.ts` → `canAccessEditPage()` blocks edit pages, shows a real **"Access Denied 🚫"** dialog with distinct `unauthenticated` vs `not_owner` messages (`messages.access_denied.*` in `en.json`/`pt.json`), and routes back to index/view.
- `pages/destination/mount.ts` has an access guard that surfaces the proper message on denied reads.
- `database.ts` returns `messages.unauthenticated` on unauthenticated writes; `utils/dom.ts` has a default `access_denied` fallback.

**Remaining work:** a quick **audit pass** of the read paths on `view.html`, `expenses.html`, `itinerary.html`, `index.html` to confirm every denied read routes to the right dialog instead of a generic error. ~0.5 day. Low gain individually, but it's nearly free and closes a ticket.

---

## 3. 📈 M182 — Kill dev env → **CLEANUP, LOW RISK**

Confirmed: `trip-viewer-dev` is redundant. You have **three** projects (`prd`, `dev`, `tcc`); `tcc` is the CI-preview project (see `.github/workflows/firebase-hosting-merge.yml` → deploys to `trip-viewer-tcc`), so `dev` adds nothing for a single dev. Local emulators don't depend on the cloud project (they run in `singleProjectMode` locally).

**Touch points (mostly mechanical):**
- `firebase-config.js` — remove `configDEV`; **careful:** localhost currently defaults to dev config, must re-route to emulator/prd default.
- `scripts/build/deploy.py` — drop the dev/"both" options.
- `.firebaserc` — remove the `dev` alias.
- `workers/{places-api,image-proxy}/src/config.js` — remove `dev` origin/project (local tests use `local` mode, unaffected).
- `package.json` `dev:dev` script, `scripts/build/migrations-state.json`, `public/assets/json/version.json` dev entries.
- Skills/docs (firebase-emulators, migration-system, query-firestore, git-workflow) and README — doc-only updates (local emulator docs keep `trip-viewer-dev` as the local default project id, that's fine).

**Work:** ~0.5–1 day. **Gain:** permanent simplification of deploys/config. Good to do in the same pass as the test-infra work (both are "paying down").

---

## 4. ⚔️ E046 — Implement Playwright → **HIGH VALUE, BIGGER COMMITMENT**

**Context:** Playwright is already *used* (gmaps-scraper runs it in Docker; the browser-navigation skill drives the integrated browser ad-hoc). What's missing is a **real test suite**: `@playwright/test`, config, emulator seeding, CI job.

**Work:** ~2–3 days for a solid core suite (login, view trip, edit, PIN, expenses, static export). **Maintenance cost is the catch** — E2E suites rot if the UI changes often (and your UI changes a lot). This is why it's ranked after unit tests: layer **unit → integration → E2E**, not E2E-only.

**Note:** project instructions already require explicit approval for browser/Playwright validation — a structured Playwright suite formalizes this into a repeatable tool for the AI.

---

## 5. ⚔️ E019 — Implement Sonarqube → **SKIP (overlaps with biome)**

Your own condition was *"only if simple and free"* — it isn't simple, and the payoff is small here:

- You already run **`biome`** for lint + format (`npm run lint`/`check`). Biome covers most of what Sonar flags day-to-day (dead code, complexity, style).
- SonarQube server = self-hosted Docker + maintenance → bad for a single dev. SonarCloud = free tier exists but is fiddly (GitHub app, token, action, initial-noise cleanup) for marginal added insight over biome.
- The one genuinely useful thing Sonar adds — **coverage metrics** — is better gotten for free from **Vitest's built-in coverage** (part of E047).

**Verdict:** skip E019; if you ever want code-smell/coverage dashboards, add `@vitest/coverage-v8` instead. (Optionally discard E019.)

---

## 6. ⚔️ E051 — Encryption-at-Rest → **LAST (biggest, riskiest)**

**Current reality (verified):** protected data (reservation codes, links) is stored **in plaintext** — both in the `protected/{pin}/{id}` Firestore subcollections and in offline **static exports** (the export auto-resolves the PIN and embeds protected values in `data.json`). "Protection" today is Firestore rules + PIN gating, which does nothing once data is exported or the DB is compromised.

**What it involves (this is the big one):**
- WebCrypto design: PBKDF2(PIN) → AES-GCM key; encrypt on write / decrypt on read for all protected fields.
- **Migration** of existing plaintext protected docs (idempotent, dry-run like the other migrations).
- Rework **static export**: `data.json` now holds ciphertext → the exported page must prompt for the PIN to decrypt (or protected values stay hidden). Non-trivial change to the static-mode seam.
- Backup/restore compatibility, i18n, UI states, and security review (threat model: PIN is shareable with editors, so it's *their* key).

**Work:** realistic **3–5+ days** with real migration risk. **Gain:** genuinely high *if* sharing matters (it's the only item on this list that materially improves security) — but it's also the most likely to break data.

**Recommendation:** do **last**, only after E047 unit tests exist (crypto + migration need a test harness), and consider **scoping down** first: encrypt only the `protected/*` subcollection values + the protected values inside offline `data.json`, leave public fields alone.

---

## Suggested execution order

```
1. E047 Unit Tests  ── foundation, enables the rest
2. M171 Access msg  ── 0.5 day, closes a ticket that's 90% done
3. M182 Kill dev    ── cleanup alongside the test-infra work
4. E046 Playwright  ── E2E layer on top of unit tests
5. (skip) E019 Sonarqube
6. E051 Encryption  ── last, scoped down, only once tests exist
```
