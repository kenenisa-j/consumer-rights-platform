# Environment settings

Local configuration lives in a private root `.env` (never committed, excluded from Docker contexts).
`.env.example` is the template. Replace every `REPLACE_*` value with a random one; generate secrets with
`node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.

| Setting | Purpose |
| --- | --- |
| `PUBLIC_URL`, `WEB_PORT`, `WEB_HOST` | Where the web app listens and how it is addressed |
| `API_PORT`, `API_HOST`, `API_INTERNAL_URL` | Backend listener and the URL the web server uses to reach it |
| `DB_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL` | PostgreSQL 16 (Docker `db` service on loopback 5546) |
| `BETTER_AUTH_SECRET` | Session signing, 32+ random characters |
| `INTERNAL_PROXY_SECRET` | Signs client-address metadata between web and backend; different from the auth secret |
| `FREE_CALL_NUMBER` | Toll-free number shown to consumers. `8070` is a **placeholder** until the Bureau confirms |
| `DEFAULT_LOCALE` | `en` or `am` |
| `UPLOAD_DIRECTORY` | Evidence storage (default `.runtime/uploads`) |
| `SMTP_*` | Email placeholders; no delivery yet. Leave empty locally |
| `BOOTSTRAP_ADMIN_*` | First-run administrator, used once |
| `DEV_OPEN_WORKSPACES` | Development only. Never on a shared installation |

## Ports

| Service | This repo | AddisB2B (do not clash) |
| --- | --- | --- |
| Web | 3300 | 3100 / 3200 |
| API | 4300 | 4100 / 4200 |
| PostgreSQL | 5546 | 5544 / 5545 |

## Rules

- Product values that officials may change (free call number, categories, targets) are settings or
  database rows, read at runtime, not constants in code.
- Production requires HTTPS origins, independently generated secrets, private database access, tested backups
  and a reverse-proxy trust policy (see [architecture.md](architecture.md)).
- Do not paste real values into docs, issues, PRs or chat.
