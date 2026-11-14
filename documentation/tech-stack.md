# Tech stack

Same families and exact pins as the AddisB2B repo, so code, skills and operations scripts are portable
between them. **Pin exact versions** (no `^`/`~`) in every `package.json`; the lockfile is committed.
Versions below are the AddisB2B pins at the time of writing; at scaffold time check for security
advisories (`npm audit`) and bump deliberately, noting it in the changelog.

| Area | Choice | Pin | Notes |
| --- | --- | --- | --- |
| Runtime | Node.js | 24 LTS (`>=22.12 <25`) | `.nvmrc`, CI uses 24 |
| Language | TypeScript | 5.7.3 | `strict: true` everywhere |
| Frontend | Next.js (App Router) | 16.4.3 | AddisB2B bumped from 16.3.8 for advisories |
| UI | React | 19.2.8 | |
| Styling | Prototype CSS, ported verbatim (no framework) | n/a | [ADR-0003](decisions/0003-frontend-styling.md), accepted |
| Backend | NestJS | 11.2.6 (`common`, `core`, `platform-express`) | Express 5.2.1 |
| Rate limiting | @nestjs/throttler | 6.5.0 | |
| Validation | class-validator / class-transformer | 0.15.1 / 0.5.1 | DTOs at every boundary |
| Database | PostgreSQL | 16 | Docker image `postgres:16.15-bookworm` |
| ORM | Prisma + `@prisma/adapter-pg` | 7.9.0 | split schema files per module |
| Auth | Better Auth | 1.7.14 | cookie sessions, own prefix |
| Logging | pino | 9.7.0 | structured, no personal data |
| Images | sharp | 0.35.5 | evidence thumbnails, validation |
| Tests | `node:test` + browser checks | built in | add Playwright only by ADR |
| CI | GitHub Actions | `actions/checkout@v4`, `setup-node@v4` | Ubuntu + Windows |

## Rules for dependencies

- A new dependency needs a reason in the PR: what it does, why not the existing stack, size and maintenance.
- No dependency that phones home, loads remote fonts/scripts at runtime, or needs network after build
  (government deployments may be offline). Self-host fonts; the prototype font stack is system fonts
  with Ethiopic fallbacks (`Noto Sans Ethiopic`, `Nyala`, `Ebrima`).
- Never add a package only to avoid writing ten lines.
- `.npmrc` sets `legacy-peer-deps=true` because Better Auth lists optional peers we do not use.
- Run `npm audit` before handoff; fix or document every high/critical finding.

## Planned workspace layout

```text
consumer-rights-platform/
  web/            Next.js app            (frontend owner)
  backend/        NestJS app + prisma/   (backend owner)
  lib/contracts/  shared definitions     (both; change by agreement)
  scripts/        Node operations + validate
  documentation/  these docs
  prototype/      read-only reference copy of the HTML prototype
  tests/          cross-cutting tests (contracts, integration)
```

`web` and `backend` are added to root `workspaces` when scaffolded.
