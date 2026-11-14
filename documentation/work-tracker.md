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

## Completed: Phase 3 — Better Auth Integration, 13 November 2026

- **Better Auth & Prisma Adapter Integration:**
  - Pinned `better-auth@^1.1.21` and `@better-auth/prisma-adapter@^1.1.21` in `backend/package.json`.
  - Configured Better Auth with PostgreSQL Prisma adapter, session lifecycle (7 days expiration, 1 day update age, 5 min cookie cache), and field mappings (`fullName` -> `name`).
  - Strict field protection configured on `User`: `status` (`returned: false`, `input: false`), `nationalIdFayda` (`returned: false`, `input: false`), `preferredLanguage` (`returned: true`, `input: true`).
- **Phone-First Citizen Authentication & Prevention Hook:**
  - Configured `phoneNumber` plugin with 6-digit OTP, 300s TTL, 3 allowed attempts, rate limiting, and synthetic email bridge (`getTempEmail`).
  - Added `databaseHooks.user.update.before` intercepting and rejecting phone number removal/nullification with `APIError('BAD_REQUEST')` (HTTP 400), safeguarding PostgreSQL `NOT NULL` constraint without 500 DB driver crashes.
- **Atomic Consumer Registration:**
  - Implemented `POST /api/auth/register-consumer` with `RegisterConsumerDto` (validating E.164 phone format, 6-digit OTP, min-8 password, min-2 name).
  - Consumes and verifies OTP via Better Auth server-side API; on invalid/expired OTP, rejects immediately.
  - Generates password hash via Better Auth cryptographic hasher (`auth.$context.password.hash`).
  - Runs inside `prisma.$transaction`: creates `User` (with `phone_number_verified: true`), `Account` (`providerId = 'credential'`), and links server-controlled `CONSUMER` role. Rolls back completely on failure.
  - Automatically establishes session via `auth.api.signInPhoneNumber(..., { asResponse: true })` and forwards genuine Better Auth `Set-Cookie` headers.
- **Express 5 & NestJS Middleware Integration:**
  - `main.ts` configured with `NestFactory.create(AppModule, { bodyParser: false })`.
  - Mounted Better Auth catch-all at `/api/auth/*splat` (Express 5 syntax) before `express.json()` and `express.urlencoded()`.
- **Authoritative Permission Guard:**
  - Updated `PermissionGuard` to resolve Better Auth session using `fromNodeHeaders(req.headers)`.
  - Missing/invalid session throws `401 Unauthorized`.
  - Inactive/suspended user in live PostgreSQL query throws `403 Forbidden`.
  - Permission checks evaluate authoritative live user roles/permissions against required policy.
- **SMS Provider Abstraction:**
  - `SmsProvider` interface and `MockSmsService` with test history inspection and safe production logging (no raw OTP leaks).
- **Prisma Schema & Migration SQL:**
  - Updated `User` model with `emailVerified`, `phoneNumberVerified`, `image`, `sessions`, and `accounts`.
  - Added `Session`, `Account`, and `Verification` models.
  - Generated migration SQL at `backend/prisma/migrations/20261113150000_add_better_auth/migration.sql` (unapplied).
- **Test Suite:** Created `tests/better-auth.test.mjs` verifying all 10 required scenarios.

## In progress: Phase 2C — NestJS backend foundation, 12 November 2026

### Initial PostgreSQL Migration Completion (Unapplied)

- **Completed Migration SQL:** `backend/prisma/migrations/20261112195102_init/migration.sql` augmented with custom database requirements from `docs/database-design.md`:
  - `chk_case_dual_routing`: Enforces Route A (mandatory `current_office_id`, `escalated_to_gov_at IS NULL`, registered and unregistered mutual exclusion, required unregistered merchant name if details provided) and Route B (mandatory `merchant_id`, unregistered fields NULL, synchronized `current_office_id` and `escalated_to_gov_at` pre- and post-escalation).
  - 4 Partial Unique Indexes: `idx_user_single_active_office` on `user_offices(user_id) WHERE is_active = TRUE`, `idx_case_single_active_assignment` on `case_assignments(case_id) WHERE is_active = TRUE`, `idx_case_single_pending_transfer` on `case_transfers(case_id) WHERE status = 'PENDING_ACCEPTANCE'`, and `idx_case_single_merchant_negotiation` on `conversations(case_id) WHERE kind = 'CONSUMER_BUSINESS'`.
  - Atomic Reference Generator Trigger: `generate_case_reference()` plpgsql function incrementing `annual_case_sequences` with row-level locking per calendar year (`Africa/Addis_Ababa`), 5-digit ceiling check (> 99999 raises exception), and `trg_generate_case_reference` firing `BEFORE INSERT` when `reference_number` is NULL or empty (preserving test fixtures).
