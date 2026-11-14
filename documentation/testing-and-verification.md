# Testing and verification

"Done" means verified, not written. Report real results and say what was not checked.

## Gate before handoff

```sh
npm run check        # validate + test + typecheck + build
npm audit            # no unresolved high/critical findings
```

Plus, for visible changes, a real browser at **360, 768 and 1280 px**.

## Test layers

| Layer | Tool | What it proves |
| --- | --- | --- |
| Contracts and pure rules | `node --test` (`tests/`) | Status/level rules, reference codes, aliasing, scoping helpers |
| Backend unit | `node --test` or the framework runner chosen at scaffold | Services, transitions, DTO validation |
| Backend integration | `node --test` against a **dedicated test database** | Auth, permissions, scoping, transactions, migrations |
| Browser | Real browser (manual or scripted) | The flow works, looks like the prototype, responsive |
| Security | Targeted integration tests | Refusals, enumeration, privacy projections |

Integration tests never touch a shared or production database. Use a disposable database
(`consumer_rights_test`), synthetic users, and fixtures that clean up after themselves. Suites that hit sign-in
limits run sequentially with a pause between them (carry over the AddisB2B practice).

## Browser check (public site)

`npm run test:browser` drives a real Chromium-based browser (Edge, Chrome or Chromium; set `BROWSER_PATH` if it is
not found) through the public site: the complaint wizard end to end, case actions and dialogs, tips, tracking, form
validation, every search and filter, messages, `?next` handling, console errors, and sideways scroll at 1280, 768 and
360 px with device emulation. It needs the site running first (`npm run build`, then `npm run start -w web`, or
`npm run dev -w web`). Set `SHOT_DIR=some/folder` to also save screenshots. It uses `scripts/browser/driver.mjs`
(Node's built-in WebSocket, no dependencies). Extend it when you add a screen; it does not replace the keyboard and
screen-reader pass below.

## Mandatory test cases for permissions

For each protected capability test at least: allowed role, wrong role, wrong portal, wrong office/jurisdiction,
signed-out, disabled user. For each business-facing response: assert consumer identity is absent. For each
consumer-facing response: assert internal notes are absent. For passing a case up: assert skipping a level and
moving down are rejected, and that history + audit rows are written.

## Browser verification checklist

- Matches the prototype page at 360, 768, 1280 px; no horizontal scroll; no clipped Amharic.
- Happy path, validation errors, server error, empty list, loading, permission refused (wrong role/office).
- Reload keeps state that should persist; back/forward behave; unsaved-changes prompt where applicable.
- Keyboard only: tab order, visible focus, dialog trap and Escape.
- English and Amharic.
- Console clean; network shows no failed or unexpected requests; no secrets in responses.
- Print layout for pages that have one.

Save sanitized evidence (screenshots with fictional data) under `documentation/evidence/` only when it adds
value, and reference it from the tracker entry. Do not commit large binaries casually.

## Prototype parity review

Before closing a screen, open the prototype page next to the build. Differences are either fixed or recorded
in the tracker as an approved deviation with the reason.

## Known limits to state

Local runs are not production proof: say which environment, data and browser were used. Third-party
integrations (SMS, Fayda, payments) stay unverified until tested with the provider.
