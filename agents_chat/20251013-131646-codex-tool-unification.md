## Summary

- Unified Codex tool handling with shared helpers for tool-call and tool-result; reduced branching for `command_execution`, `file_change`, `mcp_tool_call`, `function_call` output.
- Treated Codex fallback/"system"-like entries as generic tool results (`providerMessageType: system-as-tool`) so they render consistently in the ToolCallCard UI.

Referenced files: src/lib/providers/codex.ts

## Code Highlights

```ts
function makeToolCall({ id, name, args, toolType, ... }) { /* -> ChatMessage */ }
function makeToolResult({ callId, output, exitCode, durationMs, ... }) { /* ... */ }
```

```ts
// Example: command_execution
if (entry.type === "item.started") {
  messages.push(
    makeToolCall({
      id: itemId,
      name: "command_execution",
      args: { command },
      toolType,
    }),
  );
}
if (entry.type === "item.completed") {
  messages.push(
    makeToolResult({ callId: itemId, output: aggregated, exitCode }),
  );
}
```

```ts
// Default: treat fallback as tool-result instead of "system"
const callId =
  typeof payload.call_id === "string"
    ? payload.call_id
    : (payload.id ?? `sys-${index}`);
const output = payload.output ?? payload.content ?? payload.summary ?? payload;
messages.push(
  makeToolResult({ callId, output, providerMessageType: "system-as-tool" }),
);
```

## Self-Tests

- `pnpm lint` (fixed a no-unnecessary-type-assertion violation)
- `pnpm exec vitest run` (all tests green)
- `pnpm format`

## Risks / Follow-ups

- If Codex adds new `item.*` types, extend the helper calls rather than branching ad hoc.
- Consider mapping Codex `message` chunks with non-text types into tool calls as we add coverage.
