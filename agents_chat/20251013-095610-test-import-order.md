## Summary

- 调整 `src/lib/diff.test.ts` 与 `src/lib/providers/*` 测试文件的 import 顺序，满足 ESLint `import/order` 规则。
- 未改动测试逻辑，仅涉及语句重排。

## Code Highlights

```ts
// src/lib/providers/claude.snapshot.test.ts
import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
```

## Self-Tests

- `pnpm lint` → ✅

## Risks & Follow-ups

- 无功能行为变更；后续若增加更多测试文件需保持相同的 import 分组顺序。
