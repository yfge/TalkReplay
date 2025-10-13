## Summary

Enhance Codex parser to extract structured fields from `function_call_output` events, mapping metadata to unified schema:

- Derive `toolCall.toolType` from function call `name` (e.g., `shell` → `bash`, `apply_patch` → `apply_patch`).
- Parse `output` JSON for `{ output, metadata: { exit_code, duration_seconds } }` and set `toolResult.exitCode`, `toolResult.durationMs`, and `toolResult.stdout`.

## Code Highlights

- Updated: src/lib/providers/codex.ts: function_call + function_call_output handling

```ts
case "function_call_output": {
  const parsed = safeJsonParse(payload.output);
  let display: unknown = parsed;
  let exitCode: number | undefined;
  let durationMs: number | undefined;
  let stdout: string | undefined;

  if (parsed && typeof parsed === "object") {
    const anyParsed = parsed as Record<string, unknown>;
    const maybeOutput = anyParsed.output;
    if (typeof maybeOutput === "string") {
      stdout = maybeOutput;
      display = maybeOutput;
    }
    const md = anyParsed.metadata as Record<string, unknown> | undefined;
    if (md) {
      if (typeof md.exit_code === "number") exitCode = md.exit_code;
      if (typeof md.duration_seconds === "number") durationMs = Math.round(md.duration_seconds * 1000);
    }
  }

  pushMessage("tool-result", safeStringify(display), {
    toolResult: { callId: payload.call_id, output: parsed, exitCode, durationMs, stdout }
  }, undefined, "tool");
}
```

## Self-Tests

Commands:

```bash
pnpm lint
pnpm test
```

Expected:

- Lint OK (warnings allowed)
- Tests OK

Actual:

- Lint: OK (warnings in chat-detail.tsx pre-existing)
- Tests: OK (11 passed)

## Risks & Follow-ups

- Exec JSON `item.*` events still to map (command_execution/file_change) in a future task.
- Claude provider to enrich `tool_result` with stdout/stderr when available.
