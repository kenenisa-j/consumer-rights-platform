# Architecture

Status: **target architecture** (planned). Adapted from the AddisB2B foundation, which itself adapts Hemin ERP.
Nothing below is implemented until the work tracker says so.

## Application boundary

```text
Browser
  -> web/ Next.js (pages, rendering, same-origin HTTP transport)
    -> backend/ NestJS (authentication, permissions, case/tip/messaging/content modules)
      -> PostgreSQL 16 through Prisma 7 and PrismaPg

lib/contracts/ = shared names, enums and API types. No secrets, no runtime database access.
```

Each app has its own package and compiler config. Root workspaces share one lockfile and the Node
operations scripts. The backend has `src/lib` (auth, database, common, config) and `src/modules`
(domain features). The frontend uses one timed, cancellable API client in `src/lib`.

## Authentication and sessions

Better Auth owns credentials, cookies, sessions, password change and logout. Public auth signup is
disabled; consumer registration is a controlled endpoint creating a user in a transaction. Government and
business accounts are created by administrators or an operator command, never through a public payload.
Next.js renders protected pages on the server, forwarding the HTTP-only cookie to the backend (clean
redirects for signed-out users). NestJS rechecks every request independently. No token in `localStorage`.

## Authorization

Guard chain: throttling -> authentication -> permission policy.

- Authentication rechecks the persisted user status on every request.
- Permission checks resolve an **active membership**: user + portal + role + office level + jurisdiction
  (Woreda/Sub-City code) or business. A header may narrow access, never grant it.
- Queries restrict rows by that membership (`WHERE holding_office = ...`), not by browser parameters.
- Government membership requires a jurisdiction in both the database and the guard.

## Case lifecycle

One service owns case transitions: validate (`isValidClimb`, allowed status change) -> update with
version check -> append history row -> write audit event, **in one transaction**. History and audit
tables reject UPDATE/DELETE through database triggers. Notifications are created from the same event.

## HTTP transport

The web entrypoint overwrites forwarding metadata with the real TCP peer and signs client-address
metadata with `INTERNAL_PROXY_SECRET`; the backend accepts only fresh, correctly signed metadata, so a
browser cannot pick its rate-limit bucket. Mutating requests get origin checks. Responses use one
envelope (`ApiResponse`); errors never expose stacks. Suggested limits (carry over from AddisB2B):
sign-in 5/min/client, registration 5/min, other routes 100/min. Stores are in-process; shared storage is
required before running more than one instance.

## Files and evidence

Receipts, photos and documents are stored outside the web root, served only through authorized backend
endpoints, validated by type and size, with visibility flags (*officers only* / *shared with business*).

## Messaging

Conversations belong to a case (or are government-to-government). Messages and offers are append-only.
Real-time delivery is not required in v1: polling or refresh is acceptable; decide in the messaging spec.

## Relationship to AddisB2B

This portal is meant to become a module of AddisB2B but starts as an **independent repository** with its
own database and ports. Business records, accounts and the administrative structure (Sub-City/Woreda
codes) come from AddisB2B. Until the integration is decided
([ADR-0002](decisions/0002-relationship-to-addisb2b.md), [open questions](open-questions.md)) the
backend hides them behind adapter interfaces (`BusinessDirectory`, `OfficeDirectory`) backed by local tables
and seed data. Complaints about AddisB2B B2B order disputes stay **out of scope** (those are a separate
process).

## Operations and portability

Windows and Linux both supported. Setup, migrations, start and stop are Node scripts; launchers only
delegate. Local development database runs in Docker (`compose.yaml`, port 5546, loopback only). Ports differ
from AddisB2B so both can run on one machine.
