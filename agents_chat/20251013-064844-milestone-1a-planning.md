## Summary

Add Milestone 1.A planning for log analysis and structured tool-call UI. Document observed Claude/Codex formats and outline schema and UI refactor steps.

## Code Highlights

- Updated tasks plan: tasks.md
- No runtime logic changed; this commit is planning-only.

```text
files:
- tasks.md
- agents_chat/<this-file>
```

## Self-Tests

- pnpm lint: should pass
- pnpm test: should pass
- pnpm build (smoke): should build successfully

Commands:

```bash
pnpm lint
pnpm test -- --runInBand
pnpm build
```

Expected: all green; no UI changes.

## Risks & Follow-ups

- Next commits will modify types and parsers; ensure incremental changes keep tests passing.
- Add sanitized fixtures for both providers before parser changes.
