## Summary

A3 再提升：统一 diff 解析，生成结构化 hunks 信息。

- 新增 `parseUnifiedDiff`，支持最小化 unified diff 解析：`oldPath/newPath`、`@@` 块、`+/-/ ␠` 行。
- 在 Codex `file_change` 结果中，除 `filesChanged / diff` 外，增加 `toolResult.diffFiles[]`（包含每个文件的 `hunks`）。

## Code Highlights

- Types: src/types/chat.ts → `toolResult.diffFiles`（含 `hunks` 和行）
- Parser: src/lib/diff.ts（最小 unified diff 解析器）
- Codex: src/lib/providers/codex.ts → 解析并填充 `diffFiles`
- Tests: src/lib/diff.test.ts、src/lib/providers/codex.diff-websearch.test.ts（校验 hunks 数量）

## Self-Tests

```bash
pnpm lint
pnpm test
```

Expected/Actual: OK（仅 UI 警告）

## Risks & Follow-ups

- 解析器是 best-effort，对非统一 diff 可能需进一步兼容（e.g. index/rename headers）。
- 后续可把 `diffFiles` 渲染到 UI（ToolCallCard 的 diff Tab）。
