## Summary

- Ensured existing users automatically regain the Cursor source after updating by bumping the chat store persistence version and re-running migration logic when older data is detected.
- Added a regression test that covers both the legacy upgrade path and the post-upgrade behaviour to confirm Cursor is only auto-enabled during migration.

## Code Highlights

```ts
// src/store/chat-store.ts#L107
const adjusted =
  version < 6 && SUPPORTED_SOURCES.includes("cursor")
    ? ensureSource(sanitized, "cursor")
    : sanitized;
```

```ts
// src/store/chat-store.test.ts#L23
const result = migrate?.(persistedState, 5);
expect(result.filters?.sources).toContain("cursor");
```

```ts
// src/store/chat-store.test.ts#L36
const result = migrate?.(persistedState, 6);
expect(result.filters?.sources).not.toContain("cursor");
```

## Self-Tests

- `pnpm lint`
- `pnpm test`

## Risks & Follow-Up

- Users who deliberately disabled Cursor before upgrading will see it re-enabled once; document the toggle in release notes.
- Consider surfacing a noticeable banner when new providers are auto-enabled so users understand why the list changed.

## References

- `src/store/chat-store.ts`
- `src/store/chat-store.test.ts`
