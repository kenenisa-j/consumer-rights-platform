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

## Completed: evidence upload and office dropdowns, 16 November 2026

- Evidence: a calm drop area (the raw browser file control is hidden), drag and drop, a tidy list with a state per file, and real storage (new `evidence` API module). Files appear on the consumer, office and business case pages with links; the consumer can add more later.
- Destination step: "A Sub-City office" shows all 11 Sub-Cities in a dropdown; "A Woreda office" asks for the Sub-City first, then shows only that Sub-City's Woredas. The place of purchase only pre-fills it. The tip form's Woreda is a dropdown that follows the Sub-City; the tip form no longer offers file upload (tips store no files).
- Test: `npm run test:browser:evidence` (22 checks).

## Completed: messenger with voice messages, business desk, 16 November 2026

- New migration `voice_messages`. New API module `messages` (list, thread, text, voice, audio) with permission `messages.use`; `GET /api/business/profile`. The microphone is allowed for the site itself in the Permissions-Policy header.
- One Telegram-style messenger (`features/chat`) replaces the three mock message screens: conversation list, bubbles with time and ticks, day separators, one round button that sends text or records a voice message, playback with a waveform, 4-second refresh, full-screen chat on a phone.
- Business desk: the profile picture opens a menu (profile, complaints, messages, sign out); Overview and Business profile read the database; the fake sidebar counts are gone; complaint pages link to the messenger. Stock and Orders stay AddisB2B-owned placeholders.
- Tests: `npm run test:browser:chat` (29 checks, with a fake microphone). Mock-only sections of `portals`, `portals-menu` and `business` were removed; `business.mjs` is deleted.

## Completed: real complaints, tips and content from the database, 15 November 2026

- New migration `complaints_tips_content` (case subject and story, tip reference and details, `content_items`). New API modules: reference, content, complaints (consumer, public tracking, office and business views), tips. New permissions seeded per role.
- Web: the complaint form sends to the API and ends with a "where to send it" choice (City Bureau by default); the tip form, My cases (redesigned landing page), the case page, tracking (redesigned), the Woreda/Sub-City/Bureau dashboards, cases and tips, the business complaints list and case, news, laws, help and home read the database.
- "Make a complaint" opens the form directly (the chooser dialog is gone); the Report unfair trade dialog is as wide as the complaint one; the header keeps four links and a "More" menu so it fits laptop screens.
- Test: `npm run test:browser:data` (30 checks, real database). `public-site` lost its mock-only sections. Gaps are listed in integration-status.md.

## Completed: complaint and tip always in a dialog, 15 November 2026

- The tip and complaint receipts (`/tip/sent`, `/complaint/sent`) were plain stacked pages. They now open as dialogs (new `@modal/(.)tip/sent` and `@modal/(.)complaint/sent`).
- Typing or refreshing `/tip`, `/complaint/new` or a receipt address shows the same dialog over the home page. Shared in `web/src/features/dialogs.tsx`; `RouteModal` has a `closeTo` for pages with no earlier page to go back to.
- Browser check: tip receipt has no sideways scroll at 360, 768 and 1280 px. `public-site` 55/57; the two help checks still fail on the dev server.

## Completed: Phase 4.12 Operational Reports and Statistics APIs, 15 November 2026

- Owner: backend.
- Implemented `GovernmentReportsController`, `BusinessReportsController`, `ReportsService`, and aggregation helpers.
- Government reports: overview metrics, cases by status, cases by category, volume over time, resolution performance, office workload, transfer statistics, and SLA compliance.
- Business reports: merchant overview, status breakdown, volume over time, response performance, and resolution outcomes.
- Enforced jurisdiction boundaries (Woreda, Sub-City, Bureau) and strict merchant isolation without consumer PII leakage.
- Verified with unit test suite `tests/operational-reports.test.mjs`.

## Completed: Phase 4.11 Case Workflow Completeness and Hardening, 15 November 2026

- Owner: backend.
- Audited complete complaint lifecycle and codified `CASE_TRANSITION_MATRIX` in `case-workflow.validator.ts`.
- Enforced legal transitions and rejected invalid status jumps across all phases (business, consumer, government, inspection, decisions).
- Hardened terminal case immutability, requiring supervisory role for case reopening.
- Verified with unit test suite `tests/case-workflow-hardening.test.mjs`.

## Completed: Phase 4.10 SLA and Deadline Monitoring, 15 November 2026

