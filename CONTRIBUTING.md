# Contributing

## Start with context

Read [AGENTS.md](AGENTS.md), the [agent guide](documentation/agent-guide.md), the
[domain model](documentation/domain-model.md) and, for UI work, the
[prototype guide](documentation/prototype-guide.md). The prototype and requirements are planning inputs; confirm
acceptance scope for each change. Use a focused branch and a pull request
([git workflow](documentation/git-workflow.md)).

## Ownership boundaries

- `web/` presentation and same-origin transport. `backend/` APIs, authorization, data access, rules.
- `lib/contracts/` shared definitions only; change by agreement of both developers.
- Protected handlers declare `RequirePermission`; organization and jurisdiction scoping lives in server queries.
- Keep source and docs below 400 lines, controllers below 250, components below 350, tests below 600.
- Windows and Linux operations live in shared Node scripts.
- Never copy databases, credentials, uploads or business modules from AddisB2B or Hemin. Record any adapted
  pattern in the PR description.

## Local workflow

```sh
npm ci
npm run check        # validate + test + typecheck + build
```

## Review gates

`npm run check`, `npm audit`, permission and privacy review
([security and privacy](documentation/security-and-privacy.md)), and for visible changes browser evidence at
360, 768 and 1280 px ([testing](documentation/testing-and-verification.md)). Documentation-only changes need
link and content checks (`npm run validate`).

## Data and migrations

Commit schema changes with a reviewed Prisma migration; explain data effects and recovery. Never rewrite an
applied migration. Keep `.env`, `.runtime/`, dumps, real identities and uploads out of commits. Use fictional data.

## Commit messages

Concise and result-focused, such as `docs: clarify setup` or `fix(backend): reject skipped climb`. Update the
[changelog](CHANGELOG.md) for meaningful product or operational changes, and the
[work tracker](documentation/work-tracker.md) for every completed slice.
