# Prototype guide

The prototype is a clickable, static **HTML + CSS only** build of ~100 screens (no JavaScript, no saving).
It is the visual and behavioral source of truth. It is **not** code to ship: turn each screen into real
components; do not copy its markup wholesale.

## Where it lives

`prototype/` at the repository root (read-only reference; never edit it to make the app work). Entry points:

- `prototype/index.html`: start page with every part and click-through journeys.
- `prototype/PLAN.md`: decisions, roles, statuses, page inventory. **Revision 3 replaces Revision 2 and the original plan where they disagree.**
- `prototype/docs/demo-data.md`: the one fictional dataset (people, businesses, cases CC-2026-00123 etc.).
- `prototype/docs/styleguide.html`: every component on one page.
- `prototype/assets/css/`: `tokens.css`, `base.css`, `components.css`, `patterns.css`, `public.css`, `office.css`, `merchant.css`, `print.css`.

Open pages by double-clicking the file; compare your screen against it side by side.

## Source-of-truth order

1. Domain rules: [domain-model.md](domain-model.md), then `PLAN.md` Revision 3, then Revision 2, then the original plan.
2. Visuals and wording: the prototype page, then `styleguide.html`, then `tokens.css`.
3. Real data shapes: derived from the prototype fields by the feature spec (the prototype has no schema).
4. Anything still unclear: [open-questions.md](open-questions.md), then ask.

Values shown as *proposed*, *to be confirmed* or *Later phase* are not requirements. Implement later-phase
items only as the same grey, non-functional placeholders.

## Prototype folder to feature map

| Prototype folder | Portal | Feature areas (and pages) |
| --- | --- | --- |
| `public/` (37) | Consumer | Home, sign-in, register, verify; complaint wizard (`complaint-1-what` ... `complaint-6-review`, `complaint-sent`); tips (`tip`, `tip-sent`); tracking (`track`, `track-result`); my cases and **case page** (`my-cases`, `case-00123*`, `case-00140*`, `case-00118-outside`); messages; notifications; rights, how-to, laws, news, help |
| `merchant/` (14) | Business | Complaints list and case (`complaints`, `complaint-00123*`), answer/offer/settlement, messages. `overview`, `stock`, `orders`, `profile` are the **existing AddisB2B desk tabs**; they exist so the menu works and are likely owned by AddisB2B (confirm in [open-questions.md](open-questions.md)) |
| `woreda/` (16) | Woreda | Dashboard, cases and case workspace (`case-00123`, `case-00140`), intake, calls, tips, messages, reports, administration (staff, offices, categories, content, settings) |
| `subcity/` (15) | Sub-City | Same menu as Woreda, scoped to its Woredas |
| `bureau/` (16) | City Bureau | Same menu, city-wide scope; edits categories and city-wide content; answers the free line |

## One screen, many files

The prototype uses a separate file per **state** because it has no JavaScript. In the app these are
**one route that renders by state**:

| Prototype files | App screen |
| --- | --- |
| `public/case-00123.html`, `-with-business`, `-new-offer`, `-agreed`, `-agreed-sack`, `-settlement`, `-subcity`, `-resolved`, `case-00140-info-required`, `-info-sent`, `case-00118-outside` | Consumer **Case page** `/cases/[reference]` rendered from status + holding level |
| `merchant/complaint-00123*` | Business **Complaint page** `/business/complaints/[reference]` |
| `woreda|subcity|bureau/case-*.html` | Officer **Case workspace** `/<level>/cases/[reference]` |
| `complaint-1-what` ... `complaint-6-review` | One **wizard** `/complaint/new` with steps, draft kept between steps |
| `*-saved.html`, `*-sent.html`, `tip-sent` | Success state after a submit, not a standalone route |

The dialogs opened with `#anchor` (`:target`) become modal components (escalate, accept, request
information, forward, record refund paid, counter-offer).

## What the prototype fakes (and the app must do for real)

| Prototype | Real behaviour needed |
| --- | --- |
| Fixed totals ("412 complaints") | Computed from data; dashboards are labelled sample only in demo mode |
| Sign-in without checking | Real auth, role-based portal redirect |
| `FREE_CALL` constant `8070` | `FREE_CALL_NUMBER` setting managed in Settings |
| Static lists (categories, offices) | Database-backed, editable by the Bureau |
| CSS-only filters/tabs | URL-driven, server-filtered lists; accessible tabs |
| "Prototype ribbon" with role jump | Remove in app; keep an optional demo-mode switcher only in development |

## Demo data

Use the fictional cast from `demo-data.md` for seeds and tests (Hirut Alemu, Gebriel Grain Traders,
CC-2026-00123 ...). Keep numbers consistent with it. Never seed real people or businesses.

## Page-by-page tracing

When you implement a page, add a row to [work-tracker.md](work-tracker.md): prototype page(s), route,
API endpoints, status (planned / built / verified). That row is the traceability record.
