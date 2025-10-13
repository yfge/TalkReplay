## Summary

UI: add "Next diff card" navigation in chat header and mark tool-call cards containing diffs for quick jump.

## Code Highlights

- Updated: src/components/chats/chat-detail.tsx (button + scroll logic)
- Updated: src/components/chats/tool-call-card.tsx (toolcall-has-diff marker)

## Self-Tests

- Manual: navigate to diff Tab, then click "Next diff card"; view scroll jumps to next diff card; repeats to cycle.
- pnpm build: success
