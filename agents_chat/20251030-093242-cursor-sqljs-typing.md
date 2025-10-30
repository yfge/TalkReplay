## Summary

- Adjusted the sql.js initialization to wrap the default export with proper typing, avoiding unsafe casts that triggered lint warnings.

## Code Highlights

```text
src/lib/providers/cursor.ts:5
```

## Self-Tests

- `pnpm lint`
- `pnpm test`
- `pnpm format`

## Risks & Follow-Up

- Monitor future sql.js updates; type helpers may need revisiting if the package ships official TypeScript support.
