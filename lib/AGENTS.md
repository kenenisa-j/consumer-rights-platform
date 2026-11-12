# Shared contracts (`lib/contracts`)

- Share portable API types, portal/role/status definitions and pure helpers only.
- No database clients, credentials, server configuration or framework imports.
- Change `index.js` and `index.d.ts` together; `tests/contracts.test.mjs` must still pass.
- This package is the **seam between the two developers**. Agree contract changes in the PR before
  either side builds against them, and keep changes small and additive.
- Keep wording out of here (labels belong to the label catalogue); keep keys stable once released.
