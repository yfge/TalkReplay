# Provider Default Path Detection

## Summary

- Enhanced the session loader to auto-detect Claude and Codex default directories when explicit paths are not configured.
- Keeps browser fallbacks limited to supported providers while letting Node refresh scan the real `~/.claude/projects` and `~/.codex/sessions` folders.

## Code Highlights

- `src/lib/session-loader.ts:6` now resolves default paths using `$HOME/.claude/projects` and `$HOME/.codex/sessions` before invoking adapters.

## Self-Tests

- `pnpm lint`
- `pnpm test`

## Risks & Follow-Up

- On Windows we may need additional default guesses (e.g., `%USERPROFILE%\.claude`). Future work should expand the guess list and surface errors if directories are missing.
