# Consumer Rights Protection Portal: HTML/CSS Prototype Plan

| | |
| :--- | :--- |
| **Source** | SRS *Unified Consumer Grievance and Rights Protection Portal*, version 2.0 (proposed) |
| **Platform** | AddisB2B (this portal becomes a new module of it) |
| **Institution** | Addis Ababa Bureau of Trade and Market Development, Customer Rights Protection Directorate, 11 Sub-Cities and their Woreda trade offices |
| **Prototype type** | Clickable, static screens built with **HTML and CSS only**: no JavaScript, no backend, no saving |
| **Location** | Everything lives in `consumerPortalPrototype/`. Nothing outside this folder is created or changed. |
| **Status** | Revision 3 applied 9 Nov 2026: the climb, five sign-ins, chat. 100 pages built. All three government portals have the full menu. Next: review pack. |

---

## 0. Revision 3 (9 November 2026): the climb, five sign-ins, chat

**This section replaces Revision 2 wherever they disagree.** Revision 2 (below) is kept for the history and for the parts that still hold: the business desk, the free call line and the individual consumer.

### 0.1 The path a complaint takes

A complaint **climbs one level at a time**. It never skips a level, and the City Bureau is the last level.

1. **The business.** The complaint goes to the business first (when it is on AddisB2B). Consumer and business talk, make offers and counter-offers. If they agree, it is resolved and no government office is involved.
2. **The Woreda.** If they cannot agree, the consumer **moves it to the Woreda trade office** where they bought. A business that is not on AddisB2B comes straight here. The Woreda can resolve it by itself.
3. **The Sub-City.** If the Woreda cannot resolve it, the Woreda officer **passes it up** to the Sub-City, with a handover note. The Sub-City can resolve it.
4. **The City Bureau.** If the Sub-City cannot resolve it, it is passed up to the **Addis Ababa City Bureau**. This is the last level: it settles the case, or refers it for further action.

At every level the consumer sees one case with one number and the office that holds it now. The consumer and the business are told each time it moves.

### 0.2 Five sign-ins

| Sign in as | Who | Opens |
| :--- | :--- | :--- |
| **Consumer** | An individual person who bought something | `public/` |
| **Business** | The business owner: where consumer and business settle first | `merchant/` |
| **Woreda** | Woreda trade office officers (Meron Tadesse, Woreda 7) | `woreda/` |
| **Sub-City** | Sub-City trade office officers (Tsehay Bekele, Akaki Kality) | `subcity/` |
| **City Bureau** | City Bureau officers and administrators (Abebech Mulugeta) | `bureau/` |

There are **three government portals**, one per level, each with its own sign-in. The earlier single government portal with a "Working in" switch is gone.

**All three have the same side menu** (updated 9 November 2026): Dashboard, Cases, New complaint, Free call line, Tips, Messages, Reports, and Administration (Staff and roles, Offices, Categories, Public content, Settings). Each page is scoped to its level:

| Page | Woreda | Sub-City | City Bureau |
| :--- | :--- | :--- | :--- |
| Cases | Cases held by the Woreda, with a status filter | Cases passed up by its Woredas | Every case in the city, filtered by the office holding it |
| Free call line | Calls about the Woreda, passed on by the free line, to call back | Calls about the Sub-City, to pass to a Woreda or call back | Answers the free line for the whole city |
| Tips | Tips in the Woreda: plan a visit, make it a case | Tips in the Sub-City: send to a Woreda, or act here | All tips in the city |
| Reports | The Woreda, by market | The Sub-City, by Woreda | The whole city |
| Staff and roles | Its own staff | Its staff and the lead officer of each Woreda | Everyone |
| Offices | Its office details and markets | Its office details and Woredas | The 11 Sub-Cities |
| Categories | Read only, with "Suggest a change" | Read only, with "Suggest a change" | Edits the city-wide lists |
| Public content | Local notices, sent to the Sub-City for approval | Approves Woreda notices, publishes its own | Rights, laws, city-wide news |
| Settings | How new cases are assigned, email alerts | The same, plus where tips with no Woreda go | Free call number, time limits for each level |

### 0.3 Chat and negotiation

Every portal has **one** extra tab called **Messages** (in the public menu for the consumer, and in the side menu of the business and the three government portals). It holds the conversations that person takes part in:

- consumer and business
- consumer and government (Woreda, Sub-City or City Bureau)
- business and government
- government to government (the handover between levels)

In a conversation you can write, attach a file, or **make an offer** (refund, replacement, repair, other). The other side can accept it, answer it or make a counter-offer. The business sees the consumer only as *Consumer 00123*.

### 0.4 Other changes

