# Agent guide

For every AI agent and human starting work here. Shared by both developers so both get the same
behaviour. Short rules are in [AGENTS.md](../AGENTS.md); this is the working protocol.

## 1. Read before writing code

| Always | When |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | Every session |
| [work-tracker.md](work-tracker.md) (top entries) | Every session: what is done, what is active, who owns it |
| The `AGENTS.md` of the folder you edit | Touching `web/`, `backend/`, `lib/`, `scripts/` |
| [domain-model.md](domain-model.md) | Any rule about cases, levels, visibility, statuses |
| [prototype-guide.md](prototype-guide.md) + the prototype pages | Any UI or user-visible behaviour |
| [security-and-privacy.md](security-and-privacy.md) | Anything touching identity, evidence, messages, tips, auth |
| [open-questions.md](open-questions.md) | Before choosing a rule the SRS leaves open |
| [coding-standards.md](coding-standards.md) | Before your first change in a session |
| [frontend-guide.md](frontend-guide.md) / [backend-guide.md](backend-guide.md) | The matching side |

## 2. Working protocol

1. **Restate the task** in one or two lines, naming the portal, role and level it affects.
2. **Find the source of truth.** UI: the prototype page. Rules: `domain-model.md`, then
   `prototype/PLAN.md` Revision 3, then `prototype/docs/demo-data.md`. If they disagree, newer revision wins; if still unclear, ask.
3. **Plan small.** For anything beyond a small fix, fill the [feature spec](templates/feature-spec.md):
   pages, API, permissions, states, acceptance. Agree contract changes with the other developer first.
4. **Implement in vertical slices** (one working flow end to end) rather than many half-built screens.
5. **Verify for real**: `npm run check`, then the real browser at 360/768/1280 px. See
   [testing-and-verification.md](testing-and-verification.md).
6. **Record**: update `work-tracker.md` (what, evidence, known gaps) and any doc you made stale.
7. **Commit** the finished, verified slice locally with a clear message. Push only when asked.

## 3. Do not

- Invent requirements, categories, deadlines, laws or phone numbers. Mark unknowns as
  *to be confirmed* and add them to [open-questions.md](open-questions.md).
- Treat the prototype's hard-coded demo values as business rules (`8070`, 48-hour targets, category lists).
- Create one route per prototype file when the files are only states of one screen.
- Add dependencies casually. A new package needs a reason in the PR and an exact version pin.
- Weaken a permission, privacy or size rule to make a test pass or a deadline.
- Claim something works without running it. Say "not verified" when it was not.

## 4. Asking for help

Ask the developer when: a rule conflicts between sources, a decision is listed as open, an action is
hard to reverse (deleting data, rewriting history, changing shared contracts), or the prototype
cannot be implemented as drawn (for example a CSS-only trick with no sane equivalent).
State the options and your recommendation.

## 5. Handing work to the other developer

Leave the tracker entry complete: what was built, files/areas, API or contract assumptions, how to run
and verify, known gaps. If you changed `lib/contracts`, say so at the top of the PR.

## 6. Keeping this guidance alive

If you hit a mistake that better instructions would have prevented, fix the relevant doc in the same
PR. Keep `AGENTS.md` short: put detail in `documentation/`.
