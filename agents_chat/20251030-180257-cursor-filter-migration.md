## Summary

- Fixed persisted chat filters so newly supported sources (cursor) appear even when older local storage lacked them.
- Added migration + sanitisation logic for the chat store and a regression test covering the new behaviour.

## Code Highlights

```text
src/store/chat-store.ts
src/store/chat-store.test.ts
```

## Self-Tests

- `pnpm lint`
- `pnpm test`
- `pnpm format`

## Risks & Follow-ups

- Existing users who intentionally disabled cursor will now see it until they toggle the source off again.
- Consider a future UX affordance to surface newly added providers explicitly instead of silently enabling them.