- The public tab **Report a problem** is now **Report unfair trade** (the form is still the anonymous market tip).
- The consumer's progress bar reads: With the business, Woreda office, Sub-City office, City Bureau, Resolved.
- CC-2026-00123 now climbs the whole path: business (new sack offered) → Woreda 7 (visit, meeting 6 Nov, not resolved) → Akaki Kality Sub-City (meeting 9 Nov, not resolved) → City Bureau (meeting 11 Nov, refund of 2,250 ETB paid 12 Nov, resolved).
- CC-2026-00140 (kettle, Kality Electronics, not on AddisB2B) goes straight to Woreda 7 and is resolved there.
- Totals: **100 pages**: 37 public, 14 business desk, 16 Woreda, 15 Sub-City, 16 City Bureau, plus the start page and the style guide.

---

## 0b. Revision 2 (7 November 2026): what changed and why

This section **replaces** anything below that says otherwise. It records the decisions taken after Part A and Part B were reviewed.

### 0.1 Three stakeholders, three sign-ins

The sign-in page has three clear choices. Each one opens its own portal.

| Sign in as | Who | Opens | Look |
| :--- | :--- | :--- | :--- |
| **Consumer** | An **individual person** who bought goods or a service. A consumer is always an individual, everywhere in the system. | `public/`, My cases | AddisB2B public (forest green, orange) |
| **Business** | The business owner. This is where the consumer and the business **settle a dispute directly, before the government is involved**. | `merchant/`, the business desk | Workspace (navy, orange) |
| **Government** | Every government user, in **one portal**: Bureau, Sub-City and Woreda staff, and the administrators. What a person sees depends on their role and office level. | `government/` | Workspace (navy, orange) |

The earlier "Office staff" and "Administrator" choices are merged into **Government**. There is no separate admin portal: administration is a section of the government portal that only administrators see.

### 0.2 The complaint journey now has three stages

1. **Business first.** A complaint about a business that is on AddisB2B goes to that business. The consumer and the business talk and can agree an offer, all inside the portal. If they agree, the complaint is resolved and the government never needs to act.
2. **Bureau second.** If they cannot agree (or the business is not on AddisB2B, or the consumer does not want to deal with the business), the consumer chooses **Ask the Bureau to step in**. The case goes to the **Addis Ababa City Trade and Market Bureau**. **The Bureau resolves complaints itself.** Bureau staff review, ask for information, contact the business, hold the meeting and settle.
3. **Sub-City, then Woreda, only when needed.** The Bureau can **forward a case to a Sub-City** (for example when a visit or local action is needed). The Sub-City can **forward it on to a Woreda**. Each level can hand work down, and each level records what it did and gives the case back or resolves it. The consumer always sees one case with one number and the office that currently holds it.

Woreda and Sub-City offices are no longer the first receiver of a complaint. The Bureau is.

### 0.2a The direct stage, in detail (added 7 November 2026)

The business desk is the place where the consumer and the business try to settle **before** the government. Both sides can do the following inside the portal:

| Step | Consumer | Business |
| :--- | :--- | :--- |
| 1 | Sends the complaint (it goes to the business first) | Receives it as *Consumer 00123*, sees only what it needs |
| 2 | Reads the business's offer | **Replies with an offer**: refund, replacement or other, with an explanation and documents |
| 3 | **Accepts** it, **makes a counter-offer** (for example "a refund of 2,250 ETB"), or **asks the Bureau to step in** | Sees the consumer's answer |
| 4 | Reads the improved offer | **Offers the full refund**, **makes a different offer**, or **keeps its offer** |
| 5a | **Accepts**: resolved. Confirms they received it and rates the experience. If the business does not deliver, they can still ask the Bureau. | Confirms it paid, with proof. **The government never needed to act.** |
| 5b | **Asks the Bureau to step in** (reason: could not agree, no answer, other) | Is told, can write to the officer, and may be asked to attend a meeting |

Pages: consumer `case-00123-with-business.html`, `case-00123-new-offer.html`, `case-00123-agreed.html`, `case-00123-agreed-sack.html`; business `complaint-00123-answer.html`, `complaint-00123-agreed.html`, `complaint-00123-bureau.html`. Total is now **69 pages**: 35 public, 12 business desk, 20 government, the start page and the style guide.

### 0.3 Free call line

A toll-free number is shown to consumers throughout the public pages so that people who cannot or do not want to use the website can call. Calls are recorded by Bureau staff on the **Free call line** page of the government portal and can be turned into complaints. The number is one value (`FREE_CALL` in the build files) and is a placeholder until the Bureau provides the real one. It is suggested:

- in the header of every public page, as "Free call 8070"
- on the complaint start page, step 1 of the complaint form, the tip page, Help, the footer
- on every message that asks the consumer for something (information required, solution proposed) and when a case is outside the Bureau's remit
- on the business desk Help link and the government portal intake page, where the call is recorded

### 0.4 What this changes in the pages already built

