## Summary

Implement initial ToolCallCard and grouping logic in chat detail view:

- Groups `tool-call` with matching `tool-result` by `toolCallId`.
- Renders a collapsible card showing tool name/id, status/duration (if available), arguments, and result (stdout or content).

## Code Highlights

- Added: src/components/chats/tool-call-card.tsx
- Updated: src/components/chats/chat-detail.tsx – pre-group messages and render ToolCallCard

```tsx
const resultByCallId = new Map<string, number>();
// ... build items (group or single)
<ToolCallCard call={call} result={result} />;
```

## Self-Tests

- Lint/tests:

```bash
pnpm lint
pnpm test
```

Expected: OK (only warnings)
Actual: OK

## Risks & Follow-ups

- Next: add tabs (stdout/stderr/diff), better i18n labels, and keyboard accessibility.
- Consider virtualizing long lists after grouping.
