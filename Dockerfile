# syntax=docker/dockerfile:1.5

FROM node:18-alpine AS base
WORKDIR /app
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN apk add --no-cache curl && corepack enable && corepack prepare pnpm@8 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

FROM deps AS production-deps
RUN pnpm prune --prod

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
ENV CLAUDE_ROOT=/app/data/claude
ENV CODEX_ROOT=/app/data/codex

RUN apk add --no-cache curl && corepack enable && corepack prepare pnpm@8 --activate
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
RUN mkdir -p /app/data/claude /app/data/codex && chown -R nextjs:nodejs /app

COPY --from=production-deps /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs
COPY --from=build /app/public ./public
COPY --from=build /app/.next ./.next

USER nextjs
EXPOSE 3000
CMD ["pnpm", "start"]
