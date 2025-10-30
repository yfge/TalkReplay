## Summary

- Added Cursor schema mapping + resolver so chat transcripts flow through the normaliser pipeline when `NEXT_PUBLIC_SCHEMA_NORMALISER=1`.
- Refactored the Cursor provider to build message blueprints shared by schema + fallback paths, preserving attachments and metadata.
- Extended tests (schema + provider) to exercise the normalised chat flow and ensure attachments remain intact; updated `tasks.md` accordingly.

## Code Highlights

```text
src/schema/providers/cursor/schemas/chat-message.schema.json
src/schema/providers/cursor/mappings.ts
src/schema/providers/cursor/mappings.test.ts
src/lib/providers/cursor.ts
src/lib/providers/cursor.test.ts
tasks.md
```

## Self-Tests

- `pnpm test`

## Risks & Follow-ups

- Need real Cursor fixtures containing multi-message threads to validate schema resilience beyond the synthetic sample root.
- Monitor future Cursor schema changes (new message types/tool actions) and expand mappings when surfaced.
