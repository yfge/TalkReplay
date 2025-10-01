# Incremental Import & Error Banner

## Summary

- Added persistent tracking of provider file signatures so refresh only parses changed Claude/Codex logs.
- Reused cached sessions when files are unchanged and surfaced import errors in a dismissible banner.

## Code Highlights

- `src/store/import-store.ts:1` stores file signature cache and recent import errors.
- `src/lib/providers/claude.ts:1` and `src/lib/providers/codex.ts:1` return sessions/signatures/errors, skipping unchanged files.
- `src/lib/session-loader.ts:1` orchestrates provider loads with default path detection and fallback filtering.
- `src/App.tsx:1` integrates the import store, displays the error banner, and wires refresh callbacks.
- `tasks.md:17` marks the incremental import + error surfacing task complete.

## Self-Tests

- `pnpm lint`
- `pnpm test`

## Risks & Follow-Up

- File deletions currently leave stale signatures; future work should prune missing entries and surface per-provider success toasts.
