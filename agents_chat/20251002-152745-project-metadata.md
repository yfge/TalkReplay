## Summary

Add `project` metadata to sessions and extract it from providers.

## Code Highlights

- types: add `project?: string` to `SessionMetadata`.
- claude: derive project name from project directory; normalize flattened names like `-Users-foo-dev-bar-baz` → `baz` and set `extra.cwd` to `/Users/foo/dev/bar/baz` when possible.
- codex: read `cwd` from `session_meta` and set `project` to the last path segment; normalize flattened hyphen strings with a heuristic and set `extra.cwd`.

## Self-Tests

- `pnpm test` passes.
- Import Claude/Codex logs; open detail; header shows `Project: <name>`.

## Touched Files

- src/types/chat.ts
- src/lib/providers/claude.ts
- src/lib/providers/codex.ts
