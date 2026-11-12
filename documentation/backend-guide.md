# Backend guide

Owner: the backend developer. Companion to [backend/AGENTS.md](../backend/AGENTS.md) and
[architecture.md](architecture.md). Status: planned.

## Layout

```text
backend/
  prisma/            schema.prisma + one .prisma file per area, migrations/
  src/
    main.ts          bootstrap: env check, pino, throttler, origin checks, health
    lib/
      auth/          Better Auth service, auth guard, permission guard, RequirePermission/Public
      database/      PrismaService, pool options
      common/        response envelope, exception filter, paging, decorators, id/reference generator
      config/        validated environment
    modules/
      identity/ offices/ complaints/ tips/ messaging/ content/ notifications/
      reports/ intake/ platform/ (settings, lookups, audit read)
```

One module = controller (thin), service (rules), DTOs, tests. Controllers only translate HTTP; business rules
live in services.

## Permissions

Every handler: `@Public()` or `@RequirePermission("complaints.read.own")`. Name permissions
`<module>.<action>[.<scope>]`. A role is a set of permissions; membership ties a user to portal, role, office
level, jurisdiction. `npm run validate` rejects controllers whose route and policy counts differ.

## Scoping (the most important rule)

Derive scope from the authenticated membership and apply it in the **query**:

| Role | Row filter |
| --- | --- |
| Consumer | `complaint.consumerId = me` |
| Business | `complaint.businessId = my business` and the business projection (alias only) |
| Woreda officer | `holdingLevel = woreda AND woredaCode = my jurisdiction` |
| Sub-City coordinator | `holdingLevel = subcity AND subcityCode = my jurisdiction` (plus read of passed-up history) |
| Bureau | all, filterable by holding office |

Write a helper per scope (`complaintScope(membership)`); do not repeat ad-hoc `where` clauses. Test the
helper with a wrong-office user.

## Business projection

Business-facing endpoints select from an explicit allow-list of fields (reference, category, what was bought,
amount, request, shared evidence, offers, public history). Consumer identity columns are never selected.
Add a test that fails if a business response contains `name`, `phone`, `email` or `address` of the consumer.

## Case transitions

Single service method `transition(caseId, action, actor, input)`:

1. Load with scope; check actor may perform `action` at the current level/status.
2. Validate the move (`isValidClimb` for passing up; allowed next status).
3. Update with `version` check (409 on conflict).
4. Insert `CaseHistory` row (status, level, actor, note, handover note) and `AuditEvent`.
5. Create notifications for consumer/business/next office.
All in one transaction. Internal notes live in their own table, never serialized to consumer/business DTOs.

## Data design rules

- Separate tables: users, consumers, businesses (from the directory adapter), offices (Woreda/Sub-City/Bureau
  tree with codes), memberships, roles/permissions, complaints, case history, internal notes, offers,
  conversations, messages, attachments, tips, tip follow-up codes, notifications, content (rights, laws, news),
  lookups (categories), settings, audit events.
- IDs: opaque primary keys; human reference (`CC-2026-00123`) is a separate unique column generated in a
  transaction-safe sequence per year.
- Index every access path (holding office, status, consumer, business, createdAt). Count at read time.
- Anonymous tips: no user foreign key; follow-up uses a random code stored hashed.
- Soft state, never delete case records; deletion only through documented retention jobs.

## API conventions

REST under `/api`, JSON envelope `{ ok, data | error }`, paging via `page`, `pageSize` (max 100), stable sorting,
ISO-8601 UTC timestamps, validation errors with per-field messages, 401/403/404/409/422/429 used consistently.
Do not leak existence: unauthorized access to another party's case is 404, not 403.

## Migrations

Generate, read, then apply. Never edit an applied migration. Explain data effects in the PR. History and audit
tables get UPDATE/DELETE-blocking triggers. Seeds are fictional and idempotent.

## Logging

pino, structured, request id. Never log message bodies, phone numbers, emails, tokens, tip contents or
evidence file names.
