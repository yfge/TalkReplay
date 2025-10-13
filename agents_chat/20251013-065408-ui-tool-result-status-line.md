## Summary

UI enhancement: surface tool execution status inline. For `tool-result` messages, display `exitCode` (as success/exit N) and `durationMs` in the metadata line to make structured results more scannable.

## Code Highlights

- Updated: src/components/chats/chat-detail.tsx – metadata line shows status and duration
- Tasks progress: tasks.md A4

```tsx
const exitCode = message.metadata?.toolResult?.exitCode;
const durationMs = message.metadata?.toolResult?.durationMs;
const statusLabel =
  message.kind === "tool-result" && typeof exitCode === "number"
    ? exitCode === 0
      ? "success"
      : `exit ${exitCode}`
    : null;
const metadataLine = [
  /* ... */
  statusLabel,
  typeof durationMs === "number" ? `${Math.round(durationMs)} ms` : null,
].filter(Boolean);
```

## Self-Tests

- Visual: Verify metadata line shows for Codex `function_call_output` with `exitCode`/`durationMs`.
- Unit: existing tests unaffected.
- Lint/tests:

```bash
pnpm lint
pnpm test
```

Expected: OK (warnings allowed), tests pass.

## Risks & Follow-ups

- Next: group `tool-call`+`tool-result` into one collapsible card; add stdout/stderr tabs.
