# Feature spec: <name>

Owner (frontend / backend): ...   Status: draft | agreed | building | verified   Date: ...

## Goal

One paragraph: who can now do what, and why (portal, role, level).

## Sources

- Prototype pages: `prototype/<portal>/<page>.html` (list every state variant)
- Plan/domain rules: `PLAN.md` section ..., `domain-model.md` section ...
- Requirement IDs (CR-FR / NFR) if known:
- Open questions touched:

## Screens and states

| Screen | Route | States (loading, empty, error, success, refused) | Dialogs |
| --- | --- | --- | --- |

## Data and API

| Endpoint | Method | Permission | Scope rule | Request | Response |
| --- | --- | --- | --- | --- | --- |

Contract changes (`lib/contracts`):

## Rules

- Status/level transitions allowed here and who may trigger them:
- Visibility (consumer / business / each level), including what must NOT appear:
- Validation (fields, lengths, files):
- Notifications and history/audit entries created:
- Configurable values (not hard-coded):

## Acceptance criteria

- [ ] Observable criteria, including failure and permission-refused behavior
- [ ] Both languages; 360 / 768 / 1280 px
- [ ] Tests listed in `testing-and-verification.md` for permissions and privacy

## Out of scope / later phase

## Verification evidence

Commands run and results; browser widths checked; known gaps.
