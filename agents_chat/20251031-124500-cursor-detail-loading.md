## Summary

- Debugged Cursor detail requests returning “Session not found” and traced the regression to mis-identifying the provider root when reopening an individual snapshot.
- Patched the Cursor provider to reuse the correct `.../Cursor` root, load `sql.js` from Node (not the RSC bundle), and expose `/api/sessions` debug probes that surface cursor-specific counts, errors, and workspace contents.
- Extended Next.js config so `sql.js` is treated as a server external, preventing future bundler regressions,并确保调试代码在 `ProviderImportError` 类型上复用共享定义/导入顺序以满足 lint/build 要求。

## Code Highlights

```ts
// src/lib/providers/cursor.ts:1437
function inferCursorRootFromSnapshot(filePath: string): string | undefined {
  const historyDir = path.dirname(path.dirname(path.dirname(filePath)));
  const rootDir = path.dirname(historyDir);
  return rootDir;
}
```

```ts
// src/app/api/sessions/route.ts:64-129
if (includeDebug) {
  const defaultCursorRoot = await resolveDefaultProviderRoot("cursor");
  const normalizedCursorRoot = await normalizeProviderRoot(
    result.resolvedPaths.cursor,
  );
  // ... compute cursorSessionCount, workspaceDirStatus, and cursorSqlErrors
  responseBody.debug = {
    defaultCursorRoot,
    normalizedCursorRoot,
    cursorSessionCount,
    cursorLoadErrors,
    workspaceDirStatus,
    workspaceEntries,
    cursorSqlErrors,
    cursorErrors: result.errors.filter((error) => error.provider === "cursor"),
    sources: result.sessions.reduce<Record<string, number>>(
      (acc, item) => ({ ...acc, [item.source]: (acc[item.source] ?? 0) + 1 }),
      {},
    ),
  };
}
```

```ts
// src/app/api/sessions/route.ts:10-12
import type { LoadSessionSummariesPayload } from "@/lib/session-loader/types";
import type { ChatSession } from "@/types/chat";
import type { ProviderImportError } from "@/types/providers";
```

```ts
// src/lib/providers/cursor.ts:608-659
const initSqlJs = require("sql.js") as unknown as (
  config?: SqlJsConfig,
) => Promise<SqlJsModule>;
const wasmPath = await resolveWasmPath();
const wasmDir = isUrl(wasmPath) ? undefined : path.dirname(wasmPath);
sqlModulePromise = initSqlJs({
  locateFile: (file: string) => {
    if (isUrl(wasmPath)) {
      return wasmPath;
    }
    const dir = wasmDir ?? path.dirname(wasmPath);
    return path.join(dir, file);
  },
});
```

## Self-Tests

- `pnpm test`
- Manual `curl`:
  - `curl -s -X POST http://localhost:3001/api/sessions --data '{"paths":{},"previousSignatures":{},"__debug":true}'`
  - `curl -s -X POST http://localhost:3001/api/sessions/detail --data '{"id":"<cursor-id>","paths":{"cursor":"/Users/geyunfei/Library/Application Support/Cursor"}}'`

## Risks & Follow-Up

- Debug payload is currently unprotected; consider guarding behind `NODE_ENV !== 'production'` or an auth gate.
- Should cache sql.js module resolution errors to avoid repeated log spam if the WASM path is truly missing.

## References

- `src/lib/providers/cursor.ts`
- `src/app/api/sessions/route.ts`
- `next.config.mjs`
- `README.md`, `README.zh.md`
- `tasks.md`
