## Summary

- Parsed Cursor `workbench.panel.aichat.*.chatdata` payloads to recover user/assistant transcripts, pairing them with `aiService.generations` and falling back to history snapshots when needed.
- Added robust message extraction utilities (role detection, content parsing) and wired the loader to prefer chatdata text while keeping code previews as supplementary context.
- Updated `tasks.md` to mark the transcript parsing item complete.

## Code Highlights

```text
src/lib/providers/cursor.ts:1
tasks.md:75
```

## Self-Tests

- `pnpm lint`
- `pnpm test`
- `pnpm format`

## Risks & Follow-Up

- Chat data schema may evolve; logged sources per message to ease debugging if roles/content shifts.
