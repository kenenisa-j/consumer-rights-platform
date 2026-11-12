# Consumer Rights Platform: agent rules

Read this file fully, then follow the **Before you write code** steps. Details live in
[documentation/](documentation/README.md); this file is the short version.

## What this is

The Unified Consumer Grievance and Rights Protection Portal for the Addis Ababa Bureau of Trade
and Market Development. A complaint **climbs one level at a time**: business → Woreda → Sub-City →
City Bureau (last level). Five sign-ins: Consumer, Business, Woreda, Sub-City, City Bureau.
It will become a module of AddisB2B ([ADR-0002](documentation/decisions/0002-relationship-to-addisb2b.md)).

## Before you write code (every task, every session)

1. Read [documentation/agent-guide.md](documentation/agent-guide.md) (the checklist) and the top entries of
   [documentation/work-tracker.md](documentation/work-tracker.md).
2. Read the folder's own `AGENTS.md` (`web/`, `backend/`, `lib/`, `scripts/`) for the area you touch.
3. For UI work: open the prototype pages for the feature (see [prototype guide](documentation/prototype-guide.md)).
   The prototype is the visual and behavioral source of truth. `prototype/PLAN.md` Revision 3 beats older text.
4. For domain rules (statuses, who sees what, the climb): [domain model](documentation/domain-model.md).
5. Check [open questions](documentation/open-questions.md). Do not silently decide something listed there.
6. Write or update the feature spec ([template](documentation/templates/feature-spec.md)) before large work.

## Hard rules

- `web/` owns presentation; `backend/` owns APIs, authorization, data access, business rules.
  `lib/contracts/` holds shared types and definitions only: never secrets or database clients.
- The browser is not a security boundary. Every protected API handler declares `Public` or
  `RequirePermission`; handlers with no policy must fail closed.
- Organization and jurisdiction scoping happens in **server queries**, from the authenticated
  membership. Never trust an office, level, user or business id sent by the browser.
- A business never sees a consumer's name, phone or address: only `Consumer 00123`. Anonymous tips
  store no identity. Internal notes never reach consumers or businesses. See
  [security and privacy](documentation/security-and-privacy.md).
- A complaint moves up exactly one level at a time, with a handover note, and is recorded in the
  append-only case history. Never skip a level or move down (`isValidClimb` in `lib/contracts`).
- Do not hard-code: the free call number (`FREE_CALL_NUMBER`), category lists, office lists, labels.
- Every user-facing string is bilingual (English + Amharic) through the label catalogue.
- Fictional data only. Never real citizens, businesses, phone numbers or credentials, in code, seeds,
  tests or screenshots. Never copy databases, uploads or secrets from the AddisB2B or Hemin repos.
- Size caps (enforced by `npm run validate`): source and docs < 400 lines, controllers < 250,
  components < 350, tests < 600.
- Windows and Linux must both work: operations go through Node scripts, never shell-only logic.
- Commit nothing from `.env`, `.runtime/`, dumps or uploads. Push only when asked.

## Definition of done

`npm run check` passes (validate, tests, typecheck, build); permissions reviewed; visible changes proven
in a real browser at **360, 768 and 1280 px** including error, empty and permission-refused states;
docs and `work-tracker.md` updated. Report real results; say what was not verified.

## Style for replies

Short and direct. Under 15 bullets. Say what changed, what was verified, what remains.
