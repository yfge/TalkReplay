## Summary

- Normalised provider root paths on the server side so `~`-prefixed Codex/Claude directories resolve to the user home directory before parsing.
- Added directory existence checks to surface clear errors when configured paths are missing or not folders.

## Code Highlights

- `src/lib/session-loader/server.ts` expands `~`, resolves relative paths, validates directories via `stat`, and reports configuration errors in the API response.

## Self-Tests

- `pnpm lint`
- `pnpm test`
- `pnpm format`

## Risks / Follow-ups

- Directory validation still assumes Node has permission to traverse the configured paths; surface OS-specific permission errors to the UI for better guidance if needed.