- Owner: backend.
- Implemented `GovernmentSlaController`, `BusinessSlaController`, `SlaService`, and evaluation helpers.
- Evaluates deadlines across UTC timestamps, administrative category defaults (`defaultSlaDays`), explicit deadlines, and active pauses (`CaseSlaPause`).
- Detects approaching deadlines (<= 24h) and overdue cases within jurisdiction.
- Verified with unit test suite `tests/sla-monitoring.test.mjs`.

## Completed: Phase 4.9 Case Notifications and Alerts, 15 November 2026

- Owner: backend.
- Implemented `NotificationsController`, `NotificationsService`, helpers, and channel provider adapters (`IN_APP`, `SMS`, `EMAIL`, `PUSH`).
- Reused existing Prisma `Notification` model with zero database schema changes or extra migrations.
- Supported in-app notifications, read/unread status, unread count badge, read-all, safe dismissal, and default channel preferences.
- Case lifecycle event dispatcher (`dispatchCaseEvent`) handles 20 core complaint lifecycle events.
- Strict privacy: never exposes consumer phone, email, Fayda ID, or real name to businesses (uses `complainantAlias`); conceals internal officer notes.
- Deduplication: 60-second idempotency check prevents duplicate alerts on transaction retries.
- Safe integration: async dispatch does not block or fail parent case transactions.
- Automated tests: `tests/notifications.test.mjs` (DTO validation, lifecycle alerts, cross-user isolation, read/unread state, unread counts, pagination, adapter masking, and controller reflection).

## Completed: Phase 4.8 Government Inter-Level Case Transfers, 15 November 2026

- Owner: backend.
- Implemented `GovernmentTransfersController` and `GovernmentTransfersService` managing inter-level case handovers (Woreda → Sub-City → City Bureau).
- Validated single-step upward escalation (`isValidClimb`); blocked level skipping (e.g. Woreda → Bureau) and terminal upwards moves from Bureau.
- Enforced custody rules: sending office must currently hold case; closed/resolved cases cannot be transferred; duplicate pending transfers blocked.
- Transfer acceptance: updates `currentOfficeId`, transitions status to `RECEIVED_BY_OFFICE`, safely deactivates prior office officer assignment.
- Transfer rejection & return: requires mandatory reason (min 5 chars), marks transfer `RETURNED`, preserves case custody with sending office.
- Chronological transfer history: tracks sending/receiving offices, initiating actor, handover notes, acceptance/rejection timestamps, and response notes.
- Added permissions in seed: `transfers:initiate`, `transfers:reject`, `transfers:read`.
- Verified: automated test suite `tests/government-transfers.test.mjs` (14 scenarios covering climb rules, duplicate prevention, cross-office rejection, acceptance, rejection, and controller reflection).

## Completed: Phase 4.7 Government Decisions, Resolution and Case Closure, 15 November 2026

- Owner: backend.
- Implemented `GovernmentDecisionsController` and `GovernmentDecisionsService` for decision making, resolution orders, and case closure.
- Decision outcomes supported: `SUBSTANTIATED`, `NOT_SUBSTANTIATED`, `PARTIALLY_SUBSTANTIATED`, `REFERRAL_REQUIRED`, `ADDITIONAL_INVESTIGATION_REQUIRED`.
- Transitions to resolution states: `RESOLVED_ADMINISTRATIVE_ORDER`, `RESOLVED_MUTUALLY`, `CONCILIATION_SCHEDULED`, `COURT_REFERRAL_ISSUED`.
- Enforces preconditions: investigation must be complete (`INSPECTION_COMPLETED`); prevents duplicate final decisions.
- Resolution & compliance tracking: updates corrective actions and deadlines; verifies business compliance (`COMPLIED` / `NON_COMPLIANT`).
- Controlled case closure & reopening: closes resolved cases with documented reason; restricted reopening to office administrators.
- Consumer & business privacy safeguards: consumers see decision and remedies; merchants see corrective action without consumer PII.
- Added permissions in seed: `decisions:create`, `decisions:read`, `cases:close`, `cases:reopen`.
- Verified: automated test suite `tests/government-decisions.test.mjs` (DTO validation, decision issuance, duplicate prevention, resolution updating, compliance verification, case closure, admin reopening, and controller reflection).

## Completed: Phase 4.6 Evidence Management and File Storage, 15 November 2026

