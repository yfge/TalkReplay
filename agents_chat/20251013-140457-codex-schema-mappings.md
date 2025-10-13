## Summary

- Added JSON Schemas for Codex tool-related events (command_execution, file_change, mcp_tool_call, web_search, function_call, function_call_output).
- Introduced declarative mapping definitions so future schema-driven normalisation can project payloads into ChatMessage fields.

Referenced files: src/schema/providers/codex/schemas/\*.json, src/schema/providers/codex/mappings.ts, src/schema/types.ts

## Code Highlights

```json
// example schema snippet
{
  "$id": "https://talkreplay.dev/schema/codex/item.command_execution.completed",
  "type": "object",
  "properties": {
    "type": { "const": "item.completed" },
    "item": { "properties": { "type": { "const": "command_execution" } } }
  }
}
```

```ts
// mapping snippet
{
  provider: "codex",
  id: "codex/item.command_execution.started",
  kind: "tool-call",
  schemaId: commandExecutionStartedSchema.$id,
  rules: [
    { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
    { source: "/item/command", target: "metadata.toolCall.toolType", transform: "command-tool-type" },
    ...
  ],
}
```

## Self-Tests

- `pnpm lint`
- `pnpm exec vitest run`
- `pnpm format`

## Risks / Follow-ups

- Transform names referenced in mappings (`command-tool-type`, `collect-file-change-paths`, etc.) still need implementations in the upcoming normaliser step.
- Schemas currently focus on tool events; reasoning/message events can be added later once the normaliser is in place.
