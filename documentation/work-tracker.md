# Work tracker

Newest entries first. Each entry: what, owner, evidence, known gaps. Keep it current; it is how the two of
you (and your agents) avoid duplicate or conflicting work.

## Owners

| Area | Owner |
| --- | --- |
| Frontend (`web/`) | _fill in_ |
| Backend (`backend/`) | _fill in_ |

## Active objectives

1. Confirm the foundation (this entry), then write the **frontend implementation plan** (scaffold `web/`,
   shell, tokens, label catalogue, then vertical slices from the prototype).
2. Backend implementation plan (scaffold `backend/`, auth, offices, complaints) once the contract for the first
   slice is agreed.

## Completed: project foundation, 12 November 2026

- Built: repository rules (`AGENTS.md`, `CLAUDE.md`, folder `AGENTS.md`), documentation set, ADRs, feature-spec
  template, shared `lib/contracts` (levels, roles, statuses, categories, reference codes, climb rule, alias),
  `scripts/validate.mjs` (size caps, web/backend boundary, controller policies, Markdown links), contract tests,
  CI (Ubuntu + Windows), PR/issue templates, `.env.example`, `compose.yaml` (PostgreSQL only), line-ending and
  editor config.
- Source: patterns from the AddisB2B repo (`AGENTS.md` hierarchy, validate script, documentation layout,
  security properties, pinned stack) adapted to this domain. No AddisB2B data, credentials or modules were copied.
- Not built: `web/` and `backend/` apps, database schema, auth, any screen. No dependencies are installed.
- Verified: see the foundation hand-off message (validate and contract tests run locally).

## Page traceability (fill as screens are built)

| Prototype page(s) | Route | API | Status | Evidence |
| --- | --- | --- | --- | --- |
| _none yet_ | | | planned | |
