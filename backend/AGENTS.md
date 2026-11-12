# Backend ownership (`backend/`)

Status: **not scaffolded yet.** Layout and rules: [documentation/backend-guide.md](../documentation/backend-guide.md).

- NestJS 11, PostgreSQL 16, Prisma 7 (PrismaPg), Better Auth. Shared infrastructure in `src/lib`,
  domain features in `src/modules` (one folder per module: complaints, tips, messaging, offices, content...).
- Every controller handler declares `@Public()` or `@RequirePermission(...)`. No policy = denied.
  `npm run validate` fails if a controller's routes and policies do not match.
- Restrict every record query by the authenticated membership: portal, role, office level and
  jurisdiction code (Woreda/Sub-City). A header or body value may narrow access, never widen it.
- Use Better Auth for credentials and sessions. Do not invent token or password formats.
- Case status changes and level changes go through one service that validates the transition
  (`isValidClimb`), writes the append-only history row and the audit event in the **same transaction**.
- Mutations use optimistic `version` checks where two officers could collide.
- Responses use the shared envelope (`ApiResponse` in `lib/contracts`); errors never expose stacks.
- Read generated Prisma migrations before applying. Never edit an applied migration; add a new one.
  Preserve foreign keys, indexes and append-only history (triggers block UPDATE/DELETE on history).
- Business-facing queries return the pseudonymous consumer view only. Tip queries never join identity.
- Controllers < 250 lines. Tests for every permission rule: allowed, refused, wrong office, wrong role.
