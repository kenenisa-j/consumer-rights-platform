# Security and privacy

This system holds citizens' complaints about real businesses and anonymous reports. A mistake can expose a
person or undermine trust in the Bureau. These rules are non-negotiable; if one blocks you, ask.

## Data classes

| Class | Examples | Rule |
| --- | --- | --- |
| Consumer identity | name, phone, email, address, Fayda ID (later) | Visible to the consumer and officers only. **Never** to businesses |
| Case content | description, amounts, offers, messages | Visible to parties and the holding government level |
| Evidence files | receipts, photos, documents | Per-file flag: *officers only* or *shared with business*; served only via authorized endpoint |
| Internal notes | officer notes, handover reasoning | Government only. Never in consumer or business responses |
| Anonymous tips | issue, location, evidence | No identity stored. Follow-up through a random code (stored hashed) |
| Credentials | passwords, sessions, secrets | Better Auth; never logged, never in contracts |

## Access rules

1. Authenticate every protected request on the server; the UI is not a boundary.
2. Authorize with explicit permissions + active membership; scope rows in the query.
3. Identifiers from the browser (case id, office, level, user) are inputs to verify, never authority.
4. Another party's record returns **404**, so existence is not disclosed.
5. Government roles are bound to a jurisdiction in both database and guard. Woreda sees its cases; Sub-City sees
   cases passed up by its Woredas; Bureau sees all.
6. Account creation for staff/business is administrative; public payloads cannot select a privileged role.

## Privacy rules

- Business view = allow-listed fields + alias `Consumer 00123`. Test it.
- Tips: do not collect IP-derived location into the tip record; do not log tip bodies.
- Minimize: collect only fields the prototype shows. Retention periods are an open question.
- Seeds, fixtures, screenshots and docs use **fictional** people only (the demo-data cast).
- Logs and audit entries hold ids and actions, not message bodies, phone numbers or emails.
- Consent and privacy notice shown at registration (version recorded) once the notice text is approved.

## Application security

- HTTP-only, SameSite session cookies; origin checks on mutating requests; CSRF considered with cookies.
- Security headers on all responses (`nosniff`, frame deny, referrer policy, permissions policy, COOP/CORP);
  CSP with nonces and HSTS when served over HTTPS (carry over the AddisB2B setup).
- Rate limits on sign-in, registration, tracking by reference + phone, tip submission and file upload.
- Upload checks: allow-listed types, magic-byte check, size cap, re-encode images, random storage names,
  stored outside web root, malware scan hook planned.
- Tracking without sign-in (reference + phone) must not allow enumeration: uniform responses, throttling.
- Append-only audit and case history (database triggers); who did what, when, from which office.
- Dependencies pinned, `npm audit` clean of high/critical before handoff.

## Secrets and environments

`.env` is never committed; examples use placeholders. Separate secrets per environment. Never reuse AddisB2B or
Hemin credentials, databases or uploads. Do not paste secrets into issues, PRs, chat or screenshots.

## Reporting

Vulnerabilities go through [SECURITY.md](../SECURITY.md), not public issues.
