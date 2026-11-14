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

21. **Administration rules I assumed** (built in the demo, please confirm): an office keeps at least one active administrator;
    the catch-all category ("Other", "Something else") cannot be removed; a removed category is retired, not deleted.
22. **Public content approval.** Does a Woreda notice need the Sub-City's approval every time it is edited, or only the
    first time? The demo sends every edit back for approval.

## Answered

- 2026-11-12, frontend developer: styling = prototype CSS ported verbatim, no Bootstrap ([ADR-0003](decisions/0003-frontend-styling.md)).
