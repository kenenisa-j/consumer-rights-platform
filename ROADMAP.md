# Roadmap

Separates current code from intended scope. It is not a release schedule. Priorities need owner review
against the prototype and the open questions.

## Current

- Foundation: rules, documentation, shared contracts, validation script, CI, templates. (Done, see changelog.)

## Next: frontend plan and first slices (frontend owner)

- Scaffold `web/`: shells for the public and workspace looks, tokens, label catalogue (English + Amharic), API client.
- Vertical slices from the prototype, in this suggested order: public home and information pages → sign-in and
  registration → complaint wizard and submission → consumer case page and tracking → business answer and offers →
  government workspaces (dashboard, cases, case workspace, climb) → messages → tips → intake and free call line →
  reports → administration.

## Next: backend plan (backend owner)

- Scaffold `backend/`: auth, memberships, offices tree, permission guard, response envelope.
- Complaints module with the transition service, history and audit; tips; messaging with offers; evidence storage;
  notifications; content and settings; reports.

## Later

- Integration with AddisB2B accounts, business registry and office structure ([ADR-0002](documentation/decisions/0002-relationship-to-addisb2b.md)).
- Later-phase placeholders become real only when approved: Fayda verification, SMS, AI-assisted triage,
  regulator alerts, payment refunds, advanced analytics.
- Pilot readiness: deployment, monitoring, backups and restore drill, shared rate limiting, independent security review.

## Completion standard

Delivery requires verified server policies, persistent data flow, failure behaviour, meaningful integration
checks and browser flows at three widths. External integrations also need authorized provider configuration and
evidence from the target environment.
