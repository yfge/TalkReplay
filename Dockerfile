# syntax=docker/dockerfile:1.5

# Base stage
FROM node:18-alpine AS base
WORKDIR /app

# App paths (can be overridden via build args)
ARG NEXT_PUBLIC_CLAUDE_ROOT=/app/data/claude
ARG NEXT_PUBLIC_CODEX_ROOT=/app/data/codex
ARG NEXT_PUBLIC_GEMINI_ROOT=

# Environment
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

# Build stage (offline): rely on vendored node_modules, no package manager needed
FROM base AS build
# Copy source and local dependencies (node_modules must be present in build context)
COPY package.json ./
COPY next.config.mjs ./
COPY tsconfig.json ./
COPY tailwind.config.ts ./
COPY postcss.config.cjs ./
COPY public ./public
COPY src ./src
COPY node_modules ./node_modules

# Build using Next CLI directly (no pnpm/npm)
RUN node node_modules/next/dist/bin/next build

# Runtime stage: use standalone output to avoid runtime package manager
FROM node:18-alpine AS runner
WORKDIR /app

# Re-declare env to ensure clarity in the final image
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

# Non-root user and data dirs
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs && \
    mkdir -p /app/data/claude /app/data/codex && \
    chown -R nextjs:nodejs /app

# Copy standalone server and static assets from build stage
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

USER nextjs
EXPOSE 3000

# Start Next standalone server (no pnpm/npm at runtime)
CMD ["node", "server.js"]
