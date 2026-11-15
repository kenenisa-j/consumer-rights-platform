# Integration status: web and API

Updated 14 November 2026. "Real" means the screen works against the API and the database. "Demo" means the screen
still reads in-memory sample data from `web/src/mocks/` because the API has no endpoint for it yet.

## Real

| Area | How |
| --- | --- |
| Sign in (all five portals) | Better Auth through the site's own `/api/*` (Next rewrite, first-party cookie). Consumers by phone, everyone else by email. Wrong portal tab is refused and signed out |
| Sign up | `POST /api/auth/phone-number/send-otp`, then `POST /api/auth/register-consumer` (account, role and session in one transaction). No SMS yet: `npm run dev:otp -- 0911234567` prints the code |
| Who am I | `GET /api/me` (name, phone, email, roles, office, business). Used for the header menu, the workspace top bar, my-cases and the complaint form's contact details |
| Portal guard | Server layouts and pages call `requirePortal`. Signed out goes to sign-in and back; signed in to another portal goes to `/no-access`. The API remains the real boundary |
| Sign out | `POST /api/auth/sign-out` from the header menu and the workspace rail |
| Test accounts | Dropdown in every sign-in form (development only, `DEV_TEST_ACCOUNTS`). Seed: `npm run db:seed` |

## Demo (no API endpoint yet)

Complaints and cases (create, list, one case, every action), evidence upload, messages and offers, notifications,
tips and anonymous codes, tracking by number, business desk lists, all three government dashboards, case queues, calls,
intake, reports, staff, offices, categories, public content, settings, news, laws, FAQ and offices on the public pages.

## What the API needs next (in this order)

1. **Reference data**: complaint categories, offices by level (Route A office choice), Sub-Cities and Woredas.
2. **Complaints**: create (Route A and B), list mine, get one, consumer actions. Needs the status model below.
3. **Business desk** and **government queues**, scoped by the caller's office and jurisdiction on the server.
4. **Tips** (anonymous), **messages and offers**, **notifications**, **evidence upload**.
5. **Administration**: staff, offices, categories, content, settings.

## Mismatch to settle before step 2

The database `CaseStatus` enum has 16 values (for example `SUBMITTED_TO_BUSINESS`, `INSPECTION_ACTIVE`); the SRS and the
prototype use 13 consumer-facing statuses (`lib/contracts` `CASE_STATUSES`). One list has to win, or a documented mapping
is needed. Registration also stores only name, phone and password: Sub-City and Woreda of residence, and email, have no
field in the API, so the sign-up form no longer asks for them.
