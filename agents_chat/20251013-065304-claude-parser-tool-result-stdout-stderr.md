## Summary

Enhance Claude parser to enrich tool call/result metadata:

- Infer `toolCall.toolType` from `tool_use.name` (e.g., `Bash` → `bash`).
- When available, attach `toolResult.stdout`/`stderr` from `toolUseResult` to unify with Codex.

## Code Highlights

- Updated: src/lib/providers/claude.ts – `tool_use` and `tool_result` mapping

```ts
if (itemType === "tool_use") {
  toolCall: { id: tool.id, name: tool.name, arguments: tool.input, toolType: tool.name === 'Bash' ? 'bash' : tool.name }
}
if (itemType === "tool_result") {
  toolResult: { callId: result.tool_use_id, output: result.content ?? entry.toolUseResult ?? null, stdout: entry.toolUseResult?.stdout, stderr: entry.toolUseResult?.stderr }
}
```

## Self-Tests

Commands:

```bash
pnpm lint
pnpm test
```

Expected: Lint OK, tests pass
Actual: Lint OK (warnings), tests pass

## Risks & Follow-ups

- Claude logs often omit exit codes; we only attach available stdout/stderr.
- Consider mapping images/files in `tool_result` to `attachments` later.
