## Summary

- Updated the Cursor loader to capture prompt/assistant text when Cursor stores it in `aiService.generations`, falling back to code snapshots when needed.
- User messages now reflect the resolved prompt text and assistant messages include both textual replies and code previews with source metadata.

## Code Highlights

```text
src/lib/providers/cursor.ts:18
```

## Self-Tests

- `pnpm lint`
- `pnpm test`
- `pnpm format`

## Risks & Follow-Up

- The extraction heuristics rely on Cursor’s current JSON schema; we need to monitor schema changes and consider logging unknown layouts for diagnostics.
