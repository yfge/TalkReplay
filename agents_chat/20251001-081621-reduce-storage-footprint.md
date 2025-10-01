## Summary

- Adjusted the chat store persistence so only lightweight UI preferences (filters, active session id, starred set) are saved, avoiding serialising entire transcripts into localStorage.
- Stopped the QuotaExceeded error triggered when Codex/Claude sessions exceeded browser storage limits.

## Code Highlights

- `src/store/chat-store.ts` partialises persisted state without `sessions` and updates the merge logic to reuse in-memory conversations while hydrating starred/filters.

## Self-Tests

- `pnpm lint`
- `pnpm test`
- `pnpm format`

## Risks / Follow-ups

- Starred session ids still live in storage; if this grows too large we may need to cap or migrate to IndexedDB.
