# Operations scripts (`scripts/`)

- Node scripts are the single implementation for Windows and Linux. `.bat`/`.sh` files, if added,
  only delegate to them.
- Never stop unrelated processes or reuse another project's database directory or ports.
- Keep generated configuration, credentials, logs and runtime state under ignored paths (`.runtime/`).
- Verify health before reporting that a service is ready.
- `validate.mjs` enforces repository rules; extend it when a new rule becomes mechanical.
