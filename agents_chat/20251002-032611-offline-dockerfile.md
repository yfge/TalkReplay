## Summary

Goal: Make Docker build/run offline-friendly and avoid any package-manager network calls. Updated Dockerfile to remove Corepack/pnpm usage, rely on vendored `node_modules`, enable Next.js `output: "standalone"`, and added a `.dockerignore` tuned for offline builds.

Context: A previous attempt to run with Corepack tried to download `pnpm` from the registry, which is blocked in the current environment. We need container builds and runtime that do not require network access.

Touched files:

- Dockerfile
- .dockerignore
- next.config.mjs
- tasks.md

Assumptions:

- The base image `node:18-alpine` is already present on the build host (no image pull).
- `node_modules/` exists in the build context and matches `pnpm-lock.yaml`.

## Code Highlights

Key Dockerfile changes (no Corepack/pnpm; build using local `node_modules`; standalone runtime):

```Dockerfile
# Base stage
FROM node:18-alpine AS base
WORKDIR /app
ARG NEXT_PUBLIC_CLAUDE_ROOT=/app/data/claude
ARG NEXT_PUBLIC_CODEX_ROOT=/app/data/codex
ARG NEXT_PUBLIC_GEMINI_ROOT=
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOST=0.0.0.0 \
    HUSKY=0 \
    NEXT_PUBLIC_CLAUDE_ROOT=${NEXT_PUBLIC_CLAUDE_ROOT} \
    NEXT_PUBLIC_CODEX_ROOT=${NEXT_PUBLIC_CODEX_ROOT} \
    NEXT_PUBLIC_GEMINI_ROOT=${NEXT_PUBLIC_GEMINI_ROOT} \
    CLAUDE_ROOT=${NEXT_PUBLIC_CLAUDE_ROOT} \
    CODEX_ROOT=${NEXT_PUBLIC_CODEX_ROOT} \
    GEMINI_ROOT=${NEXT_PUBLIC_GEMINI_ROOT}

# Build stage (offline)
FROM base AS build
COPY package.json ./
COPY next.config.mjs ./
COPY tsconfig.json ./
COPY tailwind.config.ts ./
COPY postcss.config.cjs ./
COPY public ./public
COPY src ./src
COPY node_modules ./node_modules
RUN node node_modules/next/dist/bin/next build

# Runtime stage (standalone)
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOST=0.0.0.0 HUSKY=0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs && \
    mkdir -p /app/data/claude /app/data/codex && chown -R nextjs:nodejs /app
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

Next.js config now uses standalone output:

```js
// next.config.mjs
export default {
  experimental: { typedRoutes: true },
  output: "standalone",
  webpack: (config) => {
    /* aliases */ return config;
  },
};
```

New `.dockerignore` keeps `node_modules` (critical for offline) and trims large/unneeded files:

```gitignore
.git
.DS_Store
.next
dist
coverage
*.log*
.pnpm-store
ui*.png
.vscode
.idea
# Note: do NOT ignore node_modules for offline builds
```

## Self-Tests

Prereqs (no network):

- `node:18-alpine` image already present locally.
- `node_modules/` populated locally and consistent with the lockfile.

Build:

- Command: `docker build -t talk-replay:offline .`
- Expected: Build completes without any network access; logs show Next build running via `node node_modules/next/dist/bin/next build`.

Run:

- Command: `docker run --rm -p 3000:3000 \
-v "$HOME/.claude/projects":/app/data/claude:ro \
-v "$HOME/.codex/sessions":/app/data/codex:ro \
talk-replay:offline`
- Expected: App starts on `http://localhost:3000` without package-manager installation. Conversations render using mounted directories.

Notes:

- If the base image is missing, Docker will try to pull it (network). Pre-pull or cache it beforehand.
- If `node_modules/` is absent or out-of-sync, build will fail. Refresh locally before offline build.

## Risks, Blockers, Follow-ups

- Risk: Larger Docker context due to bundling `node_modules`. Consider a two-step process: prefetch deps to an internal cache and sync into the build context when needed.
- Follow-up: Document an alternative "offline with store" path using `pnpm fetch` + `--offline` for environments that allow pre-caching but disallow live network.
- Follow-up: Add CI job to verify standalone build and image size envelopes (<200MB target once base + standalone trimming are tuned).

## References

- Dockerfile
- .dockerignore
- next.config.mjs
- docker-compose.yml
- tasks.md
