# Domain model

Source: `prototype/PLAN.md` Revision 3 (9 Nov 2026) and `prototype/docs/demo-data.md`. Where this file
and the SRS differ, raise it ([open-questions.md](open-questions.md)). Machine-readable parts live in
[`lib/contracts`](../lib/contracts/index.js).

## Actors and portals

| Sign in as | Who | Portal path | Prototype folder |
| --- | --- | --- | --- |
| Consumer | An **individual** who bought something (never a business) | `/` | `public/` |
| Business | Owner of a business registered on AddisB2B | `/business` | `merchant/` |
| Woreda | Woreda trade-office officers and administrators | `/woreda` | `woreda/` |
| Sub-City | Sub-City coordinators | `/subcity` | `subcity/` |
| City Bureau | Bureau officers and administrators; content administrator | `/bureau` | `bureau/` |

Roles: `consumer`, `business_owner`, `woreda_officer`, `woreda_admin`, `subcity_coordinator`,
`bureau_officer`, `bureau_admin`, `content_admin`. Government roles work at one office level and,
for Woreda/Sub-City, one jurisdiction. The earlier single government portal with a "Working in"
switch is **gone**.

## Case escalation and the climb rule

Once a complaint is under investigation or review by a government office, upward referrals
follow the **climb rule**: a case moves up **one level at a time** and never skips an intermediate
level or moves downward (`isValidClimb` in `lib/contracts`). The City Bureau is the terminal level.

1. **Woreda**: resolves directly, or passes unresolved cases up to its Sub-City with a **handover note**.
2. **Sub-City**: resolves directly, or passes unresolved cases up to the City Bureau with a **handover note**.
3. **City Bureau**: last level; settles the case definitively or refers it for external regulatory/legal action.

Every government level can resolve. The consumer always sees **one case, one number, and the office holding it now**;
both consumer and business are notified at each move.

**Important distinction: initial intake vs in-progress climb:**
- The climb rule governs **in-progress inter-office transfers/escalations**.
- Initial complaint filing does NOT force every complaint through the lowest tier: under **Route A**,
  consumers select their initial government level (Woreda, Sub-City, or City Bureau) directly.
- Under **Route B**, the dispute starts with the business; if unresolved, it escalates to government
  according to Route B escalation rules.

## Dual complaint routing

Consumers have **two filing routes** when submitting a new complaint. The route is set at submission and
does not change. Machine-readable definitions: `COMPLAINT_ROUTES`, `GOVERNMENT_LEVELS`,
`validateRouteA`, `validateRouteB` in `lib/contracts`.

### Route A — Direct to Government

1. Consumer selects "Direct to Government".
2. Consumer selects a **government level**: Woreda, Sub-City, or City Bureau.
3. Consumer selects a **specific office** within that level.
4. The complaint is submitted directly to that office.

This route is used when the business is not registered on AddisB2B, or when the consumer chooses not to
engage the business directly. The complaint enters government custody immediately at `submitted` status.
`currentOfficeId` is set at submission and is **never null** for Route A cases.

### Route B — Registered Business

1. Consumer selects "Registered Business".
2. Consumer selects a **specific business** registered on AddisB2B.
3. The complaint is submitted to the business; the business has an opportunity to resolve it.
4. If unresolved, the consumer may escalate to the appropriate government office.

Before escalation, `currentOfficeId` is **null** — the case is held at the `"business"` handling level,
not by any government office. On escalation the consumer (or the system on SLA expiry — *to be confirmed*)
selects the government office and `currentOfficeId` is set. From that point the complaint climbs the
standard `isValidClimb` path.

The business sees the consumer only as `Consumer 00123` (see `consumerAlias`). Consumer name, phone
and address are never exposed to the business at any stage.

## Statuses

13 official complaint statuses (`CASE_STATUSES`): submitted, under initial review, information required,
accepted, assigned, under investigation, awaiting merchant response, under reconciliation, settlement pending,
resolved, escalated/referred, outside jurisdiction, closed. Consumers see **plain-language** wording
(for example "We asked the business to reply"); the mapping is a label catalogue, not code.

Tip statuses (`TIP_STATUSES`, proposed): received, under review, follow-up planned, converted to case,
closed with action taken, closed with no action. Tips are kept **apart from complaints**.

Categories (`COMPLAINT_CATEGORIES`, proposed, editable by the City Bureau): misleading commercial practice,
defective goods, expired products, unsafe products, price above ceiling, wrong weight/measure, service, other.

## Who sees what

| Data | Consumer | Business | Woreda | Sub-City | City Bureau |
| --- | --- | --- | --- | --- | --- |
| Own complaint | Yes | n/a | n/a | n/a | n/a |
| Complaint about this business | Own only | Yes, consumer as `Consumer 00123` | n/a | n/a | n/a |
| Cases | Own | Own business only | Held by the Woreda | Passed up by its Woredas | All, filter by holding office |
| Consumer name/phone/address | Own | **Never** | Yes (officers) | Yes | Yes |
| Internal notes | **Never** | **Never** | Yes | Yes | Yes |
| Anonymous tip sender | Own tracking code only | Never | No identity exists | No identity exists | No identity exists |

Consumer-business **Messages** are visible to the two parties and to the government level that holds the case.
Conversation kinds: consumer-business, consumer-government, business-government, government-government.
In a conversation a person can write, attach a file or **make an offer** (refund, replacement, repair, other);
the other side accepts, answers or counters.

## Scoped pages (Woreda / Sub-City / City Bureau)

Same menu, scoped data: Dashboard, Cases, New complaint (intake by free call, in person, letter), Free call line,
Tips, Messages, Reports, Administration (Staff and roles, Offices, Categories, Public content, Settings).
The scope table is in `prototype/PLAN.md` section 0.2; implement it as **query scoping on the server**.

## Reference codes

`CC-YYYY-NNNNN` complaints, `TIP-YYYY-NNNNN` tips. `CMP-` is taken by AddisB2B stall QR reports; never reuse it.

## Business rules to keep configurable, not hard-coded

Free call number (`8070`, placeholder), category and office lists, response and settlement targets
(48 hours is proposed, not approved), closing delay (two days after resolution is proposed), meeting
and visit scheduling rules. Anything labelled *proposed* or *to be confirmed* in the prototype stays
adjustable.

## Later-phase placeholders (grey, non-functional)

Fayda identity verification, AI-suggested category/urgency, automatic health-and-safety alerts to other
regulators, response-time targets, Telebirr/CBE Birr/EthSwitch refunds (refunds are only **recorded**),
SMS notifications, advanced analytics. Out of scope: licensing, market zoning, CAD/BIM, IoT cold storage.

## Glossary

**Woreda**: district trade office. **Sub-City**: one of 11 Addis Ababa sub-cities, above its Woredas.
**City Bureau**: Addis Ababa Bureau of Trade and Market Development (consumer rights directorate).
**Tip**: anonymous market report, not a personal claim. **Handover note**: officer's summary when passing a case up.
