## Summary

Parser enhancement: detect rename/copy/binary headers in unified diff and map to diffFiles (status, renamedFrom/To, binary).

## Code Highlights

- Updated: src/lib/diff.ts

## Self-Tests

- pnpm lint: OK (warnings)
- pnpm test: OK
