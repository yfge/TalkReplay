## Summary

Fix detail page header rendering by formatting the session metadata summary as collapsible Markdown instead of a long plain-text blob. This prevents the header from overflowing while preserving readable structure.

## Code Highlights

```tsx
// src/components/chats/chat-detail.tsx
<details>
  <summary>Session info</summary>
  <div
    dangerouslySetInnerHTML={{
      __html: renderSimpleMarkdown(session.metadata.summary ?? ""),
    }}
  />
</details>
```

## Self-Tests

- Open a `/chats/<id>` that contains Markdown in the metadata summary.
- Expected: Header shows a collapsible summary; expanding displays headings/lists formatted.

## Notes

- Uses the existing lightweight Markdown renderer to avoid new dependencies.

## References

- src/components/chats/chat-detail.tsx
