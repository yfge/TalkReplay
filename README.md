# TalkReplay

TalkReplay is a vibe coding companion that turns your Claude and Codex transcripts into an interactive replay. It helps you revisit pairing sessions, capture insights, and share polished summaries with teammates.

- **Languages:** [English](README.md) · [中文说明](README.zh.md)
- **Tech stack:** Next.js 14 (App Router) · React · TypeScript · Tailwind CSS · shadcn/ui · Zustand · React Query
- **Providers:** Claude (`~/.claude/projects`), Codex (`~/.codex/sessions`), Cursor (`~/Library/Application Support/Cursor` on macOS), Gemini (`~/.gemini/logs`)
- **Deployment targets:** macOS, Windows, Docker, optional browser-only imports
- **Workflow:** Opinionated vibe-coding blueprint featuring timestamped `agents_chat/` logs, `tasks.md` milestones, and Husky-enforced quality gates

## Why TalkReplay?

Vibe coding thrives on fast feedback loops. TalkReplay preserves that energy by:

- Ingesting local Claude/Codex sessions via pluggable adapters and a lightweight Node API
- Normalising timestamps/messages with provider metadata for consistent search and filters
- Providing a dual-pane explorer: session list on the left, detailed conversation on the right
- Tracking starred sessions, keyword filters, date ranges, and incremental refresh signatures
- Recording every collaboration round in `agents_chat/` and enforcing hooks for reproducibility
- Demonstrating a vibe coding workflow end-to-end so you can mirror the structure in other projects

## Vibe Coding Workflow

TalkReplay doubles as a living reference implementation for vibe coding teams:

- `agents_chat/` captures each AI pairing session using timestamped Markdown that logs prompts, decisions, code excerpts, and self-tests.
- Husky `pre-commit` hook blocks commits unless a new log is staged and `pnpm lint` / `pnpm test` pass, preserving replayable histories.
- `tasks.md` tracks milestone checklists so incremental commits stay aligned with the agreed plan.
- Shared specs (`agents.md`, `docs/`) keep collaboration guardrails co-located with the codebase.

## Interface Preview

![TalkReplay Home (latest)](./docs/assets/home-updated.png)

![TalkReplay Chat Detail (inline images)](./docs/assets/detail-inline-images.png)

![TalkReplay Chat Detail (variant)](./docs/assets/detail-inline-images-alt.png)

### More Screens

![Settings – Provider Paths](./docs/assets/provider-setup.png)

![Previous Home](./docs/assets/app-home.png)

![Previous Chat Detail](./docs/assets/chat-detail.png)

## Getting Started (Local Dev)

```bash
pnpm install
pnpm dev -- --port 3002
```

Key scripts:

- `pnpm lint` – ESLint with Tailwind ordering
- `pnpm test` – Vitest + React Testing Library
- `pnpm build` – Next.js production build
- `pnpm format:fix` – Prettier write mode

On first run, open Settings to configure provider directories (Claude/Codex/Cursor/Gemini). If you skip this, the app uses environment variables or automatic defaults (see below). Preferences persist via a safe localStorage wrapper that falls back to an in-memory store when quotas are exceeded.

## Provider Roots & Configuration

Environment variables drive autodiscovery (defaults by OS):

```bash
NEXT_PUBLIC_CLAUDE_ROOT=/Users/you/.claude/projects   # macOS/Linux default
NEXT_PUBLIC_CODEX_ROOT=/Users/you/.codex/sessions     # macOS/Linux default
NEXT_PUBLIC_CURSOR_ROOT="/Users/you/Library/Application Support/Cursor" # macOS default
NEXT_PUBLIC_GEMINI_ROOT=/path/to/gemini/logs # optional
```

Windows paths

```
# PowerShell
$env:CLAUDE_ROOT="C:\\Users\\<you>\\.claude\\projects"
$env:CODEX_ROOT="C:\\Users\\<you>\\.codex\\sessions"
$env:CURSOR_ROOT="C:\\Users\\<you>\\AppData\\Roaming\\Cursor"
$env:NEXT_PUBLIC_CLAUDE_ROOT=$env:CLAUDE_ROOT
$env:NEXT_PUBLIC_CODEX_ROOT=$env:CODEX_ROOT
$env:NEXT_PUBLIC_CURSOR_ROOT=$env:CURSOR_ROOT

# Cmd
set CLAUDE_ROOT=C:\Users\<you>\.claude\projects
set CODEX_ROOT=C:\Users\<you>\.codex\sessions
set CURSOR_ROOT=C:\Users\<you>\AppData\Roaming\Cursor
set NEXT_PUBLIC_CLAUDE_ROOT=%CLAUDE_ROOT%
set NEXT_PUBLIC_CODEX_ROOT=%CODEX_ROOT%
set NEXT_PUBLIC_CURSOR_ROOT=%CURSOR_ROOT%
```

