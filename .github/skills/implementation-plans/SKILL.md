---
name: implementation-plans
description: 'Use when writing, updating, or executing an implementation plan (proposal) in docs/implementation-plans/. MANDATORY: before starting work on a plan whose open questions the user has not answered, prompt the user with each question individually — never proceed on assumptions. Also covers plan structure, naming, and recording resolved decisions back into the doc.'
applyTo: 'docs/implementation-plans/**'
---

# Implementation Plans (Proposals)

Implementation/proposal docs live in `docs/implementation-plans/` as
`YYYYMMDD-<slug>.md`. A plan states the viability, grounds itself in the
codebase, lays out phases, files, open decisions, and risks — and is the single
source of truth the implementation prompts follow.

## Standard structure

1. Title + `Date` / `Status` / `Scope` / `Backlog ticket` block.
2. **Viability verdict** — a table of claim → verdict → detail.
3. **Key facts** grounded in the codebase (files, functions, existing flows).
4. **Where the proposal diverges from reality** (corrections to the original idea).
5. **End-to-end flow** (mermaid).
6. **Phases** (P0…Pn), each with concrete files and work items.
7. **Files** (New / Modified).
8. **Open decisions**.
9. **Risks & gotchas**.

## MANDATORY — prompt every unanswered open question before starting

When a plan has **open decisions** the user has not answered (neither in the doc
nor in the conversation), do **not** begin implementing. Instead:

1. Read the plan's `## Open decisions` section.
2. Send the **Prompting user** ntfy notification first (see `ntfy-notifications`).
3. Ask the user **each** open question — one per item, numbered or one prompt at a
   time. Do not skip any and do not assume a default: a missed question is worse
   than a slow turn.
4. Wait for all answers before writing any code.

## After the user answers

- Replace `## Open decisions` with a `## Resolved decisions` list (or annotate
  each item with its resolution).
- **Adapt the plan** to the answers — update scope, flow, phases, files, and any
  already-built phases so later prompts work from the corrected document.
- Only then proceed with the implementation.

## Viability-first

Assess whether the idea is even workable (CORS, missing data, API limits, etc.)
and state that verdict up front — the phases follow from it.