- **Relational & Immutability Verification:** Verified generated foreign keys against database design; `case_history`, `messages.attachment_evidence_id`, `anonymous_report_audit_logs`, and `case_audit_logs` use `ON DELETE RESTRICT`.
- **Safety Status:** **Migration remains unapplied.** No `prisma migrate deploy`, `dev`, or database writes were performed.

### NestJS + Prisma 7 PostgreSQL Integration (Phase 2)

- **Prisma Service:** Created `backend/src/lib/database/prisma.service.ts` extending `PrismaClient` with `@prisma/adapter-pg` driver adapter using connection pooling (`pg.Pool`).
  - Reads `DATABASE_URL` via `ConfigService`.
  - Implements `OnModuleInit` to connect on startup and `OnModuleDestroy` to disconnect and close the pool on shutdown.
  - Masks passwords from any database error strings (`sanitizeMessage`).
  - Implements safe connectivity verification method `ping()` returning boolean without exposing internal database errors.
- **Prisma Module:** Created `backend/src/lib/database/prisma.module.ts` marked `@Global()` and exporting `PrismaService`.
- **App Module Registration:** Imported `PrismaModule` into `backend/src/app.module.ts`.
- **Health Endpoint Integration:** Updated `HealthController` at `/api/health` to query `prisma.ping()` and report safe status (`pass`/`fail`, database: `connected`/`disconnected`) without exposing database credentials or internals.
- **Safe Verification Script:** Added `scripts/verify-db-connection.mjs` to test live PostgreSQL connectivity using `pg` and `.env` credentials, logging sanitized status and verifying server readiness.
- **Tests Added:** Updated `tests/backend-foundation.test.mjs` with test suite 7 verifying `PrismaService`, driver adapter usage, lifecycle hooks, ping method, `@Global()` module registration, and `AppModule` wiring.
- **Prisma Schema & DB Safety:** `backend/prisma/schema.prisma` and `prisma.config.ts` untouched. No migrations created, no schema or table modifications.

### NestJS Backend Application Scaffolding (Phase 1)

- **Workspace Registration:** Root `package.json` updated with `"workspaces": ["lib/*", "backend"]`.
- **Backend Package:** Initialized `backend/package.json` (`@consumer-rights/backend`, private, Node engine `>=22.12.0 <25`) with NestJS 11 dependencies (`@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express`, `@nestjs/config`, `class-validator`, `class-transformer`, `helmet`, `rxjs`, `reflect-metadata`) and dev dependencies (`@nestjs/cli`, `@nestjs/schematics`, `@nestjs/testing`, `typescript`, `@types/node`, `@types/express`, `supertest`).
- **TypeScript & Nest Configuration:** Added `backend/tsconfig.json` (strict TypeScript, decorator metadata enabled), `backend/tsconfig.build.json`, and `backend/nest-cli.json`.
- **Application Structure:**
  - `backend/src/main.ts`: Bootstrap with global prefix `/api`, helmet security headers, CORS from `PUBLIC_URL`, global `ValidationPipe` (whitelist + forbidNonWhitelisted + transform), and graceful shutdown hooks.
  - `backend/src/app.module.ts`: Root module wiring configuration, health module, global `PermissionGuard`, `AllExceptionsFilter`, and `TransformInterceptor`.
  - `backend/src/lib/config/`: `env.validation.ts` validating `API_PORT` (default: 4300), `API_HOST` (default: '127.0.0.1'), `PUBLIC_URL`, `NODE_ENV`, and production secret presence; `config.module.ts` setting up global `ConfigModule`.
  - `backend/src/lib/common/decorators/`: `@Public()` and `@RequirePermission(...permissions: string[])`.
  - `backend/src/lib/common/guards/`: `PermissionGuard` failing closed on undeclared policies, allowing `@Public()`, and establishing the Phase 3 Better Auth integration boundary.
  - `backend/src/lib/common/filters/`: `AllExceptionsFilter` formatting errors into the shared contracts `ApiFailure` envelope (`{ ok: false, error: { code, message, fields } }`) without leaking stacks in production.
  - `backend/src/lib/common/interceptors/`: `TransformInterceptor` formatting responses into the shared contracts `ApiSuccess` envelope (`{ ok: true, data }`).
  - `backend/src/lib/health/`: `HealthController` exposing `@Public()` GET endpoint at `/api/health` returning status, uptime, and timestamp; `HealthModule`.
- **Tests Added:** `tests/backend-foundation.test.mjs` verifying environment validator constraints, health controller response shape, envelope compliance with `@consumer-rights/contracts`, authorization metadata decorators, controller permission policy symmetry, and workspace package setup.
- **Backend Ownership:** Updated `backend/AGENTS.md` to scaffolded state.
- **Prisma Boundary Preserved:** `schema.prisma`, `prisma.config.ts`, and `database-design.md` untouched. Prisma client generation and PostgreSQL adapter deferred to Phase 2.

### Database integrity corrections (session 2)

