# syntax=docker/dockerfile:1.5

# Base stage
FROM node:18-alpine AS base
WORKDIR /app

# App paths (can be overridden via build args)
ARG NEXT_PUBLIC_CLAUDE_ROOT=/app/data/claude
ARG NEXT_PUBLIC_CODEX_ROOT=/app/data/codex
ARG NEXT_PUBLIC_GEMINI_ROOT=

# Environment
ENV NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOST=0.0.0.0 \
    HUSKY=0 \
    NEXT_PUBLIC_CLAUDE_ROOT=${NEXT_PUBLIC_CLAUDE_ROOT} \
    NEXT_PUBLIC_CODEX_ROOT=${NEXT_PUBLIC_CODEX_ROOT} \
    NEXT_PUBLIC_GEMINI_ROOT=${NEXT_PUBLIC_GEMINI_ROOT} \
    CLAUDE_ROOT=${NEXT_PUBLIC_CLAUDE_ROOT} \
    CODEX_ROOT=${NEXT_PUBLIC_CODEX_ROOT} \
    GEMINI_ROOT=${NEXT_PUBLIC_GEMINI_ROOT}

# Deps stage: install dependencies with pnpm (via Corepack)
FROM base AS deps
ENV NODE_ENV=development
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build stage: copy source and build
FROM deps AS build
ENV NODE_ENV=production
COPY . .
RUN pnpm build

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