| Area | Change |
| :--- | :--- |
| Sign in | Three roles: Consumer, Business, Government. Fields are never forced in the prototype, so a reviewer can click straight through. |
| Consumer pages | Case progress now reads: Sent to the business, Talking with the business, Bureau reviewing, Investigating, Agreement, Resolved. New page where the consumer and the business talk and the consumer can **Ask the Bureau to step in**. "Handled by" shows the Bureau, and the Woreda only when the case has been forwarded there. |
| Business pages | The business now replies **to the consumer first**, directly and within the portal. The business still never sees the consumer's name, phone or address. |
| Main story | CC-2026-00123: sent to the business (Mon 2 Nov) → the business offers only a new sack → consumer declines and asks the Bureau to step in (Wed 4 Nov) → Bureau accepts and forwards to Akaki Kality Sub-City → Sub-City forwards to Woreda 7 → site visit, meeting Fri 6 Nov, refund paid Sat 7 Nov → resolved. |
| Second story | CC-2026-00140 (kettle, Lideta Electronics, not on AddisB2B) goes straight to the Bureau, and the **Bureau resolves it by itself** without forwarding. |

### 0.5 New decisions

| # | Decision | Why |
| :--- | :--- | :--- |
| **D8** | Three sign-ins: Consumer, Business, Government. | One clear door per stakeholder. |
| **D9** | One government portal with roles, instead of separate office and admin portals. | One login, one place to learn, fewer screens. |
| **D10** | Complaints go to the business first when it is registered. The Bureau steps in on request. | Most disputes are settled faster between the two parties. |
| **D11** | The Bureau is the primary resolver. Forwarding to a Sub-City, and from there to a Woreda, is optional and recorded. | Matches how the institution works. |
| **D12** | A free call number is offered wherever a person may need help. | Not everyone can use the website. |
| **D13** | A consumer is always an individual. Businesses are never consumers in this system. | Keeps the rights and the privacy rules simple. |

---

## 1. Purpose

The prototype lets the Directorate, Sub-City and Woreda offices, and pilot users click through every important screen of the consumer portal **before** anything is built in the real AddisB2B code. It is used to:

1. Agree the complaint journey, the tip journey and the case statuses with the institution.
2. Agree what each role sees and does, and what merchants may and may not see.
3. Collect answers to the open questions in SRS section 12, with screens to point at.
4. Give the developers an exact picture of the pages, fields and states to implement.

It does **not** save data, send messages, verify identity or calculate anything. Every number is typed in from a fixed demo dataset (section 7).

---

## 2. How this fits the existing AddisB2B system

### 2.1 What AddisB2B is today

AddisB2B is a Next.js website with a NestJS server and a PostgreSQL database. It has:

| Part | What it does now | Relevance to this portal |
| :--- | :--- | :--- |
| **Public site** | Home, prices, market registry, sign in, register | The consumer portal's public pages sit beside these and use the same look |
| **Four portals** | Supplier, Buyer, Government, Admin | Consumers are a **new fifth kind of user**; merchants already exist as supplier and buyer businesses |
| **Government portal** | City HQ, Sub-City, Woreda, Oversight agencies, Market Center workspaces, each locked to its area by the account's jurisdiction code | The institutional case portal becomes a **new Consumer Protection workspace** inside the government portal, with a new Directorate level |
| **Registers** | *Producers & Factories* and *Market Traders*, with visits and records | A complaint about a registered business links to that existing record instead of creating a duplicate (SRS 8.2) |
| **Stall QR page** | A shopper scans a stall QR code and reports a price problem; it lands in the Woreda *Shopper complaints* list | The closest existing feature. The plan keeps it and shows it as one source of **tips** (decision D4) |
| **B2B disputes** | Buyer and supplier disputes on orders, settled by platform operations | Must stay **separate** from consumer complaints (SRS 8). The prototype never mixes them |
| **Shared tools** | Lookups (editable dropdown lists), notices to Sub-Cities, feedback on every tab, staff list and duties, activity log, Excel and print exports | Reused for complaint categories, office notices, case history, reports and exports |
| **Security model** | Sign-in sessions, role permissions, office-area locks, append-only audit log | The prototype shows these rules as visible area locks and restricted views |

### 2.2 Reuse map: SRS section 8 to the existing system

| SRS integration area | Existing AddisB2B piece | How the prototype shows it |
| :--- | :--- | :--- |
| 8.1 Authentication | Sign-in, accounts and roles | Consumer sign-in and registration pages in the same style as the AddisB2B sign-in |
| 8.2 Business records | *Producers & Factories*, *Market Traders* registers | Complaint form offers "Find the business" with a registered match, or "Not on AddisB2B" with name and address |
| 8.3 Administrative structure | Office jurisdiction codes (City HQ, Sub-City, Woreda) | New Directorate level; every office screen shows its area lock |
| 8.4 Notifications | Trade notifications, office notices | Consumer notification list and office notice banners |
| 8.5 Document storage | Protected photo and attachment storage | Evidence cards marked "visible to officers only" or "shared with merchant" |
| 8.6 Audit and reporting | Activity log, Excel and print reports | Case history, audit page, report pages with print layout |

### 2.3 Two looks, both taken from the live system

