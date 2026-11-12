# Security policy

## Scope

This project is under development and has no published production support schedule or independently certified
release. Report issues against `main`, including the exact commit where possible. Covered: `web/`, `backend/`,
`lib/contracts/`, database migrations, operations scripts and deployment configuration. Assets: citizen identity
and complaint data, anonymous tips, evidence files, messages, office accounts and audit history.

## Threat model

Anonymous visitors and signed-in users control submitted fields, identifiers, query parameters and headers.
The frontend is not an authorization boundary. Officers and administrators are privileged but do not make
arbitrary input trustworthy. The database and signing secrets are trusted server dependencies.

Report reachable permission bypasses, cross-office or cross-business disclosure, exposure of consumer identity
to a business, exposure of internal notes, de-anonymisation of a tip, session compromise, enumeration of cases
or references, unsafe file handling and secret leakage. Explain prerequisites and impact.

## Report privately

Do not open public issues or pull requests with exploitable details. Use GitHub private vulnerability reporting
for this repository when enabled, or contact a repository owner through a private channel and ask for a secure
route. Include commit, endpoint, prerequisites, reproduction steps, expected and actual behavior, impact and a
minimal sanitized example. Test only accounts and environments you are authorized to use. Exclude real personal
records, passwords, tokens and connection strings.

No response-time guarantee or bounty program is currently published.

## Properties to preserve

See [security and privacy](documentation/security-and-privacy.md): server-side authentication and explicit
permissions; active membership and jurisdiction decide access; business views never contain consumer identity;
tips store no identity; internal notes stay internal; append-only history and audit; secrets stay out of version
control.
