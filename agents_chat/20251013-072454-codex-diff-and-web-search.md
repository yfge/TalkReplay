## Summary

A3 后续：增强 file_change 映射填充 `toolResult.diff`，并支持 `web_search` 事件（item.started/completed → tool-call/result）。

## Code Highlights

- Updated: src/lib/providers/codex.ts
  - file_change: 提取 changes[].diff/patch 或 item.diff/patch → `toolResult.diff`
  - web_search: 生成 tool-call（toolType=web_search，arguments.query）与 tool-result（包含 query+results）
- Fixtures & tests:
  - fixtures/codex/file_change_with_diff.jsonl
  - fixtures/codex/web_search.jsonl
  - src/lib/providers/codex.diff-websearch.test.ts

## Self-Tests

```bash
pnpm lint
pnpm test -t codex
```

Expected/Actual: OK（仅 UI 警告）

## Risks & Follow-ups

- 部分日志未包含 diff/patch 字段时 `toolResult.diff` 为 undefined
- 后续可添加 web_search 结果提取更细粒度字段