| Area | Look | Source |
| :--- | :--- | :--- |
| Public consumer pages | Forest green `#123d31`, orange `#d76512`, white cards, English with an Amharic line under each label | AddisB2B public site and the earlier `addisb2b-prototype` |
| Office workspace | Dark navy sidebar `#0c1e32`, navy `#0e2a47`, orange `#e0640f` for the current item, white top bar with office name and account | AddisB2B government workspaces as they are now |
| Merchant view | Same as the supplier and buyer desks (navy and orange), because merchants already use those desks | AddisB2B desk shell |

The prototype has its **own copy** of these styles inside `consumerPortalPrototype/assets/css/`. It does not link to files outside the folder, so changing it can never affect the rest of the system.

---

## 3. Ground rules

### 3.1 Technology: HTML and CSS only

| Need | How it is done without JavaScript |
| :--- | :--- |
| Move between screens | Links, and `<form action="next-page.html" method="get">` |
| A screen in different states (for example "information required") | A separate page per state, for example `case-00123-info-required.html` |
| Tabs inside a page (case workspace, reports) | Hidden radio buttons with `:checked ~ .panel` |
| Dialogs ("Accept", "Request information", "Escalate") | `:target` (`<a href="#escalate">` opens `<div id="escalate">`) |
| Mobile menu, show and hide | Checkbox pattern (`input:checked + nav`) |
| FAQs, rights articles, long histories | Native `<details>` and `<summary>` |
| Filters on a case list | Checkboxes with `:has()` that hide rows that do not match |
| Form rules (required, file types, lengths) | Real HTML validation: `required`, `maxlength`, `accept`, `pattern`, with `:invalid` styling |
| Charts on dashboards | CSS bars (`width: calc(var(--v) * 1%)`) and `conic-gradient` donuts |
| Map of Sub-Cities | One inline SVG, reused |
| Printable referral letter and reports | `@media print` styles |
| Icons | Inline SVG, so the prototype works offline |

No page has a `<script>` tag. That is checked before each part is called finished.

### 3.2 Other rules

1. **Self-contained.** Every page, style, image and document is inside `consumerPortalPrototype/`. Links never leave the folder, except one clearly labelled link back to the AddisB2B home.
2. **Bilingual labels.** English first with the Amharic line beneath, as in the rest of AddisB2B. One public page is also built fully in Amharic to show that Amharic as the main language works (SRS NFR-008).
3. **Three screen widths.** Every page works at 360 px (phone), 768 px (tablet) and 1280 px (desktop) (NFR-007).
4. **Accessible.** Visible focus, labels on every field, colour contrast to WCAG AA, and statuses shown with text, not colour alone (NFR-006).
5. **Fictional data only.** All people, businesses and amounts are invented and marked as demo data.
6. **"Prototype" ribbon.** A thin bar on top of every page reads *Prototype, demo data* and lets reviewers jump to any role without signing in.
7. **Traceable.** Each page carries a comment listing the SRS requirement IDs it shows, and `docs/traceability.md` lists every requirement and the pages that show it.
8. **Future features look different.** Fayda checks, SMS, AI classification, payment refunds and response-time targets appear only as grey *Later phase* placeholders.

---

## 4. Folder structure

```
consumerPortalPrototype/
├── PLAN.md                        ← this plan
├── index.html                     ← prototype start page: what it is, every role, every journey
├── assets/
│   ├── css/
│   │   ├── tokens.css             ← colours, type, spacing for both looks
│   │   ├── base.css               ← reset, typography, Amharic line, focus
│   │   ├── components.css         ← buttons, fields, cards, badges, tables, timeline, stepper, alerts
│   │   ├── patterns.css           ← CSS-only tabs, dialogs, filters, menu toggle
│   │   ├── public.css             ← public header, footer, hero, forms for citizens
│   │   ├── office.css             ← workspace look shared by merchant and government: rail, top bar, tiles
│   │   ├── merchant.css           ← merchant desk extras
│   │   └── print.css              ← referral letter and reports on paper
│   └── img/                       ← logo, Sub-City map SVG, sample evidence pictures (drawn, not photos of people)
├── public/                        ← Part A: citizens
├── merchant/                      ← Part B: merchants and service providers
├── woreda/                        ← Part C1: Woreda portal
├── subcity/                       ← Part C2: Sub-City portal
├── bureau/                        ← Part C3: City Bureau portal (incl. administration, free call line, tips)
└── docs/
    ├── styleguide.html            ← every component on one page
    ├── demo-data.md               ← the one shared demo dataset
    ├── demo-script.md             ← click-by-click walkthroughs for the review meeting
    └── traceability.md            ← every CR-FR and NFR ID mapped to its pages
```

---

## 5. Roles shown in the prototype

Three sign-ins (Revision 2, section 0.1). Inside **Government**, a person's role decides what they see.