- Owner: backend.
- Implemented `StorageService` and `StorageModule` for safe file handling, MIME type magic-byte detection, size capping (10MB), and path traversal protection.
- Implemented `EvidenceService` and `EvidenceController` supporting consumer, business, and government evidence uploads, listings, and downloads.
- Storage isolation: uploaded files stored in private directory outside web roots (default `.runtime/uploads`); safe UUID filenames generated on disk; physical storage paths never returned in API responses.
- Visibility & privacy enforcement: consumers and businesses access only shared evidence (`isOfficerOnly: false`); internal evidence (`isOfficerOnly: true`) strictly restricted to authorized government officers within jurisdiction.
- Cross-case access blocked: unauthorized requests fail closed with 404 Not Found to prevent existence enumeration.
- Append-only audit trail: uploads logged in `CaseHistory` and `CaseAuditLog`.
- Verified: automated test suite `tests/evidence.test.mjs` (11 assertions covering upload validation, cross-access rejection, officer jurisdiction, magic byte verification, internal evidence privacy, and controller reflection).

## Completed: Phase 4.5 Government Investigation and Inspections, 15 November 2026

- Owner: backend.
- Implemented `GovernmentInvestigationsController`, `GovernmentInvestigationsService`, and helpers for investigations and inspections.
- Case lifecycle progression: `OFFICER_ASSIGNED` -> `INSPECTION_PENDING` -> `INSPECTION_ACTIVE` -> `INSPECTION_COMPLETED`.
- Prevents duplicate investigations; enforces active officer assignment and office jurisdiction.
- Inspection scheduling and execution: tracks lead inspector, scheduled date, location, type, summary, and action taken.
- Inspection findings management: records verifiable metrics (nominal, measured, unit, violation boolean, notes).
- Enforces completion rules: requires documented summary, action taken, and at least one finding before completing an inspection.
- Business response opportunity: allows registered merchant to submit formal statements via `BUSINESS_GOVERNMENT` conversation without exposing consumer PII.
- Added permissions in seed: `inspections:create`, `inspections:read`, `inspections:manage`.
- Verified: automated test suite `tests/government-investigations.test.mjs` (DTO validation, start investigation, duplicate prevention, inspection scheduling, findings recording, completion requirements, business response, and controller reflection check).

## Completed: Phase 4.4 Government Office Case Intake, Triage, and Assignment, 15 November 2026

- Owner: backend.
- Implemented `GovernmentCasesController`, `GovernmentCasesService`, and helpers for government complaint intake, triage, and assignment.
- Office-scoped intake: Woreda officers access Woreda cases, Sub-City coordinators access Sub-City and subordinate Woreda cases, Bureau administrators and Superadmins have city-wide visibility.
- Case triage: validated transition from `RECEIVED_BY_OFFICE` to `UNDER_INITIAL_REVIEW` with priority tagging, audit logging, and case history.
- Officer assignment & reassignment: verifies active officer deployment to holding office, manages single-active assignment rule (`CaseAssignment`), updates status to `OFFICER_ASSIGNED`.
- Transfer acceptance: handles incoming office transfers (`PENDING_ACCEPTANCE` -> `ACCEPTED`), establishes new office ownership (`RECEIVED_BY_OFFICE`), and appends audit logs.
- Added permissions in seed: `transfers:accept`, `complaints:triage`, `complaints:assign`, `complaints:read:all`.
- Verified: automated test suite `tests/government-cases.test.mjs` (33 assertions covering jurisdiction scoping, triage validation, single active assignment, and transfer workflow).

## Older frontend entries

The frontend entries from 12 to 14 November 2026 (public site, workspaces, administration pages, first integration) are in [work-tracker-archive.md](work-tracker-archive.md).

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

### Initial Foundation, Scaffolding & Reconciliations (Phases 1-2)

- Reconciled dual routing schema with CaseHistory append-only audit trail and strict FK deletion constraints.
- Scaffolded NestJS backend foundation with global prefix `/api`, envelope filters, permission guard, and contracts validation.

### Database design & initial setup (session 1)

- Initialised NestJS application structure in `backend/` with reconciled Prisma schema and architecture specs.
- Database integrity & dual routing corrections: validated Route A/B constraints, office hierarchies, atomic annual sequence generation, and contract status mapping.
- Updated shared contracts in `lib/contracts/` and verified with contract unit test suite.

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
| `public/index.html` | `/` | none | built, visually compared (see entry above) |
