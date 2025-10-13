## Summary

Add i18n labels and aria/tooltip strings for ToolCallCard tabs, toggle, diff hunk navigation, and list-level "Next diff card".

## Code Highlights

- Updated: src/locales/en/common.json (detail.tabs._, detail.toggleCard._, detail.tabsAria._, detail.jump._)
- Updated: src/locales/zh-CN/common.json (同上)

## Self-Tests

- Switch locale (en/zh-CN), verify labels on:
  - Toggle card Show/Hide
  - Tabs stdout/stderr/diff (button text + aria + title)
  - Prev/Next hunk buttons（title/aria）
  - Next diff card button（title/aria）
