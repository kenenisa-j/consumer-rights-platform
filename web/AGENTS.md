# Frontend ownership (`web/`)

Status: **not scaffolded yet.** Scaffold follows the approved frontend plan
([documentation/frontend-guide.md](../documentation/frontend-guide.md)).

- Next.js App Router, React 19, TypeScript strict, Bootstrap 5.3 base with the prototype's tokens.
- Build each screen from its prototype page (`prototype/<portal>/<page>.html`). Match layout, wording,
  fields, states and the Amharic line under each label. Do not redesign without approval.
- One route per real screen. The prototype's `case-00123-*.html` variants are **states of one page**,
  not separate routes.
- Call the backend only through `src/lib/api.ts` (browser) or `src/lib/server-api.ts` (server
  components). The catch-all API route only forwards requests; it holds no business rules.
- Never import Prisma, database config, password hashing or anything from `backend/`.
- No session token in `localStorage`. The session is an HTTP-only cookie.
- Every form: labels, `required`/`maxlength`/`accept`, inline errors, disabled-while-saving, retry.
  Every request: timeout and cancellation. Every list: loading, empty and error states.
- Keyboard focus visible, status shown by text and not colour alone, WCAG AA contrast.
- Components < 350 lines. No `<script>`-style inline hacks, no `dangerouslySetInnerHTML` without review.
- Prove visible changes in a real browser at 360, 768 and 1280 px (no sideways scroll).
