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
- Assumed rules to confirm are in [open-questions.md](open-questions.md) items 21 and 22.

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
