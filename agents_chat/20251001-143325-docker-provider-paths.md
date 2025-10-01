## Summary

- Aligned Docker runtime and Next.js client defaults so that provider directories auto-populate when the container starts, resolving the empty setup prompt the user reported.
- Added runtime fallbacks in `src/config/providerPaths.ts` so server-only `CLAUDE_ROOT` / `CODEX_ROOT` variables also seed the UI when `NEXT_PUBLIC_*` is absent.
- Updated project docs/tasks to clarify the new Docker behaviour.

## Code Highlights

```ts
// src/config/providerPaths.ts
const DEFAULT_CONFIG: ProviderPaths = {
  claude: normalise(process.env.NEXT_PUBLIC_CLAUDE_ROOT ?? runtimeClaudeRoot),
  codex: normalise(process.env.NEXT_PUBLIC_CODEX_ROOT ?? runtimeCodexRoot),
  gemini: normalise(process.env.NEXT_PUBLIC_GEMINI_ROOT ?? runtimeGeminiRoot),
};
```

```dockerfile
# Dockerfile
ARG NEXT_PUBLIC_CLAUDE_ROOT=/app/data/claude
ENV NEXT_PUBLIC_CLAUDE_ROOT=${NEXT_PUBLIC_CLAUDE_ROOT}
ENV CLAUDE_ROOT=${NEXT_PUBLIC_CLAUDE_ROOT}
```

```yaml
# docker-compose.yml
args:
  NEXT_PUBLIC_CLAUDE_ROOT: /app/data/claude
---
NEXT_PUBLIC_CLAUDE_ROOT: /app/data/claude
```

## Self-Tests

- `pnpm test -- --runInBand`
  - Fails (`Unknown option --runInBand`); reran without the flag per Vitest CLI expectations.
- `pnpm lint`
- `pnpm test`
- `pnpm build`
  - All succeeding commands completed successfully.

## Risks / Follow-ups

- None identified; confirm in-browser that persisted localStorage picks up new defaults after clearing older state if residual configuration remains.
- Future providers (Gemini) should add matching env defaults when adapter ships.

## References

- Dockerfile
- docker-compose.yml
- README.md
- src/config/providerPaths.ts
- tasks.md
