## Summary

Documented automatic default provider paths in the README, including Docker, macOS/Linux, and Windows conventions, plus precedence rules (Settings > Env > Auto-detect). This complements the server-side default detection recently added.

## Code Highlights

```md
// README.md

- Added "Automatic Defaults (No Settings/Env)" section under Provider Roots & Configuration
- Listed defaults:
  - Claude: /app/data/claude, ~/.claude/projects, Windows equivalents
  - Codex: /app/data/codex, ~/.codex/sessions, Windows equivalents
  - Gemini: ~/.gemini/logs|sessions (tentative)
- Added precedence: Settings > Env > Auto-detect
```

## Self-Tests

- Render README locally and skim the Provider Roots section for clarity.
- Cross-check defaults against server implementation in `src/lib/session-loader/server.ts`.
- Verify Docker examples still match defaults.

Expected vs Actual:

- Expected: Clear guidance on implicit defaults; Actual: README reflects current behavior.

## Risks, Blockers, Follow-ups

- Gemini path is tentative; update docs when adapter finalizes.