Linux/macOS paths

```bash
export CLAUDE_ROOT="$HOME/.claude/projects"
export CODEX_ROOT="$HOME/.codex/sessions"
export CURSOR_ROOT="$HOME/.config/Cursor"
export NEXT_PUBLIC_CLAUDE_ROOT="$CLAUDE_ROOT"
export NEXT_PUBLIC_CODEX_ROOT="$CODEX_ROOT"
export NEXT_PUBLIC_CURSOR_ROOT="$CURSOR_ROOT"
```

WSL2 note: use `/mnt/c/Users/<you>/.claude/projects` and `/mnt/c/Users/<you>/.codex/sessions` when launching Docker from WSL.

Server-side fallbacks honour `CLAUDE_ROOT`, `CODEX_ROOT`, `CURSOR_ROOT`, and `GEMINI_ROOT`. See `src/config/providerPaths.ts` for normalisation logic.

### Automatic Defaults (No Settings/Env)

When neither Settings nor environment variables provide explicit paths, the server attempts to auto-detect provider roots from common locations. The first existing directory in the list below is used per provider.

- Claude defaults
  - Docker: `/app/data/claude`
  - macOS/Linux: `~/.claude/projects`
  - Windows: `C:\Users\<you>\.claude\projects` (also tries `~/Documents/Claude/projects`)
- Codex defaults
  - Docker: `/app/data/codex`
  - macOS/Linux: `~/.codex/sessions`
  - Windows: `C:\Users\<you>\.codex\sessions` (also tries `~/Documents/Codex/sessions`)
- Cursor defaults
  - macOS: `~/Library/Application Support/Cursor`
  - Linux: `~/.config/Cursor`
  - Windows: `C:\Users\<you>\AppData\Roaming\Cursor`
  - Docker: `/app/data/cursor`
- Gemini (tentative; subject to change)
  - macOS/Linux: `~/.gemini/logs` or `~/.gemini/sessions`

Precedence

1. Settings (in-app) > 2. Environment variables (`NEXT_PUBLIC_*` for UI, `CLAUDE_ROOT`/`CODEX_ROOT`/`GEMINI_ROOT` for server) > 3. Automatic defaults

These defaults align with the Docker image’s volume layout and common CLI storage conventions, so most users can simply mount their local logs or let the app pick them up from `~`.

### Transcript Pipeline

- Provider ingestion lives under `src/lib/providers/`; adapters share a unified message schema in `src/types/chat.ts`.
- Incremental import signatures prevent reprocessing unchanged files while surfacing parser errors in the UI.
- Sample data in `fixtures/` mirrors real directory layouts for Claude, Codex (Cursor coming soon), enabling offline demos.

## Production Deployment

### Option 1: Docker + Volume Mounts

Build and run the production bundle inside Docker:

```bash
docker build -t talk-replay .
docker run \
  -p 3000:3000 \
  -e NEXT_PUBLIC_CLAUDE_ROOT=/app/data/claude \
  -e NEXT_PUBLIC_CODEX_ROOT=/app/data/codex \
  -e NEXT_PUBLIC_CURSOR_ROOT=/app/data/cursor \
  -e CLAUDE_ROOT=/app/data/claude \
  -e CODEX_ROOT=/app/data/codex \
  -e CURSOR_ROOT=/app/data/cursor \
  -v "$HOME/.claude/projects":/app/data/claude:ro \
  -v "$HOME/.codex/sessions":/app/data/codex:ro \
  -v "$HOME/Library/Application Support/Cursor":/app/data/cursor:ro \
  talk-replay
```

Windows PowerShell

```powershell
docker run `
  -p 3000:3000 `
  -e NEXT_PUBLIC_CLAUDE_ROOT=/app/data/claude `
  -e NEXT_PUBLIC_CODEX_ROOT=/app/data/codex `
  -e NEXT_PUBLIC_CURSOR_ROOT=/app/data/cursor `
  -e CLAUDE_ROOT=/app/data/claude `
  -e CODEX_ROOT=/app/data/codex `
  -e CURSOR_ROOT=/app/data/cursor `
  -v C:\Users\<you>\.claude\projects:/app/data/claude:ro `
  -v C:\Users\<you>\.codex\sessions:/app/data/codex:ro `
  -v C:\Users\<you>\AppData\Roaming\Cursor:/app/data/cursor:ro `
  talk-replay
