## Summary

Map Codex exec JSON `item.*` events for `command_execution` into unified tool call/result messages.

- `item.started` → `tool-call` with `toolType` inferred from the command (bash vs generic).
- `item.completed` → `tool-result` with `toolResult.exitCode` and aggregated output.

## Code Highlights

- Updated: src/lib/providers/codex.ts – added handling for `item.started`/`item.completed` with `type: command_execution`.

```ts
if (entry.type.startsWith("item.")) {
  const item = (entry.payload as any).item;
  if (item?.type === "command_execution") {
    // ... push tool-call on started, tool-result on completed
  }
}
```

## Self-Tests

```bash
pnpm lint
pnpm test
```

Expected: OK
Actual: OK (lint warnings in UI file pre-existing)

## Risks & Follow-ups

- Future: support `file_change` and `mcp_tool_call` items with richer UI affordances.
