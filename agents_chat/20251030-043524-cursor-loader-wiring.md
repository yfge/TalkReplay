## Summary

- Extended server-side loader to probe Cursor defaults across macOS/Linux/Windows and return resolved paths.
- Added a placeholder Cursor provider module so API routes can import it while schema work is pending, and updated API tests for the new source.

## Code Highlights

```text
src/lib/session-loader/server.ts:37
src/lib/providers/cursor.ts:1
src/app/api/__tests__/sessions-api.test.ts:39
tasks.md:75
```

## Self-Tests

- Tests not run manually (pre-commit still runs lint + unit suite).

## Risks & Follow-Up

- Placeholder provider returns no data; schema-based parser plus fixtures remain outstanding.
- Need to suppress UI noise if Cursor directories are empty to avoid confusing users during rollout.
