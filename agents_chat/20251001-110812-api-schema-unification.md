## Summary

- Defined a unified transcript schema covering summaries, messages, tool calls, and reasoning so Claude/Codex detail APIs return consistent payloads.
- Normalised Claude and Codex loaders to emit `kind`-annotated messages (content, reasoning, tool-call, tool-result) with structured metadata.
- Refreshed the chat detail UI to render the new message kinds and improved copy/preview behaviour for tool calls and reasoning steps.

## Code Highlights

- Added `docs/session-api-format.md` describing the contract; extended shared types with `ChatMessageKind`, tool metadata, and reasoning metadata (`src/types/chat.ts`).
- Reworked Claude/Codex adapters to split multi-part messages and capture tool calls/results plus reasoning summaries (`src/lib/providers/claude.ts`, `src/lib/providers/codex.ts`).
- Updated API summary helpers and parsing utilities to respect the new schema, including sample data and JSON parsers (`src/app/api/sessions/route.ts`, `src/lib/session-loader/client.ts`, `src/lib/parser-core.ts`, `src/data/sampleSessions.ts`).
- Revamped the conversation detail component to display tool invocations/results and reasoning notes with new locale strings (`src/components/chats/chat-detail.tsx`, `src/locales/en/common.json`, `src/locales/zh-CN/common.json`).

## Self-Tests

- `pnpm test -- --runInBand`
  - Expected: unit tests for Claude/Codex parsers and App wrapper pass.
  - Actual: all 3 vitest suites succeeded.

## Risks / Follow-ups

- Some Codex logs still redact assistant messages; the UI now surfaces reasoning/tool events but these sessions should be validated manually.
- Integration tests for `/api/sessions/detail` remain pending (see `tasks.md`) to guard against future schema regressions.
- Gemini adapter must be updated to follow the new `ChatMessageKind` contract when implemented.

## Touched Files

- `docs/session-api-format.md`
- `src/types/chat.ts`
- `src/lib/providers/claude.ts`
- `src/lib/providers/codex.ts`
- `src/app/api/sessions/route.ts`
- `src/lib/session-loader/client.ts`
- `src/lib/parser-core.ts`
- `src/data/sampleSessions.ts`
- `src/components/chats/chat-detail.tsx`
- `src/locales/en/common.json`
- `src/locales/zh-CN/common.json`
- `src/lib/providers/claude.test.ts`
- `src/lib/providers/codex.test.ts`
- `tasks.md`
