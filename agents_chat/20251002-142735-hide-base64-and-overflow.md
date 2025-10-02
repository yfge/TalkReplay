## Summary

Hide base64 JSON when an image is present and fix residual message overflow in the chat detail view. This addresses cases where tool calls or content include `{ type: "input_image", image_url: "data:image/...;base64,..." }` and UI previously displayed the long base64 string.

## Code Highlights

- Prefer images when detected and suppress JSON/base64 text:
  - `src/components/chats/chat-detail.tsx:1` added explicit `content` and improved `tool-call` branches to render inline images (from `attachments`, `image_url`, `url`, `uri`, `path`, or `stdout`) and skip rendering the raw base64 text when images exist.
  - When images are detected, the copy button copies image URLs instead of the base64 blob.
- Prevent overflow:
  - Add `overflow-x-hidden` to the scroll area and `w-full max-w-full overflow-hidden break-words` to message containers.
  - Keep `<pre>` blocks as `whitespace-pre-wrap break-all max-w-full` to wrap long tokens.

## Self-Tests

Commands:

```bash
pnpm dev
# Open a session containing { type: 'input_image', image_url: 'data:image/png;base64,...' }
```

Expected:

- The message shows the image, not the base64 text.
- No horizontal overflow; message cards stay within the main panel.
- Copy button returns image URLs when images are present.

## Risks / Follow-ups

- Additional provider-specific shapes may need to be added to the image extraction heuristic in the future.
- Consider moving image extraction into provider adapters to emit `metadata.attachments` consistently.

## Touched Files

- src/components/chats/chat-detail.tsx