| Sign in as | Role | Works at | What they see |
| :--- | :--- | :--- | :--- |
| Consumer | Individual consumer | `public/` | Own cases only |
| Business | Business owner or manager | `merchant/` | Complaints about their own business only, consumer shown as *Consumer 00123* |
| Government | **Bureau administrator** (Abebech Mulugeta) | City Trade and Market Bureau | Everything city-wide, assigns cases, forwards to Sub-Cities, manages staff, offices, categories, content, settings |
| Government | **Bureau officer** (Yonas Girma) | City Trade and Market Bureau | Cases assigned to them; resolves complaints; can forward to a Sub-City |
| Government | **Sub-City coordinator** (Tsehay Bekele) | Akaki Kality Sub-City | Cases forwarded to the Sub-City; can forward to a Woreda or resolve |
| Government | **Woreda officer** (Meron Tadesse) | Woreda 7, Akaki Kality | Cases forwarded to the Woreda: visits, meetings, settlements; gives the case back when done |
| Government | **Content administrator** (Liya Solomon) | Bureau | Public information only (rights, laws, news) |

The top bar of the government portal has a **Working in** menu (as in the existing AddisB2B City HQ portal) to move between the Bureau, the Sub-City and the Woreda view.

---

## 6. Case statuses and tip statuses

**Formal complaints**: the 13 statuses from SRS 5.2: Submitted, Under Initial Review, Information Required, Accepted, Assigned, Under Investigation, Awaiting Merchant Response, Under Reconciliation, Settlement Pending, Resolved, Escalated / Referred, Outside Jurisdiction, Closed.

The consumer sees **plain-language** versions of the same statuses. For example *Awaiting Merchant Response* reads "We asked the business to reply", and internal notes are never shown.

**Tips (proposed, for the institution to approve, SRS 4.3):** Received, Under Review, Follow-up Planned, Converted to Case, Closed with Action Taken, Closed with No Action.

**Complaint categories (proposed, pending approval, CR-FR-008):** Misleading commercial practice, Defective or substandard goods, Expired products, Unsafe products (health and safety), Price above the official ceiling, Wrong weight or measure, Service complaint, Other. The admin screens show them as an editable list, like the AddisB2B Lookups tab.

---

## 7. Demo dataset (`docs/demo-data.md`)

One fixed story that runs through every part, so a case started by a citizen can be followed into the office, the merchant desk and the reports.

| Item | Demo value |
| :--- | :--- |
| Demo week | 2–8 November 2026 |
| Reference formats | Complaints `CC-2026-00123`; tips `TIP-2026-00045` (different from the existing stall report code `CMP-…`) |
| Pilot offices | Customer Rights Protection Directorate (central); Akaki Kality Sub-City; Woreda 7, Akaki Kality; Bole Sub-City for comparison |
| Consumer | Hirut Alemu (fictional), signed-in account |
| Officers (fictional) | Meron Tadesse (Woreda 7 officer), Dawit Kebede (Woreda 7 administrator), Tsehay Bekele (Akaki Kality Sub-City administrator), Yonas Girma (Directorate officer), Abebech Mulugeta (Directorate administrator), Liya Solomon (content administrator) |
| Registered merchant | *Gebriel Grain Traders* (fictional), a market trader already on AddisB2B |
| Unregistered merchant | *Kality Mini Market* (fictional), not on AddisB2B |

**The five demo cases.** Together they cover every status and both journeys.

| Reference | What happened | Path shown |
| :--- | :--- | :--- |
| `CC-2026-00123` **(main story)** | Hirut bought 25 kg of rice from Gebriel Grain Traders; 4 kg short and mixed with stones. Paid 2,250 ETB. Wants a replacement or refund. | Submitted → Initial review → Accepted → Assigned → Investigation → Merchant response → Reconciliation → Settlement pending (refund 2,250 ETB) → Resolved → Closed |
| `CC-2026-00131` **(escalation)** | Expired infant formula sold at Kality Mini Market. Marked **urgent: health and safety**. The shop refuses to settle. | Accepted with high priority → Investigation → Reconciliation failed → Escalated to the Directorate → Referred to the responsible authority, with the referral letter |
| `CC-2026-00140` **(missing information)** | Faulty electric kettle, no receipt attached. | Initial review → Information required → Hirut uploads the receipt → Accepted |
| `CC-2026-00118` **(outside jurisdiction)** | Disagreement over a house rent deposit. | Initial review → Outside jurisdiction, with the explanation the consumer sees |
| `TIP-2026-00045` **(anonymous tip)** | Sugar sold above the official price at several shops near Market 097. | Received → Under review → Follow-up planned → Converted to case `CC-2026-00137` |

**Dashboard numbers.** Fixed sample figures, worked out once so that the totals agree everywhere (for example 412 complaints this quarter, 318 resolved, 21 escalated, 1.24 million ETB restitution recorded). Every dashboard is labelled *sample figures*.

---

## 8. Page inventory

Pages are listed by part. File names are final. The SRS IDs show what each page proves.

