## Summary

- UI: Removed the "system" filter chip from the conversation detail view; system messages remain visible by default (filters still include them implicitly).
- Parser(Codex): Unified `web_search` to reuse the common tool-call/result helpers, and defaulted fallback entries to `system-as-tool` so they render consistently.

Referenced files: src/components/chats/chat-detail.tsx, src/lib/providers/codex.ts

## Code Highlights

```tsx
// chat-detail.tsx
const MESSAGE_FILTER_CONFIG = [
  { key: "human", ... },
  { key: "assistant", ... },
  { key: "tool", ... },
  // system removed from chips
];
```

```ts
// codex.ts
messages.push(makeToolCall({ id, name: 'web_search', args: { query }, ... }));
messages.push(makeToolResult({ callId: id, output: { query, results }, exitCode: 0 }));

// default → tool-result (system-as-tool)
messages.push(makeToolResult({ callId, output, providerMessageType: 'system-as-tool' }));
```

## Self-Tests

- `pnpm lint`
- `pnpm exec vitest run`
- `pnpm format`

## Risks / Follow-ups

- Next: extend function_call name→toolType mapping and Claude tool name mapping after reviewing local repos for authoritative lists.
