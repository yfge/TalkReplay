## Summary

Add syntax highlighting to Markdown-rendered content using `rehype-highlight` with Highlight.js theme. Applies to both message bodies and the collapsible session summary.

## Code Highlights

```tsx
// src/components/chats/chat-detail.tsx
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  rehypePlugins={[require("rehype-highlight").default]}
>
  {text}
</ReactMarkdown>;

// src/app/layout.tsx
import "highlight.js/styles/github.css";
```

## Self-Tests

- Messages containing fenced code blocks render with token colors.
- Summary section (Session info) also highlights code samples.
- No console warnings; list and heading formatting remains intact.

## Follow-ups

- Optionally switch themes or add dark-mode theme override.

## References

- src/components/chats/chat-detail.tsx
- src/app/layout.tsx
