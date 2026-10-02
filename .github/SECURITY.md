# Security Policy

## Reporting a vulnerability

Do not open a public issue for a suspected security vulnerability.

Use GitHub private vulnerability reporting when enabled, or contact the repository owner through a verified GitHub contact channel.

Include:

- Clear description
- Affected component/file
- Reproduction steps
- Potential impact
- Suggested mitigation, if known

## Secrets

Never commit API keys, access tokens, database credentials, private deployment credentials, or webhook secrets.

If a secret is exposed, revoke or rotate it immediately. Removing it from the latest commit does not make an exposed secret safe.
