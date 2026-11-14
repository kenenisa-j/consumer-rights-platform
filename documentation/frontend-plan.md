# Frontend implementation plan

Owner: frontend developer. Rules: [frontend-guide.md](frontend-guide.md), [web/AGENTS.md](../web/AGENTS.md).
Goal: every prototype screen built in Next.js, looking and behaving exactly like the prototype, then wired to
the backend slice by slice.

## Decisions made

- Stack: Next.js 16 App Router, React 19, TypeScript strict. **No Bootstrap**; prototype CSS ported verbatim
  ([ADR-0003](decisions/0003-frontend-styling.md)).
- Server components by default; client components only where state is needed (`MainNav` for the active link).
- Strings live in `web/src/content/*.ts` as `{ en, am }` (`Bilingual`), rendered with `<Bi>` / `<Am>`. Components
  hold no literal copy beyond trivial glue. Product values (free call number) come from `lib/config.ts`.
- Icons: `components/ui/Icon.tsx`, inline SVG copied from the prototype. Add a path there when a page needs one.
- Routes are flat on the consumer site (`/complaint-or-tip`, `/tip`, `/track`...). Government and business sit under
  `/business`, `/woreda`, `/subcity`, `/bureau` with their own layouts (workspace look: `office.css`).
- Until the backend exists, data comes from typed fixtures in `web/src/mocks/` (never in `backend/`), shaped by
  `lib/contracts`. Forms use the prototype's GET navigation so every flow is clickable.

## Per-screen method

1. Open the prototype page; list its sections, dialogs and states.
2. Put copy in `content/<page>.ts`; build sections as components in `features/<area>/` (each < 350 lines).
3. Compare against the prototype in a browser at 1280 / 768 / 360 px (see
   [testing-and-verification.md](testing-and-verification.md)); fix differences.
4. Add a row to the traceability table in [work-tracker.md](work-tracker.md).

## Slice order

