# Integration status: web and API

Updated 15 November 2026. "Real" means the screen works against the API and the database. "Demo" means the screen
still reads in-memory sample data from `web/src/mocks/` because the API has no endpoint for it yet.

## Real

| Area | How |
| --- | --- |
| Sign in (all five portals) | Better Auth through the site's own `/api/*` (Next rewrite, first-party cookie). Consumers by phone, everyone else by email. Wrong portal tab is refused and signed out |
| Sign up | `POST /api/auth/phone-number/send-otp`, then `POST /api/auth/register-consumer` (account, role and session in one transaction). No SMS yet: `npm run dev:otp -- 0911234567` prints the code |
| Who am I | `GET /api/me` (name, phone, email, roles, office, business). Used for the header menu, the workspace top bar, my-cases and the complaint form's contact details |
| Portal guard | Server layouts and pages call `requirePortal`. Signed out goes to sign-in and back; signed in to another portal goes to `/no-access`. The API remains the real boundary |
| Sign out | `POST /api/auth/sign-out` from the header menu and the workspace rail |
| Reference data | `GET /api/reference` (categories, Sub-Cities, Woredas and their offices, the City Bureau) and `GET /api/reference/businesses`. Seeded: 11 Sub-Cities with their Woredas |
| Make a complaint | `POST /api/complaints`. The last step lets the person pick the business, the Woreda, the Sub-City or the City Bureau (default). The server finds the office and checks its level. Stored in `cases` with a history row and a notification |
| My cases, one case | `GET /api/complaints`, `GET /api/complaints/:reference` (only the owner) |
| Track a complaint or tip | `GET /api/track/complaint` (number and last 4 phone digits), `GET /api/track/tip` (number and private code). Every failure looks the same |
| Tips | `POST /api/tips` (public, no identity when anonymous, code stored only as a hash, small in-memory rate limit) and `GET /api/office/tips` |
| Office queues | `GET /api/office/cases` and `/:reference`. Scope comes from the officer's own office: a Woreda sees its office, a Sub-City its Woredas too, the Bureau all |
| Evidence files | `POST /api/complaints/:reference/evidence` (raw file body, owner only), `GET /api/evidence/:id`. JPG, PNG, PDF, up to 10 MB, 8 per complaint; the type is checked from the first bytes. Stored under `UPLOAD_DIRECTORY` (default `.runtime/uploads`) with a row in `evidence_files`. Officers see every file; the business only the ones the consumer shared. The wizard uploads after the complaint is created and reports any file that failed; more can be added from the case page. Tips take no files |
| Office redirects | `POST /api/office/cases/:reference/redirect`, `GET /api/office/redirect-options`. Bureau to any Sub-City or Woreda; Sub-City to the Bureau or a Woreda of its own; Woreda to the Bureau or its own Sub-City. Handover note, transfer row, history, audit row and consumer notice in one transaction |
| Unread messages | `GET /api/messages/unread`, per-conversation `unread`; opening a conversation marks it read (`conversation_reads`) |
| Business desk | `GET /api/business/complaints` and `/:reference`. The consumer is only "Consumer 00123" |
| Public content | `GET /api/content/news`, `law`, `faq` (table `content_items`), used by home, news, laws and help |
| Messages (text and voice) | `GET /api/messages/conversations`, `/conversations/:id`, `POST .../text`, `POST .../voice`, `GET /api/messages/audio/:id`. One conversation per complaint: with the business (Route B) or with the office (Route A). Scope is decided on the server: consumer (own), business (own business, sees "Consumer 0000N"), staff (cases held in their office scope). Voice notes are stored in `messages.audio` (up to 3 minutes / 1.5 MB). Telegram-style screen in `features/chat/` |
| Business desk | Overview, complaints, messages and profile (`GET /api/business/profile`) read the database; the profile picture opens a menu; the sidebar count is the number of complaints waiting for a reply |
| Notifications | `GET /api/notifications`, `/unread-count`, `PATCH /read-all`, `PATCH /:id/read`. Bell in the public header and the workspace top bar; pages `/notifications`, `/business/notifications`, `/:level/notifications`. Created for a new complaint (consumer and receiving office), a redirect and a new message. Only the in-app channel is real; email and SMS are saved as preferences and not sent |
| Contact preferences | Phone (required), email, language and the email/SMS choices from step 5 are stored on the case (`case_contact_preferences`); officers see the phone the consumer gave; tracking accepts its last 4 digits |
| Languages | English, Amharic, Afan Oromo, Tigrigna, Somali by dictionary (`web/src/i18n/`), cookie `cr-lang`, on every page. First-pass translations, to be reviewed |
| Test accounts | Dropdown in every sign-in form (development only, `DEV_TEST_ACCOUNTS`). Seed: `npm run db:seed` |

## Demo (no API endpoint yet)

Settlement offers and withdrawing a complaint, officer actions (accept, assign, pass up, settle), notifications page, calls, business stock and orders (they belong to the AddisB2B desk), staff intake, reports, staff, offices,
categories and content administration, settings, the home page figures, and the rights and how-to pages (fixed text).

## What the API needs next (in this order)

1. **Case actions**: consumer and business replies, offers and settlement; officer accept, assign, pass up one level with a handover note (`isValidClimb`).
2. **Messages**, **notifications** page, **evidence upload** (storage).
3. **Administration**: staff, offices, categories, content, settings.

## Mismatch to settle before step 2

The database `CaseStatus` enum has 16 values (for example `SUBMITTED_TO_BUSINESS`, `INSPECTION_ACTIVE`); the SRS and the
prototype use 13 consumer-facing statuses (`lib/contracts` `CASE_STATUSES`). One list has to win, or a documented mapping
is needed. Registration also stores only name, phone and password: Sub-City and Woreda of residence, and email, have no
field in the API, so the sign-up form no longer asks for them.
