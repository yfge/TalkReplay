## Summary

为 ToolCallCard 增加 i18n 文案与键盘快捷键（n/p 跳转 hunk）。

- 新增 detail.tabs.{stdout,stderr,diff}、detail.{arguments,result,noOutput,nextHunk,prevHunk} 文案（中英）
- ResultTabs 监听键盘 n/p，激活 diff 时跳转上一/下一 hunk；按钮文案使用 i18n

## Code Highlights

- Locales: src/locales/en/common.json, src/locales/zh-CN/common.json
- UI: src/components/chats/tool-call-card.tsx（useTranslation、Tab 文案、Next/Prev Hunk、键盘监听）

## Self-Tests

```bash
pnpm lint
pnpm test
```

Expected/Actual: OK（仅 UI 层既有 warnings）

## Risks & Follow-ups

- 后续可加 i18n 热切换提示、Tab 的 aria 属性、快捷键提示（tooltip）。
