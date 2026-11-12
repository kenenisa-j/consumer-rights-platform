# Coding standards

Applies to both developers and all agents.

## Size caps (enforced by `npm run validate`)

| Kind | Max lines |
| --- | --- |
| Source and documentation files | 399 |
| Controllers (`*controller.ts`) | 250 |
| Components (`*.tsx`) | 350 |
| Tests | 600 |

Split by responsibility before you hit the cap; do not compress code to fit.

## TypeScript

- `strict: true`; no `any` without a one-line reason; prefer `unknown` + narrowing.
- Types shared by both sides come from `@consumer-rights/contracts`; do not redeclare them.
- Named exports; one main concept per file; file names `kebab-case.ts`, React components `PascalCase.tsx`.
- Pure functions for rules (status transitions, scoping, formatting) so they are unit-testable.
- No dead code, commented-out code or `TODO` without an issue/tracker reference.

## Naming

Domain words from [domain-model.md](domain-model.md) only: *consumer*, *business*, *complaint/case*,
*tip*, *level*, *holding office*, *handover note*, *offer*, *settlement*. The user-facing word for a
merchant is **business**. Enum values are `snake_case` strings; database columns `snake_case` via Prisma maps.

## Errors and validation

- Validate at every boundary: DTO on the server, inline form validation in the UI (the server is the authority).
- Throw typed HTTP exceptions with stable error codes; messages are safe to show to the user.
- Never swallow errors. Log once at the boundary with context, show a recoverable message.
- Treat all input as hostile: parse, bound lengths, allow-list file types, escape on output.

## Comments and docs

Comment *why*, not *what*. Public helpers and contract types get a one-line description. Update docs
in the same change as behaviour.

## Internationalization

No user-facing literal in components or services. Keys in the label catalogue with English and Amharic.
Dates and numbers through one helper (Gregorian and Ethiopian calendar support planned).

## Accessibility

Native elements first; labelled controls; focus management in dialogs; status by text; contrast AA.

## Performance and reliability

Paginate every list; bound every query; request timeouts and cancellation in the client; idempotent
mutations where retries can happen; no N+1 queries in list endpoints.

## Security hygiene

No secrets in code, tests or logs. No `eval`, no unsanitized HTML. Details:
[security-and-privacy.md](security-and-privacy.md).

## Formatting

`.editorconfig` governs indentation (2 spaces), UTF-8, LF. Keep imports ordered: node, packages,
`@consumer-rights/*`, local. A formatter/linter (Prettier, ESLint) will be added in the scaffold step with
the same config for both apps; until then follow the existing style in the file you edit.
