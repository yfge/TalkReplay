## Summary

- Updated the conversation detail page starred icon to use yellow so it visually matches the chat list and stands out on both themes.

Referenced files: src/components/chats/chat-detail.tsx

## Code Highlights

```tsx
{
  isStarred ? (
    <Star className="size-4 fill-yellow-300 text-yellow-500 dark:fill-yellow-200 dark:text-yellow-200" />
  ) : (
    <StarOff className="size-4" />
  );
}
```

## Self-Tests

- `pnpm lint`
- `pnpm exec vitest run`
- `pnpm format`

## Risks / Follow-ups

- Confirm the yellow remains legible over the gradient header background when buttons are focused/hovered.