### Part A: Public consumer portal (`public/`), plus `case-00123-with-business.html` (talk to the business, or ask the Bureau to step in)

| File | Page | SRS |
| :--- | :--- | :--- |
| `index.html` | Consumer protection home: what to do, two clear choices (*Make a complaint* / *Report a problem anonymously*), track a case, know your rights | 2.1A, CR-FR-043 |
| `home-am.html` | The same home page fully in Amharic | NFR-008 |
| `complaint-or-tip.html` | Helps the citizen choose: complaint (I want my money back or a fix) or tip (I saw a problem in the market) | CR-FR-012, CR-FR-016 |
| `sign-in.html` | Consumer sign in | CR-FR-002 |
| `register.html` | Create an account (name, phone, email, Sub-City and Woreda, password) | CR-FR-001 |
| `verify.html` | Identity check page with a grey *Fayda verification, later phase* option | CR-FR-003, 10.1 |
| `complaint-1-what.html` | Complaint step 1: category, subject, what happened | CR-FR-006, CR-FR-007, CR-FR-008 |
| `complaint-2-business.html` | Step 2: find the business on AddisB2B, or enter an unregistered one | CR-FR-007, 8.2 |
| `complaint-3-purchase.html` | Step 3: what was bought, date, place (Sub-City, Woreda), amount paid, loss | CR-FR-007 |
| `complaint-4-evidence.html` | Step 4: upload receipt, photos, documents (types and size shown) | CR-FR-009, NFR-012 |
| `complaint-5-outcome.html` | Step 5: what the citizen wants (refund, replacement, repair, other) and contact details | CR-FR-007 |
| `complaint-6-review.html` | Check everything and confirm; privacy note on what the merchant will see | CR-FR-004 |
| `complaint-sent.html` | Confirmation with reference `CC-2026-00123`, first status, what happens next | CR-FR-010, CR-FR-011 |
| `tip.html` | Tip form: issue, location, business or product if known, description, evidence, *stay anonymous* option | CR-FR-012 – 014, CR-FR-005 |
| `tip-sent.html` | Confirmation with tip code and a private follow-up code (no personal details kept) | CR-FR-014 |
| `track.html` | Track by reference and phone number, without signing in | CR-FR-039 |
| `track-result.html` | Status of a tracked case (plain-language view) | CR-FR-039, CR-FR-040 |
| `my-cases.html` | Signed-in consumer: list of own complaints and their statuses | CR-FR-039 |
| `case-00123.html` | Consumer case page: status stepper, timeline of updates, official messages, merchant reply as shared | CR-FR-040 |
| `case-00140-info-required.html` | Case asking for more information, with upload and reply form | CR-FR-026, CR-FR-041 |
| `case-00140-info-sent.html` | After replying: back to *Under Initial Review* | CR-FR-040 |
| `case-00123-settlement.html` | Consumer sees the proposed settlement and accepts or declines | CR-FR-031, CR-FR-032 |
| `case-00123-resolved.html` | Resolved case with the recorded outcome (refund 2,250 ETB) | CR-FR-033, CR-FR-051 |
| `case-00118-outside.html` | Outside jurisdiction, with the explanation and where to go instead | CR-FR-018 |
| `notifications.html` | Consumer notification list (submitted, information requested, merchant replied, resolved) | CR-FR-041, CR-FR-042 |
| `rights.html` | Know your rights: plain-language articles with `<details>` | CR-FR-043 |
| `how-to-complain.html` | The process step by step, timings marked as proposed | CR-FR-043 |
| `laws.html` | Laws and documents library (Proclamation 813/2013 and others), each marked *to be verified by the legal office* | CR-FR-044, 13 |
| `news.html` and `news-article.html` | Announcements and awareness campaigns | CR-FR-045 |
| `help.html` | FAQ and contact offices by Sub-City | CR-FR-043 |

### Part B: Business desk (`merchant/`): resolve directly with the consumer first

Registered businesses respond from their existing AddisB2B desk, which gets a new *Consumer complaints* section. A business that is not on AddisB2B is handled by the officer (decision D3).

| File | Page | SRS |
| :--- | :--- | :--- |
| `overview.html`, `stock.html`, `orders.html`, `profile.html` | The existing AddisB2B desk tabs, so the side menu is fully working | n/a |
| `complaints.html` | List of complaints about **this business only**, with the reply deadline | CR-FR-023, CR-FR-025 |
| `complaint-00123.html` | Restricted case view: consumer shown as *Consumer 00123*, only the facts needed; no internal notes, no other cases | CR-FR-004, CR-FR-024, CR-FR-025 |
| `complaint-00123-respond.html` | Reply to the consumer: explanation, offer (refund, replacement, other), documents | CR-FR-024 |
| `complaint-00123-sent.html` | Response sent, recorded in the case history | CR-FR-027 |
| `complaint-00123-settlement.html` | Merchant confirms the agreed settlement is done and uploads proof | CR-FR-032, CR-FR-033 |

