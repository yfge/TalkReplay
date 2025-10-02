## Summary

Fix session detail loading when the decoded file path does not match configured provider roots by probing both Claude and Codex loaders as a fallback.

## Code Highlights

- `src/lib/session-loader/server.ts` now checks file existence and tries Claude/Codex parsers if the path isn't under known roots, returning the first successful parse.

## Self-Tests

Commands:

```bash
pnpm dev
# Navigate directly to /chats/<id> for a session whose path is outside the configured roots
# Expect: detail loads correctly instead of "Unknown provider for provided session path".
```

## Risks / Follow-ups

- Root-based access control still applies to file proxy; ensure `NEXT_PUBLIC_*` envs are set for image proxy access.

## Touched Files

- src/lib/session-loader/server.ts
