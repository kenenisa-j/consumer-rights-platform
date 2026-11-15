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

## Completed: complaint and tip always in a dialog, 15 November 2026

- The tip and complaint receipts (`/tip/sent`, `/complaint/sent`) were plain stacked pages. They now open as dialogs (new `@modal/(.)tip/sent` and `@modal/(.)complaint/sent`).
- Typing or refreshing `/tip`, `/complaint/new` or a receipt address shows the same dialog over the home page. Shared in `web/src/features/dialogs.tsx`; `RouteModal` has a `closeTo` for pages with no earlier page to go back to.
- Browser check: tip receipt has no sideways scroll at 360, 768 and 1280 px. `public-site` 55/57; the two help checks still fail on the dev server.

## Completed: dialog and portal-redirect fixes, 14 November 2026

- Reported: "Make a complaint", "Report unfair trade" and "Track a case" did nothing, and portals showed "page not found".
- Cause 1: the `@modal/[...catchAll]` route made the public layout match every address, so Next's strict route matching
  (on by default in Next 16) dropped all workspace pages. Removed it; `RouteModal` now steps aside when the address leaves its route.
- Cause 2 (development only): React StrictMode closes and reopens the dialog on mount, and the late `close` event sent the page
  straight back. The handler now ignores a `close` that arrives while the dialog is open again.
- Also: the hero's "Report unfair trade" opens the real tip form (the old quick form posted nowhere); the "Who are you?" doors open
  sign-in on their own tab and end in that portal; `agentRules: false` stops Next rewriting `web/AGENTS.md`; `suppressHydrationWarning`
  on `<body>` silences browser-extension attribute warnings.
- Lesson: browser-test against `next dev` as well as a production build; the first bug only showed in dev.

## Completed: first real integration (sign-in, sign-up, session, portal guard), 14 November 2026

- Owner: frontend, with small additions in `backend/` that need the backend owner's review: `GET /api/me`
  (`backend/src/modules/me`), `backend/prisma/seed.mjs`, `backend/scripts/dev-otp.mjs`.
- Web now reaches the API through its own address (`next.config.mjs` rewrite), signs in and out for real, registers with a real
  code, guards every consumer, business and government page, and shows the signed-in person. Test accounts for all five portals
  are in a dropdown in every sign-in form (development only; `lib/contracts/test-accounts.js`).
- Verified: new `tests/browser/auth.mjs` 62/62 (guards, wrong password, wrong tab, all 8 accounts in and out, return address,
  sign-up with a real code and sign-in again); public-site 56, portals 55, menu 40, admin 44, business 37 now run signed in;
  80 unit tests.
- Everything else is still demo data. See [integration-status.md](integration-status.md) for the list and the order the API needs.
- Found: the API limits sign-ins to a few every 10 seconds (Better Auth default), so the test driver now keeps session cookies.
  The status enums in the database and in `lib/contracts` differ (16 against 13).
- Not verified: keyboard-only and screen-reader pass; the production build with `DEV_TEST_ACCOUNTS` off was not browsed.

## Completed: public site redesign and dialog forms, 14 November 2026

- Owner: frontend. New design layer `web/src/styles/site.css`, loaded only by the public layout (workspace look untouched):
  warm paper background, larger type, pill buttons, one-row header, new home hero with a "check on a case" card, connected
  "how it works" steps, and a new footer (call-to-action band, brand, link columns, contact with icons).
- Dropdowns: `ChoiceGroup dropdown` collapses long lists into one select with the chosen option's description underneath
  (problem kind, what you want, tip kind).
- Dialog forms: sign-in, register, identity check, tip, track, the complaint-or-tip chooser and the six-step complaint form now
  open as dialogs over the current page (`app/(public)/@modal` intercepting routes, `RouteModal`). The same addresses still open
  as normal pages when typed in or refreshed. On phones they are bottom sheets.
- The wizard step now lives in state, not in `?step=`: a changing address re-triggered the interception.
- Tests: public-site 59/59 (new dialog checks run in a fresh browser), portals 55, menu 40, admin 44, business 37; 77 unit tests.
- Not verified: keyboard-only and screen-reader pass of the dialogs; the cases, messages and notifications pages were only
  restyled through shared CSS, not redesigned one by one.