- **CaseHistory model added** to `backend/prisma/schema.prisma` (append-only audit trail):
  - Fields: `fromStatus?`, `toStatus`, `handlingLevel` (String, includes "business"), `officeId?`, `actorUserId`, `publicNote?`, `createdAt`.
  - All three FKs use `onDelete: Restrict` (immutability enforced at DB permission layer, not Prisma alone).
  - Reverse relations added to `Case` (`history`), `User` (`caseHistoryLogged`), `AdministrativeOffice` (`caseHistoryEntries`).
  - Indexes: `[caseId, createdAt]`, `[actorUserId]`, `[officeId]`.
- **Route A merchant validation corrected** in `lib/contracts/index.js` and `lib/contracts/index.d.ts`:
  - `validateRouteA()` rewritten: registered + unregistered merchant details are mutually exclusive; `escalatedToGovAt` must be null; empty-string guards on all string fields.
  - `RouteAInput` converted to discriminated union (`RouteANoMerchantInput | RouteARegisteredMerchantInput | RouteAUnregisteredMerchantInput`).
  - `validateRouteB()` updated to explicitly reject all three unregistered merchant fields.
- **FK deletion policies hardened:**
  - `AnonymousReportAuditLog`: changed `onDelete: Cascade` → `onDelete: Restrict` (audit immutability).
  - `Message.attachmentEvidence`: changed `onDelete: SetNull` → `onDelete: Restrict` (legal evidence protection).
- **Performance indexes added:** `categoryId` and `marketId` on `Case`; `userId` on `ConversationParticipant`; `status` and `marketId` on `AnonymousReport`; `caseId` on `Notification`; `senderUserId` on `Message`.
- **Route A `CONSUMER_BUSINESS` conversation restriction** documented: enforced transactionally by NestJS service reading `cases.route` before inserting; partial unique index limits quantity but cannot prevent Route A cases from having this kind without application logic.
- **SQL constraint `chk_case_dual_routing`** in `docs/database-design.md` corrected to cover: `escalated_to_gov_at IS NULL` for Route A; all three unregistered fields prohibited for Route B; registered + unregistered conflict prevention.
- **`docs/database-design.md` Section 3.4 `case_history`** updated to reflect Prisma model (enum, correct FK behavior, immutability note).
- **Tests updated** (`tests/contracts.test.mjs`): 3 new Route A/B tests replacing 2 old ones; 11 assertions covering valid cases, conflict rejection, missing fields, escalation state, unregistered field prohibition.
- **Open questions Q21–Q24** preserved exactly as numbered in `documentation/open-questions.md`.
- **`npx prisma validate`**: schema passes (Prisma 7.8.0, datasource url removed, `prisma.config.ts` added).
- **`npm run check`**: command execution blocked in sandbox; must be run locally to confirm.

### Database design & initial setup (session 1)

- **What:** Initialised NestJS application structure in `backend/`. Defined reconciled Prisma schema (28 models, 10 enums) and database architecture specification (`docs/database-design.md`).
- **Database Integrity & Dual Routing Corrections:**
  - Route A merchant identification: allowed optional `merchantId` while requiring government office; preserved optional unregistered merchant fields; prohibited bilateral negotiation on Route A.
  - Route B integrity: requires `merchantId`; forbids unregistered fields; office is null pre-escalation and assigned upon escalation; withdrawal allowed pre-escalation without requiring an office.
  - Office validation: retained single foreign key ensuring office exists; documented NestJS transactional verification via `officeBelongsToLevel()` and active check; documented trade-off vs composite FK.
  - Reference generation: corrected to atomic annual sequence table (`annual_case_sequences`) resetting yearly in `Africa/Addis_Ababa` timezone with concurrency row-locking and 5-digit overflow protection.
  - Enum mapping: documented explicit translation between 16 database operational statuses and 13 public contract statuses, and `SettlementType` (`FULL_REFUND`/`PARTIAL_REFUND`) to contract `refund`.
- **Contracts updated:** Added `COMPLAINT_ROUTES`, `GOVERNMENT_LEVELS`,
  `isValidGovernmentLevel`, `officeBelongsToLevel`, `validateRouteA`, `validateRouteB`,
  `ComplaintRoute`, `GovernmentLevel`, `RouteAInput`, `RouteBInput`, `ComplaintRouteInput` to `lib/contracts`.
  Clarified `HANDLING_LEVELS` and `isValidClimb` as governing in-progress upward transfers/escalations
  rather than Route A initial intake. Updated tests with accurate descriptions and added Route A/Route B
  independent intake tests and office-matching validation tests.
- **Docs updated:** `docs/database-design.md`, `documentation/domain-model.md`, `documentation/open-questions.md`.
- **Not yet built:** `web/` and `backend/` app modules, NestJS controllers/services, database migrations,
  auth. Backend and database design files are untracked (not committed).
- **Known gaps:**
  - Open questions 21–24 (Route B escalation trigger/target, reference format, non-response SLA) must be answered.
  - `npm run check` at root: command execution blocked in sandbox; verified locally by developer. Statically verified.

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
