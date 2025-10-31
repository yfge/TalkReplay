## Summary

- Surfaced Cursor sessions in the UI by adding provider labels/badges so the sidebar filters and list view render the new source correctly.

## Code Highlights

```text
src/components/sidebar/chat-sidebar.tsx:13
src/lib/provider-info.ts:5
```

## Self-Tests

- `pnpm lint`
- `pnpm test`
- `pnpm format`

## Risks & Follow-Up

- Cursor sessions currently show synthesized responses; UI messaging might need refinement once real assistant transcripts are available.
