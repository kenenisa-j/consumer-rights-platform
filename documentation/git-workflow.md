# Git workflow for two developers

Remote: `origin` = the GitHub repository for this project. Default branch: `main`. Currently no commits exist;
the first commit is this foundation.

## Ownership

| Area | Primary owner | Rule |
| --- | --- | --- |
| `web/` | Frontend developer | Backend developer reviews contract/API use |
| `backend/` | Backend developer | Frontend developer reviews API shape |
| `lib/contracts/` | **Both** | Change by agreement; small additive PRs; announce at the top of the PR |
| `documentation/`, `AGENTS.md` | Both | Fix what you find stale |
| `prototype/` | Nobody | Read-only reference |

Fill in names in [work-tracker.md](work-tracker.md) and add a `CODEOWNERS` file once GitHub handles are known.

## Branches

`main` is always green and deployable. Work on short-lived branches from `main`:

- `feat/<area>-<what>` (`feat/web-complaint-wizard`), `fix/<area>-<what>`, `docs/<what>`, `chore/<what>`.
- One slice per branch; merge within days, not weeks. Rebase on `main` before opening the PR.
- Protect `main` on GitHub: require PR, passing CI, no force-push, no direct commits.

## Contract-first handoffs

The frontend can move ahead of the backend by agreeing the API shape first:

1. Add or change types/endpoints in `lib/contracts` and a short note in the feature spec; get a quick review.
2. Frontend builds against a typed mock (a fake client or fixtures in `web/`, never in `backend/`).
3. Backend implements the same contract; the mock is replaced; integration verified together.

Never ship a screen whose data comes from invented fields the backend does not provide.

## Commits

- Imperative, concise, result-focused: `feat(web): add complaint wizard steps 1-3`, `fix(backend): reject skipped climb`.
- Prefixes: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`. Scope optional: `web`, `backend`, `contracts`.
- Commit each completed, verified slice. Stage only its files. Never commit `.env`, `.runtime/`, dumps, uploads.
- Do not rewrite shared history. No force-push to `main`.

## Pull requests

Use the template. State problem, changes, validation actually run, limitations. Link feature spec and prototype
pages. Keep PRs reviewable (a few hundred changed lines of real code; generated lockfile changes excepted).
The other developer reviews; address comments with new commits, squash on merge.

## Lockfile and dependencies

One root `package-lock.json`. Never hand-edit it; resolve conflicts by re-running `npm install` after merging
`package.json`. Dependency additions need a stated reason and exact pins.

## Conflicts and coordination

- Announce work touching shared files (`lib/contracts`, root `package.json`, CI, `AGENTS.md`) before starting.
- Keep the tracker current so neither of you duplicates work.
- If both agents edit docs, prefer small commits and pull often.

## Migrations

Two people creating migrations in parallel conflict. Coordinate: one migration per PR, timestamped names, rebase
and regenerate if another landed first. Never edit an applied migration.
