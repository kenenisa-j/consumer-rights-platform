# ADR-0002: Start independent; integrate with AddisB2B behind adapters

- Status: Proposed (confirm with the AddisB2B owners; see [open questions](../open-questions.md) 11-12)
- Date: 2026-11-12
- Deciders: _pending_

## Context

The plan says this portal "becomes a new module of AddisB2B". Complaints refer to registered businesses,
accounts, and the Sub-City/Woreda structure that AddisB2B owns. We cannot depend on a running AddisB2B yet, and
must not copy its data or credentials.

## Decision

Build as an independent repository with its own database, ports and accounts. Isolate everything that comes from
AddisB2B behind interfaces in the backend: `BusinessDirectory` (find a registered business),
`OfficeDirectory` (Sub-City/Woreda codes), and `IdentityProvider` (account linking). Back them with local tables
and fictional seed data now. Replace the implementations when the integration is agreed.

## Consequences

- Both developers can progress without the other system.
- A migration or API integration is needed later; the adapters bound the blast radius.
- Complaint reference prefixes `CC-`/`TIP-` avoid collision with AddisB2B `CMP-` reports.

## Alternatives considered

- Build inside the AddisB2B repo now: blocks on access and coordination, risks its stability.
- Duplicate AddisB2B's registry and structure permanently: two truths for businesses and offices.
