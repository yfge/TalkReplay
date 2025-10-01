## Summary

- Appended the message index to the derived React key used in `ChatDetail` so repeated message ids within a single session no longer collide.
- Reused the augmented key for clipboard feedback, keeping copy status consistent after the change.

## Code Highlights

- `src/components/chats/chat-detail.tsx` builds `messageKey` as `sessionId:messageId:index`, guaranteeing uniqueness even when providers emit duplicate ids.

## Self-Tests

- `pnpm lint`
- `pnpm test`
- `pnpm format`

## Risks / Follow-ups

- Keys rely on message ordering remaining stable; if we introduce re-sorting we should revisit key generation to avoid mismatches.