## Completed: government administration pages, 13 November 2026

- Owner: frontend. Slice 10 of [frontend-plan.md](frontend-plan.md): the last unbuilt part of the prototype. The
  "not built yet" placeholder route is gone; every menu item at all three levels is a real page.
- Built: staff and roles (add and edit, per-level roles and offices, tiles); offices (path, own details editable by Woreda
  and Sub-City, markets, Woredas, Sub-Cities); categories (Bureau edits, others suggest); public content (notice approval
  flow between Woreda and Sub-City, Bureau content with a status); settings (assignment and alerts per office level, free
  call number and time limits for the Bureau).
- Rules: `features/gov/admin-state.ts`, 9 unit tests (roles and offices a level may give, unique emails, an office keeps an
  administrator, categories retire not delete and the catch-all stays, notice approval and send-back).
- Found and fixed: the office phone `pattern` contained `[ -]`, which browsers compile with the `v` flag as a syntax error and
  then silently ignore, so the field would have accepted anything. `scripts/validate.mjs` now checks every pattern in
  `web/src` (proved by planting a bad one). All 9 existing patterns were valid.
- Verified: `npm run check`; admin browser suite 44/44 (all 15 pages open, validation, the duplicate and last-administrator
  refusals, category and notice flows across the three levels, settings, sideways scroll at 360 px, console clean); the four
  earlier browser suites re-run as a regression (results in the hand-off message). Browser tests ran against a separate
  production server on port 3399 because a dev server was already using 3300.
- Not verified or not done: keyboard-only and screen-reader pass; real data and authentication; every save is in memory only.
- Assumed rules to confirm are in [open-questions.md](open-questions.md) items 25 and 26.

| Prototype page(s) | Route | Status |
| --- | --- | --- |
| `woreda\|subcity\|bureau/staff` | `/[level]/staff` | built, browser-checked |
| `.../offices` | `/[level]/offices` | built, browser-checked |
| `.../categories` | `/[level]/categories` | built, browser-checked |
| `.../content` | `/[level]/content` | built, browser-checked |
| `.../settings` | `/[level]/settings` | built, browser-checked |

## Completed: government portals, the rest of the working menu, 13 November 2026

