# Documentation

Start with [agent-guide.md](agent-guide.md). It tells you (and your agent) what to read before coding.

| Document | Purpose |
| --- | --- |
| [Agent guide](agent-guide.md) | Read-first checklist, working protocol, how to hand work over |
| [Domain model](domain-model.md) | Actors, the four-level climb, statuses, who sees what, reference codes |
| [Prototype guide](prototype-guide.md) | How to read the prototype, page-to-feature map, source-of-truth order |
| [Architecture](architecture.md) | Application boundary, authentication, authorization, transport, AddisB2B relationship |
| [Tech stack](tech-stack.md) | Pinned versions and why each technology is used |
| [Coding standards](coding-standards.md) | Naming, size caps, errors, validation, logging, i18n, accessibility |
| [Frontend guide](frontend-guide.md) | Turning prototype pages into Next.js screens |
| [Backend guide](backend-guide.md) | Module layout, permissions, scoping, transitions, audit, migrations |
| [Security and privacy](security-and-privacy.md) | Non-negotiable data and access rules |
| [Testing and verification](testing-and-verification.md) | What must be tested and proven before handoff |
| [Git workflow](git-workflow.md) | Branches, commits, PRs, and working as two developers |
| [Environment](environment.md) | Every `.env` setting |
| [Open questions](open-questions.md) | Undecided items from the SRS; do not decide silently |
| [Work tracker](work-tracker.md) | Completed work and active objectives |
| [Decisions (ADRs)](decisions/README.md) | Why the architecture is the way it is |
| [Feature spec template](templates/feature-spec.md) | Fill this in before large features |

## Conventions

- Keep documents below 400 lines, use relative links and sanitized (fictional) examples.
- State clearly whether a capability is **implemented**, **tested** or **planned**.
- The prototype in `prototype/` and the SRS are planning inputs; they do not by themselves prove a
  feature is built or accepted.
- `npm run validate` checks size caps and that relative links resolve.
