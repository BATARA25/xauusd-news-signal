# Contributing to NewsXLeak

## Workflow

1. Create a feature branch from `main`.
2. Make one focused change at a time.
3. Run `npm run typecheck`.
4. Run `npm run build`.
5. Open a pull request with a clear description.

## Pull requests

Include:

- What changed
- Why it changed
- How it was tested
- Environment/configuration changes
- Screenshots for meaningful UI changes

Avoid mixing unrelated refactors with product changes.

## Standards

- Use TypeScript.
- Prefer small pure functions for signal calculations.
- Keep API credentials server-side.
- Use descriptive names.
- Avoid duplicated business logic.
- Do not hard-code provider secrets.
- Do not claim signal accuracy without supporting evaluation data.

## Commit style

```text
feat: add NFP release validation
fix: prevent duplicate signal alerts
refactor: isolate macro classifier
docs: update deployment guide
```
