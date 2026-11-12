# ADR-0003: Bootstrap 5.3 base with the prototype's tokens

- Status: Proposed (decide during the frontend plan)
- Date: 2026-11-12
- Deciders: _pending_

## Context

AddisB2B uses Bootstrap 5.3 for the app shell. The prototype has its own hand-written CSS (tokens, components,
patterns, public/office looks) that defines the intended appearance.

## Decision (proposed)

Keep Bootstrap as the structural base (grid, utilities, accessible components) for stack parity, and load the
prototype's design tokens as CSS custom properties that override Bootstrap variables. Port prototype components
(buttons, badges, timeline, stepper, tables, alerts) into `web/src/components/ui` styled to match the prototype
pixel-for-pixel. Use the two prototype looks (public, workspace) as two layout shells.

## Consequences

- Faster, accessible foundations; closer to AddisB2B so later merging is easier.
- Risk of Bootstrap defaults leaking into visuals; mitigate with a parity review per screen.

## Alternatives considered

- Port the prototype CSS only (no Bootstrap): exact match, but we rebuild accessibility and layout utilities.
- Tailwind or CSS-in-JS: new tooling, no reuse from AddisB2B.