- Owner: frontend. Slice 9b of [frontend-plan.md](frontend-plan.md), for Woreda, Sub-City and City Bureau.
- Built: new complaint (intake) with the per-level wording and sources and a saved screen; free call line with a
  record-the-call-back dialog and live counts; tips (list with filter) and the tip workspace with the actions each level
  has; messages (the three levels' conversations, read-only where the case has moved on); reports with each level's
  figures and a CSV download. The administration pages remain "not built yet" placeholders.
- Privacy: a unit test fails if a tip shows contact details or the private code; staff see tips as anonymous. The
  prototype showed officers the code, which contradicts [security and privacy](security-and-privacy.md), so it is not shown.
- Rules: `features/gov/tip-state.ts`, 5 unit tests (who may plan a visit, send to a Woreda, make a case once, close).
- Verified: `npm run check`; browser suite `test:browser:menu` 40/40 (intake validation and routing per level, calls,
  every tip action per level, messages read-only rules, CSV content, sideways scroll at 360 px, console clean); portals
  and business suites re-run as a regression (results in the hand-off message).
- Not verified or not done: keyboard-only and screen-reader pass; real data and authentication; administration pages
  (staff, offices, categories, public content, settings); file uploads in the visit and refund dialogs are not driven by
  the browser test.

| Prototype page(s) | Route | Status |
| --- | --- | --- |
| `woreda\|subcity\|bureau/intake`, `intake-saved` | `/[level]/intake` | built, browser-checked |
| `.../calls` | `/[level]/calls` | built, browser-checked |
| `.../tips`, `tip-00045` | `/[level]/tips`, `/[level]/tips/[reference]` | built, browser-checked (one demo tip) |
| `.../messages` | `/[level]/messages` | built, browser-checked |
| `.../reports` | `/[level]/reports` | built, browser-checked |
| `.../staff`, `offices`, `categories`, `content`, `settings` | `/[level]/[section]` | placeholder (slice 10) |

## Completed: the business desk (complaints side), 13 November 2026

- Owner: frontend. Slice 8 of [frontend-plan.md](frontend-plan.md).
- Built: `/business` with the shared workspace shell; overview; consumer complaints (filter); one complaint page for
  every state (reply form, answer with three choices, confirm an agreed refund, confirm a settlement with proof, write to
  the officer holding the case); messages (the consumer and business now share one `MessagesView`); placeholders for
  stock and prices, orders and the business profile, which belong to the existing AddisB2B desk (open question 12).
- Privacy: the business sees the consumer only as "Consumer 00123". A unit test over every state of the business view
  fails if it ever contains the consumer's name, phone, email or address, or any file not shared with the business.
- Rules: `features/business/biz-case-state.ts`, 7 unit tests (reply, answering only when an answer is waiting, proof
  needed for a government settlement, the officer rather than the business closes a settlement).
- Verified: `npm run check`; business browser suite 37/37 (sign-in lands on `/business/overview` with nothing typed in the
  address, privacy on the page, the reply form including real typed validation, all answer dialogs, agreed, with the
  Woreda, settlement, resolved, messages, sideways scroll at 360 px, console clean). Public and portal suites re-run as a
  regression after the shared changes (results in the hand-off message).
- Not verified or not done: uploading the signed receipt (file input not driven by the browser test; the button is
  checked to stay disabled without one); keyboard-only and screen-reader pass; real data and authentication.
- Lesson recorded in `scripts/browser/driver.mjs`: browsers enforce `minlength` only on typed text, so tests use `type()`.

| Prototype page(s) | Route | Status |
| --- | --- | --- |
| `merchant/overview` | `/business/overview` | built (complaint side only), browser-checked |
| `merchant/complaints` | `/business/complaints` | built, browser-checked |
| `merchant/complaint-00123*` (8 files) | `/business/complaints/[reference]` | built, browser-checked (mock data) |
| `merchant/messages` | `/business/messages` | built, browser-checked |
| `merchant/stock`, `orders`, `profile` | `/business/stock`, `orders`, `profile` | placeholder: AddisB2B desk |

## Completed: workspace shell and the three government portals' core, 13 November 2026

- Owner: frontend. Slices 7 and 9a of [frontend-plan.md](frontend-plan.md); decisions are recorded there.
- Built: a second root layout for the workspace (navy theme, never mixed with the public CSS); `WorkspaceShell` with the
  side menu (current page, live counts, phone drawer) and top bar; accessible `Tabs`; for Woreda, Sub-City and City
  Bureau from one `[level]` route: dashboard, cases (filter and search), and the case workspace (chain, how it reached
  the office, handover notes, tabs, accept, record visit, set meeting, propose solution, record refund paid, record
  contact, mark resolved, pass up one level, refer at the last level). The other menu pages show "not built yet".
- Rules: `features/gov/gov-case-state.ts` enforces who can act and the one-level-at-a-time climb; 7 unit tests.
- Fixed on the way: sign-in sent the typed password in the address bar (GET); the fields now have no `name`.
- Verified: `npm run check`; `npm run test:browser` runs both browser suites in Edge: public site 52/52 and portals
  54/54, covering all three levels, the full climb Woreda to Sub-City to City Bureau, refer, accept, validation, tabs
  with the keyboard, the phone drawer, 404s, style isolation between public and workspace, and sideways scroll at 360 px.
- Not verified or not done: keyboard-only and screen-reader pass; real data and real authentication (all mocks);
  intake, calls, tips, messages, reports and administration (slices 9b and 10); the business desk (slice 8), so the
  Business sign-in still lands on a 404.

| Prototype page(s) | Route | Status |
| --- | --- | --- |
| `woreda\|subcity\|bureau/dashboard` | `/[level]/dashboard` | built, browser-checked |
| `woreda\|subcity\|bureau/cases` | `/[level]/cases` | built, browser-checked |
| `woreda/case-00123`, `case-00140`, `subcity/case-00123`, `bureau/case-00123` | `/[level]/cases/[reference]` | built, browser-checked |
| intake, calls, tips, messages, reports, staff, offices, categories, content, settings | `/[level]/[section]` | placeholder |

## Completed: the whole public (consumer) site, 13 November 2026

- Owner: frontend. Slices 2 to 6 of [frontend-plan.md](frontend-plan.md). All 37 prototype pages in `public/` are
  covered by 27 routes (the 11 case-state files are one case page; the 6 wizard files are one wizard).
- Built: information pages (rights, how it works, laws with search and filter, news with filter and articles, help with
  question search and office finder, Amharic home, complaint-or-tip); account (sign-in page, register with phone and
  password checks, identity check); complaint wizard and confirmation; tip form and confirmation; tracking (complaint
  and tip) with result; my cases, case page (all states and actions, native dialogs), notifications, messages with offers.
- Shared: `components/ui` (PageHead, Field set, Display set, Dialog, FileList), `content/*` bilingual modules,
  `mocks/*` typed stand-ins for the backend, `lib/handoff.ts`, `features/cases/case-state.ts` with tests.
- Verified: `npm run check` (validate 128 files, 12 tests, typecheck, build of 29 routes). Scripted Edge run through the
  DevTools protocol (scratch tooling, not committed) covering the wizard end to end, case actions and dialogs, tip,
  tracking (including wrong digits), register validation, every filter, messages and offers, sign-in `?next` handling,
  console errors, and sideways scroll at 1280, 768 and 360 px with device emulation. Results in the hand-off message.
- Not verified or not done: real keyboard-only pass and screen reader; real data (all mocks); real sign-in and uploads;
  Amharic body text; links into the four portals (404 until slices 7 to 10).

| Prototype page(s) | Route | Status |
| --- | --- | --- |
| `complaint-or-tip` | `/complaint-or-tip` | built, browser-checked |
| `sign-in`, `register`, `verify` | `/sign-in`, `/register`, `/verify` | built, browser-checked (mock auth) |
| `complaint-1..6`, `complaint-sent` | `/complaint/new`, `/complaint/sent` | built, browser-checked end to end |
| `tip`, `tip-sent` | `/tip`, `/tip/sent` | built, browser-checked |
| `track`, `track-result` | `/track`, `/track/result` | built, browser-checked |
| `my-cases` | `/my-cases` | built, browser-checked |
| `case-00123*`, `case-00140-*`, `case-00118-outside` | `/cases/[reference]` | built, browser-checked (mock data) |
| `notifications`, `messages` | `/notifications`, `/messages` | built, browser-checked |
| `rights`, `how-to-complain`, `laws`, `news`, `news-article`, `help`, `home-am` | `/rights`, `/how-to-complain`, `/laws`, `/news`, `/news/[slug]`, `/help`, `/am` | built, browser-checked |

## Completed: frontend scaffold, public shell and home page, 12 November 2026

- Owner: frontend. Plan: [frontend-plan.md](frontend-plan.md). Decision: prototype CSS ported verbatim, no
  Bootstrap ([ADR-0003](decisions/0003-frontend-styling.md)).
- Built: `web/` (Next.js 16.4.3, React 19.2.8), prototype stylesheets in `web/src/styles/`, `Icon`, `Bi`/`Am`,
  bilingual content modules, `PublicShell` (header, active-link nav, sign-in dialog with five role tabs, free-call
  dialog, footer; free call number from `FREE_CALL_NUMBER`), and the public home page with its two dialogs.
- Verified: `npm run check` green (validate, 6 contract tests, typecheck, production build). Edge headless
  screenshots of the prototype and the app compared at 1280 px (top and full page, matching layout) and at
  narrow width (identical). `#signin` dialog and role tabs work without JavaScript.
- Not verified or not done: real 360/768 device-emulation pass; keyboard/focus pass (`:target` dialogs do not trap
  focus); links to unbuilt pages (`/am`, `/register`, `/tip`...) 404; sign-in is a GET navigation, no auth yet.

| Prototype page(s) | Route | API | Status |
| --- | --- | --- | --- |
| `public/index.html` | `/` | none (sample figures, news in `content/home.ts`) | built, visually compared |

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
| `public/index.html` | `/` | none | built, visually compared (see entry above) |
