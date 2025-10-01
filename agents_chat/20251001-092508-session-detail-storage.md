## Summary

- Split the session list/detail workflow so the UI now loads summaries via `/api/sessions` and fetches message payloads on demand; the store exposes `appendSessionSummaries` to keep list/detail caches in sync.
- Introduced `safeStateStorage` for zustand persistence to swallow `QuotaExceededError` and fall back to an in-memory cache, preventing the UI crash seen in the detail panel.
- Normalised provider signature bookkeeping: signatures use relative paths, legacy absolute entries are pruned, and `.next/` outputs are ignored to keep the repo clean.

## Code Highlights

- Added summary normalisation helpers and `appendSessionSummaries` in `src/store/chat-store.ts`; imports now use the new action instead of manual state reads in `src/components/chats/chat-detail.tsx`.
- Persisted stores share `safeStateStorage` (`src/lib/safe-storage.ts`), and the import store prunes legacy absolute signature keys while merging results.
- Provider loaders (`src/lib/providers/claude.ts`, `src/lib/providers/codex.ts`) now emit relative signature keys to reduce storage footprint.
- Repository ignores `.next/` builds via `.gitignore`; signature tasks documented in `tasks.md`.

```ts
// src/store/chat-store.ts
appendSessionSummaries: (sessions) =>
  set((state) => {
    if (sessions.length === 0) return {};
    const merged = [...state.sessionSummaries, ...sessions];
    return normalizeSessionSummaries(state, merged);
  }),
```

## Self-Tests

- `pnpm test -- --runInBand`
  - Expected: unit tests pass.
  - Actual: all 3 vitest suites passed.

## Risks / Follow-ups

- Large transcript sets still fall back to in-memory signatures; we should schedule an IndexedDB-backed store or server-side caching to preserve incremental import across reloads.
- Integration tests for the new summary/detail endpoints remain outstanding (`tasks.md`).
- Need to validate Windows path handling for the new relative signature format during next manual test pass.

## Touched Files

- `.gitignore`
- `src/components/chats/chat-detail.tsx`
- `src/lib/providers/claude.ts`
- `src/lib/providers/codex.ts`
- `src/lib/safe-storage.ts`
- `src/store/chat-store.ts`
- `src/store/import-store.ts`
- `src/store/preferences-store.ts`
- `tasks.md`