| # | Slice | Prototype pages | Status |
| --- | --- | --- | --- |
| 0 | Scaffold, CSS port, public shell, sign-in and call dialogs | `public/index.html` chrome | **built** |
| 1 | Public home | `public/index.html` | **built** |
| 2 | Information pages | `rights`, `how-to-complain`, `laws`, `news`, `news-article`, `help`, `home-am`, `complaint-or-tip` | **built** |
| 3 | Account | `sign-in`, `register`, `verify` | **built** (no real auth yet) |
| 4 | Complaint wizard | `complaint-1..6`, `complaint-sent` | **built** |
| 5 | Tips and tracking | `tip`, `tip-sent`, `track`, `track-result` | **built** |
| 6 | Consumer cases | `my-cases`, case page and all its states, `notifications`, `messages` | **built** |
| 7 | Workspace shell | rail + top bar from `office.css`, shared by 4 portals | **built** |
| 8 | Business desk | `merchant/*` overview, complaints, complaint case, messages | **built** (stock, orders, profile are AddisB2B's) |
| 9a | Government: dashboard, cases, case workspace | `woreda`, `subcity`, `bureau`: `dashboard`, `cases`, `case-*` | **built** (all three levels) |
| 9b | Government: intake, calls, tips, messages, reports | same folders | **built** (all three levels) |
| 10 | Administration | staff, offices, categories, content, settings | **built** (all three levels) |

Connecting slices 3 to 6 to real data needs the auth and API contracts agreed with the backend developer first
([git-workflow.md](git-workflow.md#contract-first-handoffs)).

## Design decisions for the public site (slices 2 to 6)

These pages keep the prototype's wording, classes and flow but are not pixel copies; usability was improved:

- **One screen, many states.** The eleven `case-*.html` files are one `/cases/[reference]` page. What the consumer can
  do comes from the case (`pending`). Every change goes through a pure rules file,
  `features/cases/case-state.ts` (unit-tested), that mirrors what the backend will enforce.
- **One wizard route**, `/complaint/new?step=n`: answers kept in the tab (sessionStorage), no skipping ahead, a live
  summary, a review step with a Change link per block, file limits, retry on failure.
- **Native `<dialog>`** for dialogs that need state (focus trap, Escape, focus return). CSS-only `:target` dialogs
  remain only on the home page and the sign-in and call dialogs.
- **Filters and search** (laws, news, help questions, offices, business lookup) are state-driven with a live count.
- **Privacy:** tip codes and tracking digits travel in sessionStorage, never in the address. Tracking gives one message
  for an unknown number and for wrong digits. `?next=` accepts same-site paths only.
- **Mock API.** `src/mocks/` and `src/lib/handoff.ts` stand in for the backend. Swap the mocks for `lib/api.ts` calls
  when endpoints exist; move `types/case.ts` into `lib/contracts` once the shape is agreed.
- The main demo case can be viewed at each point of its climb with `/cases/CC-2026-00123?step=meeting` (also
  `improved`, `subcity`, `settlement`, `resolved`). This is sample-data tooling and goes away with the mocks.

## Design decisions for the workspaces (slices 7 and 9)

- **Two root layouts.** `app/(public)` and `app/(workspace)` each render their own `<html>` and `<body>`. The workspace
  body carries `ws`, which redefines the colour tokens (`office.css`). Moving between them is a full page load, so the
  green and navy stylesheets can never mix. Workspace pages are `noindex`.
- **One government portal implementation.** `/woreda`, `/subcity`, `/bureau` are one route, `app/(workspace)/[level]`,
  validated against `GOV_LEVELS` (anything else is a 404). `features/gov/levels.ts` holds the per-level differences
  (office, officer, where a case passes up to, counts, filters). The menu is identical at all three levels.
- **The climb is enforced in code.** `features/gov/gov-case-state.ts` (unit-tested) allows an action only when the
  viewing level holds the case, the case is accepted and not closed; a case passes up exactly one level with a handover
  note (`nextLevel` from `lib/contracts`); the City Bureau cannot pass up and refers instead; a payment needs a proposed
  solution; contact with a business is recorded only for businesses not on AddisB2B.
- **Case workspace:** chain ("Where this case is"), how it reached the office with the handover notes, tabs
  (overview, messages, evidence, history) with keyboard support, and an action panel that shows only what is possible.
- **Administration (slice 10), scoped per level.** Staff: the roles and offices a level may give are limited to what it
  manages, emails are unique, and an office keeps at least one active administrator. Offices: Woreda and Sub-City edit
  their own details; the Bureau sees the 11 Sub-Cities. Categories: only the Bureau edits; everyone else suggests a change;
  removing retires an item (existing complaints keep it) and the catch-all "Other" cannot be removed. Public content:
  a Woreda notice waits for the Sub-City, which approves it or sends it back with a reason; the Sub-City publishes its own;
  the Bureau runs rights, laws, guides and news. Settings: office levels choose how cases are assigned; the Bureau sets the
  free call number and the time limits (marked proposed). Rules are in `features/gov/admin-state.ts` (9 unit tests).
- **Every HTML `pattern` is checked.** Browsers compile it with the `v` flag and silently ignore an invalid one, so the
  field would accept anything. `scripts/validate.mjs` now fails on such a pattern (it caught `[ -]` in the office phone).
- **Slice 9b, per level.** The same page serves all three levels, with the differences the prototype has: intake wording
  and sources (the City Bureau has the free call line, the others have phone), where an off-platform complaint goes (the
  Woreda keeps it, the Sub-City and Bureau send it to the Woreda of the purchase), the tip actions (Woreda plans a visit,
  Sub-City sends to a Woreda, Bureau makes a case that goes to the Woreda), and each level's reports.
- **Tips are anonymous in the staff view too.** `features/gov/tip-state.ts` (unit-tested) holds the rules, and a test fails
  if a tip ever shows contact details or the private code. The prototype showed officers the code; we deliberately do not
  (it is held only by the sender and stored hashed by the backend).
- **Reports** download as CSV (the prototype said Excel): it works without a backend and opens in any spreadsheet.
- Sign-in fields have no `name`, so no password is ever put in the address bar while authentication is mocked.
- **Business desk** (`/business`): the same shell with its own menu. The business sees a *limited view*: the consumer only
  as "Consumer 00123", only files the consumer shared. The eight `complaint-00123*.html` files are one page; the reply
  is an inline form. Rules are in `features/business/biz-case-state.ts`, and a unit test fails if any state of the
  business view contains the consumer's name, phone or email. Stock and prices, orders and the business profile belong
  to the existing AddisB2B desk (open question 12): they stay in the menu as clearly-labelled placeholders.
- **Shared messages screen.** `MessagesView` takes its conversations as a prop, so the consumer and the business use one
  component. (A function cannot be passed from a server page to a client component, so it takes a path string.)

## Known gaps to close

- CSS-only `:target` dialogs (home, sign-in, call) do not trap focus; review in the accessibility pass.
- Rows in the case, tip and complaint lists that have no demo page say "No demo detail" instead of linking.
- Sign-in submits a GET to each portal's landing path; real authentication arrives with the backend.
- Amharic appears beside English headings only; body text of the new pages is English until translators supply it.
- Evidence files are validated in the browser but not uploaded (no backend); they are not kept across a reload.