### Part C: Government portal (`government/`), one sign-in, roles inside

All pages share the workspace layout: dark side menu, top bar with the **Working in** menu and the signed-in person. Menu items depend on the role. **Administration** items appear only for the Bureau administrator and the content administrator.

**Bureau (Abebech Mulugeta, administrator; Yonas Girma, officer)**

| File | Page | SRS |
| :--- | :--- | :--- |
| `dashboard.html` | Bureau dashboard: new, in progress, overdue, resolved; where cases are now (Bureau, Sub-City, Woreda); calls today; needs-action list | CR-FR-047, CR-FR-054 |
| `cases.html` | All cases, with filters by status and by the office holding them | CR-FR-039 |
| `case-00123-bureau.html` | Escalated case just received by the Bureau: accept, request information, assign to an officer, **Forward to a Sub-City** (dialog) | CR-FR-017 – CR-FR-021 |
| `case-00140.html` | A case the Bureau resolves **by itself**: request information, contact the business, settle, close | CR-FR-018, CR-FR-030 – CR-FR-034 |
| `intake.html` and `intake-saved.html` | Record a complaint taken by **free call**, in person or by letter | CR-FR-001, CR-FR-017 |
| `calls.html` | **Free call line** log: calls today, notes, turn a call into a complaint | CR-FR-017 |
| `tips.html` and `tip-00045.html` | Tips inbox (kept apart from complaints) and tip review with **Convert to case** | CR-FR-015, CR-FR-016, CR-FR-048 |
| `reports.html` | Reports with CSS bars: by category, by office level, resolution and restitution | CR-FR-047, CR-FR-050 – CR-FR-054 |

**Sub-City (Tsehay Bekele, Akaki Kality)**

| File | Page | SRS |
| :--- | :--- | :--- |
| `subcity-dashboard.html` | Cases forwarded by the Bureau, with the **Forward to a Woreda** (dialog), resolve, or return actions | CR-FR-019, CR-FR-020 |
| `case-00123-subcity.html` | The main case at the Sub-City: forward to Woreda 7 with instructions | CR-FR-020, CR-FR-035 |

**Woreda (Meron Tadesse, Woreda 7)**

| File | Page | SRS |
| :--- | :--- | :--- |
| `woreda-dashboard.html` | Cases forwarded to the Woreda: visits to do, meetings, settlements | CR-FR-047 |
| `case-00123-woreda.html` | Visit and findings recorded, meeting set, settlement proposed, **record refund paid** (dialog) | CR-FR-028 – CR-FR-033 |
| `case-00123-resolved.html` | Resolved at the Woreda and given back to the Bureau; outcome and history | CR-FR-034 |

**Administration (Bureau administrator, content administrator)**

| File | Page | SRS |
| :--- | :--- | :--- |
| `staff.html` | Staff accounts, their role and office level, add and edit (dialogs) | 3, NFR-001 |
| `offices.html` | The chain: Bureau, 11 Sub-Cities, Woredas, who can forward to whom | CR-FR-019 |
| `categories.html` | Complaint categories, tip categories, settlement types as editable lists | CR-FR-008 |
| `content.html` | Rights articles, laws and news with draft and published state | CR-FR-044 – CR-FR-046 |
| `settings.html` | The free call number and its opening hours, reply and settlement targets | CR-FR-042, 10.4 |

**Total 69 pages:** 35 public, 12 business desk, 20 government, plus the start page and the style guide. The old separate "office" and "admin" parts (25 + 6 pages) are replaced by these 20.

---

## 9. Journeys to click through (`docs/demo-script.md`)

| # | Journey | Pages in order |
| :--- | :--- | :--- |
| 1 | **Business first, then the Bureau, then down to the Woreda** (main story) | Public home → complaint steps 1–6 → sent → business desk replies with a new-sack offer → consumer declines and asks the Bureau to step in → Bureau accepts and forwards to the Sub-City → Sub-City forwards to Woreda 7 → visit, meeting → consumer accepts a refund → Woreda records it paid → resolved |
| 2 | **Settled with the business** | Complaint → business offers a new sack → consumer makes a counter-offer for a refund → business offers the full refund → consumer accepts → both sides confirm → resolved, the government never involved |
| 3 | **The Bureau resolves it by itself** | Kettle complaint (business not on AddisB2B) → Bureau asks for the receipt → consumer sends it → Bureau settles |
| 4 | **Free call** | Public pages suggest the call → Bureau records the call on `calls.html` → intake → complaint |
| 5 | **Outside the Bureau's remit** | Rent deposit complaint → Bureau explains and points to where to go; the free call is offered |
| 6 | **Anonymous tip** | Tip form → tips inbox → review → converted to case `CC-2026-00137` |
| 7 | **Management view** | Bureau dashboard → cases held at each level → reports |
| 8 | **Business privacy** | Business desk shows only its own complaints and a pseudonymous consumer |

