# Frontend guide

Owner: the frontend developer. Companion to [web/AGENTS.md](../web/AGENTS.md) and
[prototype-guide.md](prototype-guide.md). Status: planned; scaffold follows the approved frontend plan.

## Principles

1. **Faithful first.** Same layout, fields, wording, order, states as the prototype page. Improvements
   are proposed to the team, not slipped in.
2. **Server rules, client comfort.** Validation in the browser is a convenience; the server decides.
3. **Every state is designed**: loading, empty, error, saving, success, permission refused, offline/timeout.
4. **Two looks, one system** (below), plus phone, tablet and desktop.

## Suggested structure (to confirm in the frontend plan)

```text
web/src/
  app/
    (public)/            consumer site: home, complaint wizard, tips, tracking, rights, laws, news, help
    (consumer)/          signed-in consumer: my cases, case, messages, notifications
    business/            business complaints + messages
    woreda/ subcity/ bureau/   government workspaces (shared workspace shell)
    api/[...path]/       transport-only proxy to the backend
    @modal/              intercepting routes for dialogs if used (AddisB2B pattern)
  components/
    ui/                  buttons, fields, badges, tables, timeline, stepper, alerts (from components.css)
    layout/              PublicShell, WorkspaceShell (rail + top bar), Ribbon-free header/footer
    case/ messaging/ tips/ admin/   feature components
  lib/
    api.ts server-api.ts   cancellable, timed clients; consistent errors
    i18n/                  label catalogue en + am, helpers
    use-unsaved-changes.tsx, use-action.ts   ported patterns
```

## Two looks (from the prototype)

| Look | Used by | Colours (tokens in `prototype/assets/css/tokens.css`) |
| --- | --- | --- |
| Public | Consumer pages | forest green `#123d31`, orange `#d76512`, white cards |
| Workspace | Business, Woreda, Sub-City, City Bureau | navy rail `#0c1e32`, navy `#0e2a47`, orange `#e0640f` current item, white top bar |

Port tokens to CSS custom properties once (global stylesheet), never hard-code hex values in components.
State colours come as text + tinted background pairs (`--ok/--ok-bg`, `--warn`, `--bad`, `--info`, `--grey`);
statuses are always shown with **text**, never colour alone. Spacing scale `--s1..--s8`, radius 10/6.

## Prototype pattern to React

| CSS-only pattern | React/Next equivalent |
| --- | --- |
| Radio-driven tabs (`:checked ~ .panel`) | Accessible tabs; keep the active tab in the URL (`?tab=`) when it should be shareable |
| `:target` dialogs | Modal component (focus trap, Escape, return focus); URL state for the ones officers deep-link |
| Checkbox mobile menu | State-driven drawer, closes on navigation |
| `<details>` FAQs/articles | Keep native `<details>` |
| `:has()` list filters | Server-side filtering through query params; filter bar syncs with URL |
| `<form action=next.html>` steps | Wizard route with per-step validation and a persisted draft; submit once at the end |
| CSS bars / conic donuts | Small presentational components or CSS; no chart library unless an ADR says so |
| Inline SVG icons | Inline SVG via `components/ui/Icon.tsx` (offline) |
| `@media print` letters/reports | Keep `print.css` rules; print route per document |

## Bilingual interface

English label with the Amharic line beneath (`<span class="am" lang="am">`), as in the prototype; one fully
Amharic page proves Amharic-first works (NFR-008). All strings come from the catalogue keyed by id, never
inline. Mark Amharic text with `lang="am"`. Test with long Amharic strings (no clipping at 360 px). A
language selector and cookie-based preference are planned (AddisB2B has the pattern).

## Forms and data

- Use real HTML validation attributes (`required`, `maxlength`, `accept`, `pattern`) plus inline messages.
- File uploads show allowed types and size before choosing; progress and failure per file.
- Disable submit while saving; make submits idempotent where a double click is harmful.
- Warn on leaving with unsaved input (`use-unsaved-changes` pattern).
- Keep Ethiopian calendar/date formatting behind one helper; do not scatter `toLocaleDateString`.

## Accessibility and responsiveness

Skip link, one `<h1>` per page, labelled fields, visible focus, keyboard-operable dialogs and menus, WCAG AA
contrast, status text. Check 360, 768 and 1280 px; no horizontal scroll at any of them.

## Definition of done for a screen

Matches prototype at three widths; all states handled; permission-refused view correct for a wrong role;
both languages; keyboard pass; no console errors; `npm run check` green; tracker row updated with evidence.
