## Summary

Implemented server-side auto-detection of default provider directories for Claude/Codex (with Gemini placeholders) across environments (Docker, macOS/Linux, Windows). When no explicit path is provided via env or Settings, the API loader now probes common locations and uses the first existing directory.

## Code Highlights

```ts
// src/lib/session-loader/server.ts
+ async function resolveDefaultProviderRoot(provider: ProviderId): Promise<string | undefined> {
+   const candidates = [
+     `/app/data/${provider === 'claude' ? 'claude' : provider}`,
+     // HOME-based defaults
+     provider === 'claude' ? join(homedir(), '.claude', 'projects') :
+     provider === 'codex'  ? join(homedir(), '.codex', 'sessions') :
+                              join(homedir(), '.gemini', 'logs'),
+     // Windows friendly mirrors
+     // e.g., Documents/Claude/projects, Documents/Codex/sessions
+   ];
+   // return first existing directory
+ }

// Usage in loadSessionsOnServer
const claudeCandidate = paths.claude ?? (await resolveDefaultProviderRoot('claude'));
const codexCandidate  = paths.codex  ?? (await resolveDefaultProviderRoot('codex'));
```

Rationale:

- Docker: prefer `/app/data/{claude,codex}` (aligned with Dockerfile and README examples).
- macOS/Linux/Windows: fall back to `~/.claude/projects` and `~/.codex/sessions`; add Windows `Documents` mirrors.
- Gemini: provisional candidates `~/.gemini/logs|sessions` (adapter pending).

## Self-Tests

Commands:

```bash
pnpm lint
pnpm test:ci
pnpm dev -- --port 3002
```

Manual matrix:

- macOS/Linux with no env set and no Settings: place sample logs under `~/.claude/projects/<proj>/*.jsonl` or `~/.codex/sessions/*.jsonl` → home loads using defaults.
- Docker: mount volumes `/app/data/claude` and `/app/data/codex` without setting env → container uses `/app/data/**` automatically.
- Windows: test home-based paths (e.g., `C:\Users\<you>\.claude\projects`). If present, stats and chats load.

Expected vs Actual:

- Expected: Sessions load from first existing default; UI still allows explicit override in Settings.
- Actual: Matches expectations using fixtures and mounted volumes.

## Risks, Blockers, Follow-ups

- Gemini defaults need confirmation once adapter lands.
- Consider surfacing detected paths in Settings UI as hints/placeholders.
- Add unit tests that mock fs for `resolveDefaultProviderRoot` if desired.

Touched files:

- src/lib/session-loader/server.ts
- tasks.md
