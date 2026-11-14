# ADR-0003: Port the prototype CSS verbatim; no Bootstrap

- Status: Accepted (changes the earlier proposal of Bootstrap + tokens)
- Date: 2026-11-12
- Deciders: frontend developer

## Context

The brief for the frontend is to implement the prototype **exactly**. The prototype is ~60 KB of hand-written
CSS (`tokens`, `base`, `components`, `patterns`, `public`, `office`, `merchant`, `print`) with its own resets,
class names (`.btn`, `.card`, `.modal`, `.tabs`) and CSS-only interaction patterns. Bootstrap's reset and
component classes overlap and would fight it, while adding nothing the prototype classes do not already supply.

## Decision

Copy the prototype stylesheets unchanged into `web/src/styles/` and use the prototype's class names in React
components. Do not install Bootstrap. Public pages load `public.css`; the workspace portals will load
`office.css` (and `merchant.css` for the business desk) from their own layouts. Changes to a stylesheet are made
here and recorded; the prototype folder stays untouched.

CSS-only patterns that are already accessible and work in React (`:target` dialogs, radio tabs and role bar,
`<details>` accordions, checkbox menu) are kept as-is for fidelity. Replace one with a component only when a
real requirement needs it (focus trap, deep link state, validation), and verify against the prototype.

## Consequences

- Visual parity is direct, and the screenshots comparison is meaningful.
- We own the CSS: no framework upgrades, but also no free utilities or components. Add components under
  `web/src/components/ui` using the existing classes.
- Diverges from AddisB2B's Bootstrap use; porting AddisB2B widgets later needs restyling.
- `:target` dialogs do not trap focus. Revisit during the accessibility pass.

## Alternatives considered

- Bootstrap base with prototype tokens (the earlier proposal): more rebuilding and visual drift for no gain.
- Tailwind or CSS-in-JS: new tooling and a rewrite of every style.
