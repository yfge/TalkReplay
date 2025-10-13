## Summary

A4：为 ToolCallCard 增加 stdout/stderr/diff 三个 Tab，并渲染结构化 diff（`diffFiles`）与“Next Hunk”跳转。

## Code Highlights

- UI: src/components/chats/tool-call-card.tsx
  - 新增 Tab 状态管理与按钮（基于 shadcn button）
  - stdout/stderr 以等宽字体展示
  - diff Tab：优先渲染 `diffFiles`（带 +/− 高亮、hunk 头），无结构数据时回退原始 diff 文本；提供 Next Hunk 按钮定位到下一 hunk

## Self-Tests

- 复用既有解析/快照测试；手动验证：选择 diff Tab，可滚动并跳转 hunk；stdout/stderr 切换正常。
- 质量检查：

```bash
pnpm lint
pnpm test
```

Expected/Actual: OK（仅 UI warnings）

## Risks & Follow-ups

- 后续：加入键盘快捷键（n/p 跳转 hunk）、i18n 文案、虚拟化长 diff。
