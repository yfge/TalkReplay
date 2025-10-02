## Summary

Add project filtering to the home sidebar and provide a `/api/projects` endpoint to list available projects derived from provider sessions.

## Code Highlights

- Filter state extended with `project` and store actions:
  - `src/types/chat.ts:1` adds `project?: string` to `ChatFilterState`.
  - `src/store/chat-store.ts:1` adds `setProject` and filters by project in `useFilteredSessionSummaries`.
- Sidebar project selector:
  - `src/components/sidebar/chat-sidebar.tsx:1` renders a `<select>` listing unique projects computed from loaded summaries; supports clearing to show all.
- Projects API:
  - `src/app/api/projects/route.ts:1` POST accepts `{ paths, previousSignatures? }` and returns `{ projects: [{ name, count }] }`.
  - Types in `src/lib/session-loader/types.ts:1` (`LoadProjectsPayload`, `LoadProjectsResult`, `ProjectEntry`).
- Provider metadata:
  - Claude and Codex already set `metadata.project`; Claude now normalizes flattened names (e.g., `-Users-...-tools` → `tools`).

## Self-Tests

```bash
pnpm dev
# Sidebar shows a Project dropdown. Select a project → list filters accordingly.

curl -s localhost:3000/api/projects -X POST \
  -H 'content-type: application/json' \
  -d '{"paths": {"claude": "'$HOME'/.claude/projects", "codex": "'$HOME'/.codex/sessions"}}'
# Expect JSON with projects and counts
```

## Risks / Follow-ups

- If some sessions miss `metadata.project`, they won't appear in project list; future adapters can set it more robustly.
- UI currently single-select; can be upgraded to multi-select chips if needed.
- We can show the normalized `cwd` (when available) under the project line in detail view for clarity.

## Touched Files

- src/types/chat.ts
- src/store/chat-store.ts
- src/components/sidebar/chat-sidebar.tsx
- src/app/api/projects/route.ts
- src/lib/session-loader/types.ts
