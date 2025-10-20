## Summary

Implemented client-side pagination for the chat list to improve usability with large numbers of sessions. The pager shows current page and provides Prev/Next buttons, with i18n support for both English and Chinese.

## Code Highlights

```tsx
// src/components/chats/chat-list.tsx
+ const PAGE_SIZE = 20;
+ const [page, setPage] = useState(1);
+ const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE));
+ const pageItems = useMemo(() => sessions.slice(start, end), [sessions, start, end]);
// Render pageItems instead of full sessions, and add footer with Prev/Next controls.
```

```json
// i18n strings
// src/locales/en/common.json: chats.pagination.{prev,next,pageOf}
// src/locales/zh-CN/common.json: chats.pagination.{prev,next,pageOf}
```

## Self-Tests

Commands:

```bash
pnpm lint
pnpm test:ci
pnpm dev -- --port 3002
```

Manual checks:

- With many sample sessions, list renders the first 20 items.
- Clicking Next/Prev navigates pages; page indicator updates correctly.
- Filters (source/starred/date/project) reset or cap the current page appropriately.

## Risks, Blockers, Follow-ups

- Pagination is client-side; server still returns full list. For extremely large data sets, server-side pagination + virtualisation is preferred.
- Next step (optional): integrate `@tanstack/react-virtual` and add page-size selector.

Touched files:

- src/components/chats/chat-list.tsx
- src/locales/en/common.json
- src/locales/zh-CN/common.json
- tasks.md
