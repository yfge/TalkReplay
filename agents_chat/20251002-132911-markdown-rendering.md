## Summary

Fix the full-page conversation detail rendering by parsing basic Markdown (headings, lists, paragraphs, fenced code) instead of showing raw text with `#` and list markers. Implemented a lightweight Markdown-to-HTML renderer to avoid adding new runtime dependencies.

## Code Highlights

```tsx
// src/components/chats/chat-detail.tsx
function renderSimpleMarkdown(md: string): string {
  /* headings, lists, code fences */
}
// In default message branch, replace <pre> with:
<div
  dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(resolvedContent) }}
/>;
```

Behavior:

- Supports `#`–`######` headings, ordered/unordered lists, blank line paragraph breaks.
- Fenced code blocks `…` render inside `<pre><code>` with safe escaping.
- No raw HTML allowed (input is escaped before conversion) to keep it safe.

## Self-Tests

- Open `/chats/<id>` where message content includes Markdown headings and lists.
  - Expected: Headings styled with spacing, lists as bullets or decimals, code fences in a styled block.
- Non-Markdown plain text still renders with line breaks preserved.

Manual checks:

- `pnpm dev` and visit a sample containing “# Agents Web App Specification”.
- Verify no console errors and that copy/export still work.

## Risks, Blockers, Follow-ups

- The renderer is intentionally lightweight; it doesn’t cover full Markdown spec (e.g., nested lists, links, tables). If richer rendering is needed later, migrate to `react-markdown` with `remark-gfm` (requires dependency install).
- Add tests for `renderSimpleMarkdown` with representative transcripts if desired.

## References

- src/components/chats/chat-detail.tsx
