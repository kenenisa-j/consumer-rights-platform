# Open questions

Do not decide these silently. Implement the configurable/placeholder form, ask, and record the answer here
(move answered items to the bottom with the date and who decided).

## From the SRS (section 12), as shown in the prototype

1. Final complaint categories (bureau `categories.html`, complaint step 1).
2. Which office receives which category first (offices, intake).
3. When verified identity is required (`verify.html`, review step). Fayda is later phase.
4. Whether and how anonymous tips are accepted (`tip.html`).
5. What the business may see of a complaint (`merchant/complaint-00123.html`).
6. Whether the 48-hour response target is approved and when the clock starts.
7. The approved reconciliation and settlement procedure.
8. Which authority receives referred cases; whether there is an appeal.
9. Which restitution outcomes and reports are required.
10. Which Sub-Cities join the pilot.

## Project and engineering

11. **Relationship to AddisB2B.** Separate deployment with an integration, or code moved into the AddisB2B
    monorepo as a module? Who owns accounts, the business registry and office structure?
    ([ADR-0002](decisions/0002-relationship-to-addisb2b.md))
12. **Business desk tabs.** Are `overview`, `stock`, `orders`, `profile` in `merchant/` owned by AddisB2B (we only
    add the complaints and messages sections)?
13. **SRS source.** Where is the consumer-portal SRS v2.0 (CR-FR-xxx / NFR-xxx IDs)? The prototype cites it but it
    is not in this repository. Needed for traceability.
14. ~~Styling approach~~: answered, see Answered below.
    ([ADR-0003](decisions/0003-frontend-styling.md))
15. **Real-time messaging.** Polling/refresh in v1, or live updates?
16. **Retention.** How long are complaints, evidence, messages and tips kept? Deletion/anonymisation policy.
17. **Language and calendar.** Amharic as a full second language at launch? Ethiopian calendar display/input?
18. **Official time limits** at each level (the Settings page implies per-level limits) and who may change them.
19. **Notifications.** In-app only for v1; SMS/email later. Confirm.
20. **Hosting** and who operates it (government vs HEMIN); affects offline/self-hosting constraints.

## Dual routing (confirmed: Route A and Route B)

21. **Route B escalation trigger.** When a Route B complaint is not resolved by the business, what triggers
    escalation: a consumer-initiated action, an SLA expiry (auto-escalation), or both? If SLA: who sets the
    target and can it be changed per category?

22. **Route B escalation target and initial government tier.** When a Route B complaint is escalated from
    the business to government, how is the receiving government office and tier determined?
    - Does it strictly enter at the local Woreda level (following the prototype's default `business -> woreda` climb),
      subsequently climbing Woreda -> Sub-City -> Bureau if unresolved?
    - Or can the consumer (or system) direct the escalation to an office at any government level (e.g. Sub-City
      or City Bureau directly), similar to Route A's level selection?
    - How do business physical location, consumer residence, and complaint severity affect this destination?
    This policy remains unresolved and must be agreed with the Bureau.

23. **Reference number format.** `lib/contracts` uses `CC-YYYY-NNNNN` (5-digit, prototype-aligned) as the
    provisional format. This is kept intact until the Bureau formally approves an official format. Existing
    prototype references must not change. Confirm the official format with the Bureau before the first migration.

24. **Route B: business not responding.** If the business never responds, how many days before the consumer
    may escalate? Is there a system reminder to the business? Who sets this limit?

25. **Administration rules I assumed** (built in the demo, please confirm): an office keeps at least one active administrator;
    the catch-all category ("Other", "Something else") cannot be removed; a removed category is retired, not deleted.
26. **Public content approval.** Does a Woreda notice need the Sub-City's approval every time it is edited, or only the
    first time? The demo sends every edit back for approval.

27. **Choosing the first office.** The complaint form's last step now lets the consumer send a complaint to the business, the Woreda,
    the Sub-City or the City Bureau, defaulting to the Bureau (Route A allows any government level). Please confirm this is wanted
    for every category, and whether a Bureau-held case may be passed *down* to a Woreda to visit the market (the climb rule only
    covers moving up).

## Answered

- **Route A office selection (resolved 12 Nov 2026).** Decided: For Route A, consumers always select
  a specific office within their chosen government level (Woreda, Sub-City, or City Bureau). The office
  listed must belong to that level; a Woreda office is not valid for a Sub-City or Bureau selection and
  vice versa. This rule applies equally to all three government levels and is enforced by
  `officeBelongsToLevel` in `lib/contracts` and by backend service logic.
- 2026-11-12, frontend developer: styling = prototype CSS ported verbatim, no Bootstrap ([ADR-0003](decisions/0003-frontend-styling.md)).