---

## 10. Order of work

Each step ends with all its pages linked, checked at three widths and listed in the traceability file.

| Step | What is built | Size (pages) |
| :--- | :--- | :--- |
| **1. Foundation** ✅ | Tokens for both looks, base, components, patterns, print; prototype ribbon; `index.html` start page; `styleguide.html`; `demo-data.md` | 2 |
| **2. Public portal** ✅ | Part A: home, choice, sign in and register, the six complaint steps, tip, tracking, consumer case pages, rights, laws, news, help, Amharic home | 31 |
| **3. Business desk** ✅ | Part B: overview, stock, orders, profile, complaints, reply, settlement | 9 |
| **4. Revision 2** ✅ | Three sign-ins, free call line, business-first journey in Parts A and B | +1 |
| **5. Government portal** ✅ | Part C: Bureau, Sub-City, Woreda and administration | 20 |
| **6. Review pack** | `demo-script.md`, `traceability.md`, final link and width checks, fixes | — |

---

## 11. How each step is checked

1. **No scripts:** a search confirms no page contains `<script` and no file outside the folder is referenced.
2. **No broken links:** a link checker run from a temporary folder outside the project (it does not add files to the prototype).
3. **Widths:** screenshots of every page at 360, 768 and 1280 px in Edge; no sideways scrolling.
4. **Forms:** required fields, file types and lengths block submission with a clear message.
5. **Privacy:** the merchant pages and the anonymous tip pages are read once more against CR-FR-004, CR-FR-014 and CR-FR-025.
6. **Traceability:** every CR-FR and NFR ID is listed against at least one page, or marked *not shown in a static prototype* with the reason (for example NFR-004 availability and NFR-011 backups).

---

## 12. Shown only as *Later phase* placeholders

These come from SRS sections 9 and 10. They appear greyed out with a short note so reviewers can see where they would go, but they do nothing:

- Fayda identity verification (10.1)
- AI-suggested category and urgency (10.2). The note says an officer always decides.
- Automatic health and safety alerts to other regulators (10.3)
- Response and settlement time targets, including the proposed 48 hours (10.4)
- Telebirr, CBE Birr and EthSwitch refunds (10.5). Refunds are only **recorded**.
- SMS notifications (CR-FR-042)
- Advanced trend analytics (10.6)

Not shown at all, as SRS 2.2 places them outside this module: licensing, market zoning, CAD/BIM, IoT cold storage.

---

## 13. Decisions in this plan (please confirm or change)

| # | Decision | Why |
| :--- | :--- | :--- |
| **D1** | Public pages use the AddisB2B public look (forest green and orange); office pages use the government workspace look (navy and orange). | Consumers and officers see the same AddisB2B they already know |
| **D2** | The institutional portal is a new **Consumer Protection** workspace inside the government portal, with a new **Directorate** level next to City HQ. | Reuses office area locks and the workspace layout already built |
| **D3** | Merchants already registered on AddisB2B answer from their own supplier or buyer desk. For businesses not on AddisB2B, the officer records their reply in the case. | No new merchant accounts for one-off complaints; registered businesses get a clean, restricted view |
| **D4** | The existing stall QR price report stays as it is and appears in the office **tips** inbox as a tip from a stall. | It is a market problem report, not a personal claim; this avoids two separate complaint systems |
| **D5** | English labels with an Amharic line under each, plus one fully Amharic page. | Matches AddisB2B today and proves Amharic-first is possible (NFR-008) |
| **D6** | New reference codes `CC-` for complaints and `TIP-` for tips. | `CMP-` is already used by the stall QR reports |
| **D7** | Proposed categories, tip statuses and timings are labelled *proposed, awaiting approval*. | SRS sections 12 and 13 say they are not confirmed yet |

---

## 14. Open questions the prototype will show, not answer

These are SRS section 12 questions. The prototype puts each one on the screen where it matters, marked *to be confirmed*, so the institution can answer them while clicking through:

1. Final complaint categories (Part D `categories.html`, Part A step 1).
2. Which office receives which category first (`offices.html`, intake).
3. When verified identity is required (`verify.html`, step 6).
4. Whether anonymous tips are accepted and how (`tip.html`).
5. What the merchant may see (`merchant/complaint-00123.html`).
6. Whether the 48-hour target is approved and when the clock starts (`targets.html`).
7. The approved reconciliation and settlement procedure (case workspace).
8. Which authority receives referred cases, and whether there is an appeal (`case-00131-referral.html`).
9. Which restitution outcomes and reports are required (`dir-reports.html`).
10. Which Sub-Cities join the pilot (`dir-map.html`).

---

## 15. After you confirm

1. Build step 1 (foundation) and show you the start page and style guide.
2. Build the public portal (step 2) and walk through journey 1 up to *complaint sent*.
3. Continue step by step, reporting after each step what was built and checked.

Nothing outside `consumerPortalPrototype/` is created or changed at any point.
