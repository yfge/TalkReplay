## Summary

- Split Codex `response_item.message` events into schema-driven chunks (input/output text, tool use, tool result) so schema mode matches the legacy adapter.
- Extended the Codex provider to build per-item payloads, attach usage metadata once per response, and fall back cleanly when a chunk is unsupported.
- Documented the new coverage and checked off the topic-selection task in `tasks.md`.

## Code Highlights

```ts
// src/lib/providers/codex.ts
const schemaResult = buildCodexSchemaPayloads(entry, index);
...
if (usage && !usageAttached) {
  metadata.tokens = { prompt: usage.input_tokens, ... };
}
```

- Added JSON Schemas and mappings for `codex/response_item.message.{input_text,output_text,tool_use,tool_result}` with Vitest coverage in `src/schema/providers/codex/mappings.test.ts`.

## Self-Tests

- `pnpm test src/schema/providers/codex/mappings.test.ts`
- `pnpm test src/lib/providers/codex.test.ts`
- `pnpm lint`

## Risks / Blockers / Follow-ups

- Unrecognised Codex message content types still fall back to the legacy parser; capture new variants before flipping schema mode by default.
- Revisit benchmarking once we settle on a lightweight approach for large-log profiling.
- Monitor token metadata propagation when response items contain mixed content to ensure schema mode mirrors legacy behaviour.
