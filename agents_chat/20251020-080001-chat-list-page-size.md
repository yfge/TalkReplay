## Summary

Added a page-size selector to the chat list pagination so users can choose how many sessions to display per page (10/20/50/100). Changing the page size resets to the first page and updates the pager.

## Code Highlights

```tsx
// src/components/chats/chat-list.tsx
+ const PAGE_SIZES = [10, 20, 50, 100] as const;
+ const [pageSize, setPageSize] = useState<number>(20);
+ const totalPages = Math.max(1, Math.ceil(sessions.length / pageSize));
+ useEffect(() => setPage(1), [pageSize]);
// Footer: added <select> bound to pageSize with i18n label
```

```json
// i18n
// src/locales/en/common.json: chats.pagination.perPage = "Per page"
// src/locales/zh-CN/common.json: chats.pagination.perPage = "每页"
```

## Self-Tests

Commands:

```bash
pnpm lint
pnpm test:ci
pnpm dev -- --port 3002
```

Manual checks:

- Change page size from 20 to 50: list immediately shows up to 50 items and pager updates.
- Filters applied → pager recalculates total pages; current page resets if out of range.
- i18n strings appear correctly in EN/zh-CN.

## Risks, Blockers, Follow-ups

- Consider persisting page size in local storage per user preference.
- For very large datasets, combine with virtualisation and/or server-side pagination.

Touched files:

- src/components/chats/chat-list.tsx
- src/locales/en/common.json
- src/locales/zh-CN/common.json
- tasks.md
