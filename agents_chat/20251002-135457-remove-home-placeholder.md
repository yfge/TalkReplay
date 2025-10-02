## Summary

Remove the home page placeholder panel that instructed users to click a conversation to open the full-page detail. The detail view now lives at `/chats/[id]`, so the guidance copy is unnecessary clutter.

## Code Highlights

```tsx
// src/App.tsx
// Delete the right-hand guidance block; keep only the chat list column.
```

## Self-Tests

- Open `/` (home):
  - Only the chat list is visible; no guidance text appears.
  - Clicking a list item still navigates to `/chats/<id>` and renders detail.
