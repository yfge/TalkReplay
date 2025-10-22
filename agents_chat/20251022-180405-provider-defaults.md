## Summary

- 调整服务器端 `resolvedPaths` 逻辑，确保在用户未配置路径时也返回各提供者的默认候选目录（含 Gemini 的 `~/.gemini/tmp`），方便前端设置页自动填充。
- 新增 `getDefaultProviderCandidates` 用于集中维护默认路径集合，并在 `loadSessionsOnServer` 中统一应用回退策略。
- 保持现有解析与签名缓存流程不变，仅补充缺省路径提示。

涉及文件：`src/lib/session-loader/server.ts`.

## Code Highlights

```ts
const defaults = getDefaultProviderCandidates("gemini");
const suggestion = defaults.find(Boolean);
if (suggestion) {
  resolvedPaths.gemini = suggestion;
}
```

```ts
function getDefaultProviderCandidates(provider: ProviderId): string[] {
  if (provider === "gemini") {
    candidates.push(join(home, ".gemini", "tmp"));
    candidates.push(join(home, ".gemini", "logs"));
    candidates.push(join(home, ".gemini", "sessions"));
  }
  const dockerPath = `/app/data/${provider === "claude" ? "claude" : provider}`;
  candidates.push(dockerPath);
  return candidates;
}
```

## Self-Tests

- `pnpm lint`（预期：通过；实际：通过）
- `pnpm test`（预期：12 个测试文件全部通过；实际：通过）

## Risks & Follow-up

- 目前默认候选列表顺序依赖平台启发式，后续如需支持自定义优先级可在设置页提供切换。
