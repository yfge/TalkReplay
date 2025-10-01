# Agents Chat Viewer

A cross-platform web application for inspecting Claude and Codex chat transcripts. Built with React, TypeScript, Tailwind CSS, and shadcn/ui.

## Quick Start

```sh
pnpm install
pnpm dev
```

The dev server runs on [http://localhost:5173](http://localhost:5173).

## Available Scripts

- `pnpm dev` – start Vite in development mode
- `pnpm build` – type-check and create a production build
- `pnpm preview` – preview the production build locally
- `pnpm lint` – run ESLint across the project
- `pnpm test` – execute unit tests with Vitest
- `pnpm format` – validate formatting via Prettier

## Project Structure

```
├── agents.md               # Specification for the project
├── agents_chat/            # AI collaboration logs (see policy)
├── src/                    # Application source code
├── public/                 # Static assets
├── tailwind.config.ts      # Tailwind configuration with shadcn tokens
└── vite.config.ts          # Vite + Vitest configuration
```

## agents_chat Policy

- Add a new record for every AI-assisted change in `agents_chat/YYYYMMDD-HHMMSS-topic.md`.
- Include summary, code highlights (paths), self-tests, and follow-up actions.
- Hook scripts enforce the presence and structure of these records on each commit.

## Docker

Docker configuration will be added in a subsequent iteration. The initial commit focuses on the application scaffold and tooling.

## License

MIT

## Environment Configuration

Set optional provider root paths via `.env` file (mirrored in `import.meta.env`):

```bash
VITE_CLAUDE_ROOT=/path/to/claude/logs
VITE_CODEX_ROOT=/path/to/codex/logs
VITE_GEMINI_ROOT=/path/to/gemini/logs
```

These defaults are read by `getProviderPaths()` in `src/config/providerPaths.ts`.

## Browser File Access

See `docs/browser-file-access.md` for the comparison of supported mechanisms and fallbacks.
