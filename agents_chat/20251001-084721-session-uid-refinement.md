## Summary

- Stopped merging multiple transcripts that share the same provider session id by preserving each file as its own conversation in the store.
- Made Claude/Codex adapters use the source file path as the stable conversation id while stashing the provider session id in metadata.
- Restored simple session ordering in the Zustand store (sorted by `startedAt`) so the chat list shows discrete conversations and keeps starring intact.

## Code Highlights

- `src/lib/providers/claude.ts`, `src/lib/providers/codex.ts`: session `id` now equals `sourceFile`, with the original provider id moved into `metadata.extra.sessionId`.
- `src/store/chat-store.ts`: removed dedupe/merge logic; `setSessions` just sorts incoming conversations and prunes missing stars.

## Self-Tests

- `pnpm lint`
- `pnpm test`
- `pnpm format`

## Risks / Follow-ups

- File paths are absolute; cross-platform portability may need path normalisation before exposing ids in deep links.
