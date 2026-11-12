# ADR-0001: npm-workspaces monorepo; stack mirrors AddisB2B

- Status: Accepted
- Date: 2026-11-12
- Deciders: project developers

## Context

Two developers split frontend and backend. The product will become a module of AddisB2B, which already uses
Next.js, NestJS, PostgreSQL, Prisma, Better Auth and an npm-workspaces layout with shared contracts.

## Decision

One repository with npm workspaces: `web/`, `backend/`, `lib/contracts/`. Use the same framework families and
exact version pins as AddisB2B ([tech-stack.md](../tech-stack.md)). Shared types live only in `lib/contracts`.
Operations are Node scripts that work on Windows and Linux.

## Consequences

- Code, skills and scripts port between the two projects; merging into AddisB2B later is cheaper.
- One lockfile and one CI. Contract changes need coordination (see [git-workflow](../git-workflow.md)).
- We inherit AddisB2B's choices (Bootstrap, Better Auth, in-process rate limits) and their limits.

## Alternatives considered

- Separate repositories for web and backend: more ceremony for a two-person team, contract drift risk.
- Different stack (for example Remix, Fastify): no reuse and a later integration cost.
