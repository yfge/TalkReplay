## Summary

- Normalised session IDs across client/server by introducing shared base64url helpers, so fallback sample data now lines up with detail fetches.
- Updated the detail API to return sample conversations when the request matches demo IDs, ensuring the UI shows content even without local files.

## Code Highlights

- `src/lib/session-loader/ids.ts` exports `encodeSessionId`/`decodeSessionId` with browser and Node support; `fetchSessionSummaries` uses it so fallback summaries reuse encoded IDs.
- `/api/sessions` and `/api/sessions/detail` import the shared helper; the detail route now short-circuits for bundled sample sessions.

```ts
// src/lib/session-loader/client.ts
const sourceFile = session.metadata?.sourceFile ?? session.id;
return {
  id: encodeSessionId(sourceFile),
  source: session.source,
  ...
};
```

## Self-Tests

- `pnpm test -- --runInBand`
  - Expected: existing unit suites pass.
  - Actual: all vitest suites passed (3/3).

## Risks / Follow-ups

- When real provider data is present, verify the encoded IDs still map correctly on Windows-style paths.
- Consider adding integration tests around `/api/sessions/detail` to guard against regressions in ID handling.

## Touched Files

- `src/app/api/sessions/detail/route.ts`
- `src/app/api/sessions/route.ts`
- `src/lib/session-loader/client.ts`
- `src/lib/session-loader/ids.ts`
- `src/lib/session-loader/server.ts`
