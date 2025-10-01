# Agents Chat Viewer

A cross-platform web application for inspecting Claude and Codex chat transcripts. Built with Next.js (App Router), React, TypeScript, Tailwind CSS, and shadcn/ui.

## Quick Start

```sh
# Requires pnpm 9+
pnpm install
pnpm dev
```

The dev server runs on [http://localhost:3000](http://localhost:3000).

## Browser Support & Limitations

- Chromium-based browsers (Chrome, Edge, Arc) provide the best experience with directory pickers and drag-and-drop ingestion.
- Safari and Firefox currently require manual file selection; File System Access APIs are gated or unavailable.
- When running without the Next.js server (e.g., static export), the UI falls back to bundled sample data because real provider directories are only accessible via the `/api/sessions` endpoint.

## Available Scripts

- `pnpm dev` – start the Next.js development server
- `pnpm build` – create an optimized production build
- `pnpm start` – serve the production build locally
- `pnpm lint` – run ESLint across the project
- `pnpm test` – execute unit tests with Vitest
- `pnpm typecheck` – run TypeScript in no-emit mode
- `pnpm format` – validate formatting via Prettier

## Project Structure

```
├── agents.md               # Specification for the project
├── agents_chat/            # AI collaboration logs (see policy)
├── src/                    # Application source code
├── public/                 # Static assets
├── next.config.mjs         # Next.js configuration and webpack aliases
├── tailwind.config.ts      # Tailwind configuration with shadcn tokens
├── vitest.config.ts        # Vitest configuration (React + alias support)
└── src/app/                # Next.js App Router entrypoints
```

## agents_chat Policy

- Add a new record for every AI-assisted change in `agents_chat/YYYYMMDD-HHMMSS-topic.md`.
- Include summary, code highlights (paths), self-tests, and follow-up actions.
- Hook scripts enforce the presence and structure of these records on each commit.

## Docker

The repository ships with a multi-stage `Dockerfile` and a `docker-compose.yml` to run the production build without installing Node.js locally.

### Build & run with Docker

```bash
docker build -t agents-chat-viewer .
docker run \
  -p 3000:3000 \
  -e CLAUDE_ROOT=/app/data/claude \
  -e CODEX_ROOT=/app/data/codex \
  -v "$HOME/.claude/projects":/app/data/claude:ro \
  -v "$HOME/.codex/sessions":/app/data/codex:ro \
  agents-chat-viewer
```

### Using docker-compose

`docker-compose.yml` provides the same container with convenient volume bindings. By default it mounts `${HOME}/.claude/projects` and `${HOME}/.codex/sessions`; override the host paths through environment variables when needed:

```bash
CLAUDE_LOGS_PATH="$HOME/.claude/projects" \
CODEX_LOGS_PATH="$HOME/.codex/sessions" \
APP_PORT=3000 \
docker compose up --build
```

By default the compose file mounts `./fixtures/claude` and `./fixtures/codex`, allowing the container to start with bundled sample transcripts. Map the variables above to your real log directories to inspect live data.

## License

MIT

## Environment Configuration

Set optional provider root paths via `.env` file (mirrored in `process.env.NEXT_PUBLIC_*`):

```bash
NEXT_PUBLIC_CLAUDE_ROOT=/path/to/claude/logs
NEXT_PUBLIC_CODEX_ROOT=/path/to/codex/logs
NEXT_PUBLIC_GEMINI_ROOT=/path/to/gemini/logs
```

These defaults are read by `getProviderPaths()` in `src/config/providerPaths.ts` and passed to the server-side loader exposed via `/api/sessions`.

## Browser File Access

See `docs/browser-file-access.md` for the comparison of supported mechanisms and fallbacks.
