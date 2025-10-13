## Summary

Extend unified schema to better represent tool calls and results across Claude/Codex:

- Add `toolCall.toolType` and `toolResult` fields (`exitCode`, `durationMs`, `stdout`, `stderr`, `filesChanged`, `diff`).
- Keep additions optional to avoid breaking callers.
- Adjust one test to satisfy `tsc --noEmit` narrowing.

## Code Highlights

- Updated: src/types/chat.ts:38
- Test narrow: src/app/api/**tests**/sessions-api.test.ts:line ~120
- Tasks progress note: tasks.md

```ts
// src/types/chat.ts
export interface MessageMetadata {
  toolCall?: {
    id?: string;
    name?: string;
    arguments?: unknown;
    toolType?: string; // e.g. "bash" | "apply_patch" | "mcp"
  };
  toolResult?: {
    callId?: string;
    output?: unknown;
    exitCode?: number;
    durationMs?: number;
    stdout?: string;
    stderr?: string;
    filesChanged?: string[];
    diff?: string;
  };
}
```

## Self-Tests

Commands:

```bash
pnpm typecheck
pnpm lint
pnpm test -- --coverage
```

Expected:

- Typecheck passes
- Lint passes (only warnings allowed)
- Tests pass (11 green)

Actual:

- Typecheck: OK
- Lint: 0 errors, 8 warnings (pre-existing in chat-detail.tsx)
- Tests: OK (11 passed)

## Risks & Follow-ups

- Parsers must populate new fields (A3). UI will consume them (A4).
- Consider mapping Codex exec JSON `command_execution` metadata into `exitCode/durationMs/stdout/stderr`.
