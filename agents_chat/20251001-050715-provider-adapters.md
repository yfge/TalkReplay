# Claude & Codex Adapters

## Summary

- Implemented filesystem adapters to parse Claude JSONL project logs and Codex CLI session logs into the unified chat schema.
- Hooked the manual refresh flow into these adapters (with sample fallback in browser contexts) and added unit tests for the parsers.
- Updated the roadmap to reflect progress on the provider adapter task.

## Code Highlights

- `src/lib/providers/claude.ts:1` reads `~/.claude/projects/*/*.jsonl`, extracting summaries, token usage, and tool call metadata.
- `src/lib/providers/codex.ts:1` walks `~/.codex/sessions/YYYY/MM/DD/*.jsonl`, converting response items (including tool use/result payloads) into chat messages.
- `src/lib/session-loader.ts:1` now delegates to the adapters in Node environments and falls back to demo data in the browser.
- `src/App.tsx:1` integrates the new loader with refresh state; `src/components/chats/chat-list.tsx:1` surfaces refresh controls in empty states.
- `src/lib/providers/*.test.ts:1` provide Vitest coverage for both parsers; `tasks.md:20` tracks adapter progress with Claude/Codex complete.

## Self-Tests

- `pnpm lint`
- `pnpm test`

## Risks & Follow-Up

- Adapter error handling currently swallows failures; we should surface errors to the UI when real imports run.
- Gemini adapter remains outstanding and will follow once its log format is defined.
