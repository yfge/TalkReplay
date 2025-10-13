## Summary

- Normalised Codex `function_call` toolType mapping using a table and heuristics so UI grouping and icons stay consistent.

Mapped names → toolType:

- `shell` → `bash`
- `apply_patch` → `apply_patch`
- `read_file`, `list_dir`, `grep_files`, `update_plan`, `unified_exec`, `view_image`, `web_search`
- `web_search_*_call` → `web_search`

Referenced files: src/lib/providers/codex.ts

## Code Highlights

```ts
const table = {
  shell: "bash",
  apply_patch: "apply_patch",
  read_file: "read_file",
  list_dir: "list_dir",
  grep_files: "grep_files",
  update_plan: "update_plan",
  unified_exec: "unified_exec",
  view_image: "view_image",
  web_search: "web_search",
};
if (n.endsWith("_call") && n.startsWith("web_search")) return "web_search";
```

## Self-Tests

- `pnpm lint`, `pnpm exec vitest run`, `pnpm format`

## Risks / Follow-ups

- Extend mapping when adding new tools (e.g., more Freeform/MCP tools); unknown names still pass through as-is.
