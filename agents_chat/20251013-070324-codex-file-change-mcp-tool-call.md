## Summary

Extend Codex parser to support exec JSON `file_change` and `mcp_tool_call` items.

- file_change: `item.started` → tool-call with planned `changes`; `item.completed` → tool-result with `filesChanged` and derived `exitCode`.
- mcp_tool_call: `item.started` → tool-call (toolType `mcp`), `item.completed` → tool-result with status-derived `exitCode`.

## Code Highlights

- Updated: src/lib/providers/codex.ts – new branches under `item.*` handling

```ts
if (itemType === "file_change") {
  /* ... */
}
if (itemType === "mcp_tool_call") {
  /* ... */
}
```

## Self-Tests

```bash
pnpm lint
pnpm test
```

Expected: lint OK (UI warnings allowed); tests OK
Actual: OK

## Risks & Follow-ups

- TODO: add diffs into `toolResult.diff` when available; currently we only capture file paths.
- TODO: add sample fixtures to assert mapping via snapshots.
