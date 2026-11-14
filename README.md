# Consumer Rights Platform

**Unified Consumer Grievance and Rights Protection Portal** for the Addis Ababa Bureau of Trade and Market
Development: consumers complain, businesses answer, and unresolved complaints climb one level at a time
(Woreda → Sub-City → City Bureau). Planned as a module of AddisB2B.

[Documentation](documentation/README.md) · [Agent rules](AGENTS.md) · [Roadmap](ROADMAP.md) ·
[Contributing](CONTRIBUTING.md) · [Security](SECURITY.md) · [Changelog](CHANGELOG.md)

## Status

**Early build.** The repository holds the rules, documentation, shared contracts and tooling, plus the `web/`
frontend scaffold with the public shell and home page (see the [frontend plan](documentation/frontend-plan.md)).
The `backend/` application is not scaffolded yet. The approved reference is the clickable HTML prototype
(~100 screens) described in the [prototype guide](documentation/prototype-guide.md). Nothing here is production
ready, and the prototype and requirements do not by themselves establish acceptance of any feature.

## Stack

Next.js 16 · React 19 · NestJS 11 · PostgreSQL 16 · Prisma 7 · Better Auth · TypeScript 5.7,
organized as an npm-workspaces monorepo. See [tech stack](documentation/tech-stack.md).

## Repository layout

| Path | Purpose |
| --- | --- |
| `web/` | Next.js frontend (scaffolded; `npm run dev -w web` on port 3300) |
| `backend/` | NestJS API, Prisma schema and migrations (planned) |
| `lib/contracts/` | Shared definitions and API types |
| `scripts/` | Node operations and `validate.mjs` |
| `documentation/` | Architecture, standards, guides, ADRs, tracker |
| `tests/` | Cross-cutting tests |
| `prototype/` | Read-only HTML prototype (reference) |

## Get started

Requires Node.js 24 LTS (`>=22.12 <25`).

```sh
git clone <repository-url>
cd consumer-rights-platform
npm ci
npm run check
```

For configuration copy `.env.example` to `.env` and follow [environment](documentation/environment.md). Start the
development database with `docker compose up -d db`.

## Working here

Humans and agents: read [AGENTS.md](AGENTS.md) and the [agent guide](documentation/agent-guide.md) before
changing anything. Two developers share this repository; follow the [git workflow](documentation/git-workflow.md).