```

WSL2 (from the Ubuntu shell)

```bash
docker run \
  -p 3000:3000 \
  -e NEXT_PUBLIC_CLAUDE_ROOT=/app/data/claude \
  -e NEXT_PUBLIC_CODEX_ROOT=/app/data/codex \
  -e NEXT_PUBLIC_CURSOR_ROOT=/app/data/cursor \
  -e CLAUDE_ROOT=/app/data/claude \
  -e CODEX_ROOT=/app/data/codex \
  -e CURSOR_ROOT=/app/data/cursor \
  -v /mnt/c/Users/<you>/.claude/projects:/app/data/claude:ro \
  -v /mnt/c/Users/<you>/.codex/sessions:/app/data/codex:ro \
  -v /mnt/c/Users/<you>/AppData/Roaming/Cursor:/app/data/cursor:ro \
  talk-replay
```

Or use docker-compose:

```bash
CLAUDE_LOGS_PATH="$HOME/.claude/projects" \
CODEX_LOGS_PATH="$HOME/.codex/sessions" \
CURSOR_LOGS_PATH="$HOME/Library/Application Support/Cursor" \
APP_PORT=3000 \
docker compose up --build
```

To demo bundled fixtures instead, set `CLAUDE_LOGS_PATH=./fixtures/claude` and `CODEX_LOGS_PATH=./fixtures/codex` before running compose. The container sets both runtime and `NEXT_PUBLIC_*` env variables so the UI skips manual setup.

Windows compose (PowerShell)

```powershell
$env:CLAUDE_LOGS_PATH="C:\\Users\\<you>\\.claude\\projects";
$env:CODEX_LOGS_PATH="C:\\Users\\<you>\\.codex\\sessions";
$env:CURSOR_LOGS_PATH="C:\\Users\\<you>\\AppData\\Roaming\\Cursor";
$env:APP_PORT=3000;
docker compose up --build
```

Containers can only see paths mounted into the filesystem above. Open Settings
to confirm the mapped `/app/data/**` directories once the container is running; host-only paths will not
resolve inside Docker without the volume bindings shown here.

### Option 2: Local Build + Host Paths

If you prefer to run the production server directly on the host, build once and then launch with
provider paths pointing to your local transcripts:

```bash
pnpm build
CLAUDE_ROOT="$HOME/.claude/projects" \
CODEX_ROOT="$HOME/.codex/sessions" \
NEXT_PUBLIC_CLAUDE_ROOT="$CLAUDE_ROOT" \
NEXT_PUBLIC_CODEX_ROOT="$CODEX_ROOT" \
pnpm start
```

On Windows PowerShell:

```powershell
pnpm build
$env:CLAUDE_ROOT="C:\\Users\\<you>\\.claude\\projects"
$env:CODEX_ROOT="C:\\Users\\<you>\\.codex\\sessions"
$env:NEXT_PUBLIC_CLAUDE_ROOT=$env:CLAUDE_ROOT
$env:NEXT_PUBLIC_CODEX_ROOT=$env:CODEX_ROOT
pnpm start
```

Alternatively, leverage the standalone output (`next.config.mjs` sets `output: "standalone"`) and
run it with Node directly. Ensure the `.next/standalone`, `.next/static`, and `public` folders stay
side-by-side so asset paths resolve correctly:

```bash
pnpm build
CLAUDE_ROOT="$HOME/.claude/projects" \
CODEX_ROOT="$HOME/.codex/sessions" \
NEXT_PUBLIC_CLAUDE_ROOT="$CLAUDE_ROOT" \
NEXT_PUBLIC_CODEX_ROOT="$CODEX_ROOT" \
PORT=3000 \
NODE_ENV=production \
node .next/standalone/server.js
```

Windows PowerShell:

```powershell
pnpm build
$env:CLAUDE_ROOT="C:\\Users\\<you>\\.claude\\projects"
$env:CODEX_ROOT="C:\\Users\\<you>\\.codex\\sessions"
$env:NEXT_PUBLIC_CLAUDE_ROOT=$env:CLAUDE_ROOT
$env:NEXT_PUBLIC_CODEX_ROOT=$env:CODEX_ROOT
$env:PORT=3000
$env:NODE_ENV="production"
node .next/standalone/server.js
```

Adjust the paths if you store transcripts elsewhere. When running directly on the host, you can also
skip the environment variables and use the Settings page to point to any readable directory on demand;
the env vars simply provide sensible defaults that mirror the Docker layout.

## Testing & Quality Gates

- Husky pre-commit hook runs `pnpm lint`, `pnpm test`, and verifies `agents_chat` compliance
- Vitest integration covers `/api/sessions` and `/api/sessions/detail`
- Storybook is planned for core UI components; Playwright smoke tests are optional but recommended

## Documentation & Roadmap

- `tasks.md` – milestone tracking (Milestone 1 focuses on local replay, Milestone 2 on shared backend)
- `docs/browser-file-access.md` – browser capabilities for local imports
- `agents.md` – collaboration rules for vibe coding workflows
- `README.zh.md` – Chinese overview for bilingual teams

Future enhancements: Gemini support, virtualised lists, keyboard shortcuts, collaborative backend, and export tooling.

## License

[MIT](LICENSE)
