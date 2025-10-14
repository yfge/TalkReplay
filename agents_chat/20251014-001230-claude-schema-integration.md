## Summary

- Added Claude JSON Schema mappings so `tool_use`, `tool_result`, and text chunks pass through the normaliser when schema mode is enabled.
- Updated both Claude and Codex providers to register schemas lazily and prefer the Ajv pipeline before falling back to legacy parsing.
- Documented the new coverage in `docs/data-sources.md` and marked related tasks as complete.

## Code Highlights

```ts
// src/lib/providers/claude.ts
if (process.env.NEXT_PUBLIC_SCHEMA_NORMALISER === "1") {
  ensureClaudeSchemasRegistered();
  const schemaPayloads = buildClaudeSchemaPayloads({ entry, message, timestamp, baseId, defaultRole });
  ...
  normalisedMessages.forEach((normalisedMessage) => {
    const metadata = attachUsage({
      ...baseMetadata,
      ...(normalisedMessage.metadata ?? {}),
      raw: entry,
    });
    messages.push({ ...normalisedMessage, metadata });
  });
  return;
}
```

```ts
// src/schema/providers/claude/mappings.ts
export const claudeMappings: SchemaMapping[] = [
  {
    provider: "claude",
    id: "claude/message.content.tool_result",
    kind: "tool-result",
    schemaId: messageContentToolResultSchema.$id,
    rules: [
      {
        source: "/contentItem/tool_use_id",
        target: "metadata.toolResult.callId",
      },
      { source: "/toolUseResult/stdout", target: "metadata.toolResult.stdout" },
      { source: "/contentString", target: "content" },
    ],
  },
];
```

## Self-Tests

- `pnpm test src/schema/providers/claude/mappings.test.ts` → **passed** (5 tests).
- `pnpm test src/schema/providers/codex/mappings.test.ts` → **passed** (6 tests).

## Risks / Blockers / Follow-ups

- Remaining Claude content variants (e.g., rich media) still fall back to legacy parsing; add schemas once examples surface.
- Need end-to-end validation ensuring UI renders schema-derived Claude sessions identically to legacy mode.
