## Summary

- Exercised `/api/sessions` and `/api/sessions/detail` handlers directly with Next-style requests to ensure they return normalised session summaries and detail messages.
- Verified every sample transcript now yields kind-tagged messages (content, tool-call, tool-result, reasoning, system) with valid roles and timestamps and added assertions for invalid provider paths and unknown session identifiers.

## Code Highlights

- Added `src/app/api/__tests__/sessions-api.test.ts` which imports the route handlers and asserts schema expectations using the bundled sample transcripts plus new Claude/Codex fixtures containing tool calls, tool results, and reasoning events. The tests copy fixture content into temporary directories so CI can run without relying on machine-specific provider paths, keeping the filesystem clean after execution.
- Updated `tasks.md` to mark the integration coverage item complete.

## Self-Tests

- `pnpm test -- --runInBand`
  - Expected: unit suites plus new integration tests all pass.
  - Actual: 4 test files, 7 tests completed successfully.

## Risks / Follow-ups

- Tests rely on bundled sample sessions; when Gemini support arrives, extend fixtures and assertions accordingly.
- For real provider directories, consider adding mock filesystem layers or injecting provider paths to avoid hitting the OS during CI.

## Touched Files

- `src/app/api/__tests__/sessions-api.test.ts`
- `tasks.md`
