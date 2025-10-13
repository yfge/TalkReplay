## Summary

Add sanitized fixtures, snapshot tests, and docs for data mappings and tool call UI.

- Fixtures: `fixtures/codex/file_change_mcp.jsonl`, `fixtures/claude/tool_use_result.jsonl`
- Tests: `src/lib/providers/codex.snapshot.test.ts`, `src/lib/providers/claude.snapshot.test.ts`
- Docs: `docs/data-sources.md`, `docs/ui-tool-calls.md`

## Code Highlights

- Parser snapshot assertions for file_change/mcp_tool_call (Codex) and stdout/stderr (Claude)
- Documentation of field mappings and current UI behaviors

## Self-Tests

```bash
pnpm lint
pnpm test
```

Expected: OK
Actual: OK (warnings only)

## Risks & Follow-ups

- Consider adding image/file attachments extraction in future snapshots
- Add UI screenshots to `docs/ui-tool-calls.md` later
