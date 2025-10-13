## Summary

- Fixed overflow in conversation detail messages by forcing small-screen word breaking and eliminating flex min-width issues.

Referenced files: src/components/chats/chat-detail.tsx

## Code Highlights

```tsx
<li
  className="flex min-w-0 w-full max-w-full flex-col gap-3 overflow-hidden rounded-lg"
>
  ...
  <div
    className={`relative w-full max-w-full overflow-hidden rounded-xl break-all sm:break-words px-4 py-3 leading-relaxed transition ${...}`}
  >
```

- Adds `min-w-0` to the message list item to allow flex children to shrink and not expand the layout.
- Uses `break-all` on small screens (fallback to `sm:break-words` on larger) to ensure very long tokens/base64/URLs don’t overflow.

## Self-Tests

- `pnpm lint`
- `pnpm exec vitest run`
- `pnpm format`

## Risks / Follow-ups

- Visually confirm CJK text readability remains acceptable with `break-all` on narrow viewports.
