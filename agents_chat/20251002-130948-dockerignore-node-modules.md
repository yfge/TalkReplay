## Summary

Requested change: add `node_modules/` back to `.dockerignore` to reduce Docker build context size, while keeping the container image able to start without network access. Updated the Dockerfile to install deps in a dedicated build stage (using Corepack+pnpm) and retain the Next.js standalone runtime so the final image starts offline.

Touched files:

- .dockerignore
- Dockerfile

## Code Highlights

```diff
# .dockerignore
 + node_modules
 + .pnpm-store
```

```Dockerfile
FROM node:18-alpine AS base
...
FROM base AS deps
RUN corepack enable && corepack prepare pnpm@9.12.0 --activate
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM deps AS build
COPY . .
RUN pnpm build

FROM node:18-alpine AS runner
...
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
CMD ["node", "server.js"]
```

Rationale:

- Ignore `node_modules` in Docker context to avoid large transfers.
- Perform dependency installation inside the `deps` stage for reproducible builds (uses network during build only).
- Keep Next.js `output: "standalone"` so runtime does not depend on package managers or network.

## Self-Tests

Build (requires network to fetch dependencies):

- `docker build -t talk-replay:standalone .`
- Expect pnpm to install deps in `deps` stage, Next build to produce `.next/standalone`.

Run (no network required at runtime):

- `docker run --rm -p 3000:3000 talk-replay:standalone`
- Expect the app to start and serve on port 3000 without trying to install packages.

## Risks, Blockers, Follow-ups

- Build requires network access to the registry. If full offline build is required later, switch to pre-fetched store or vendored pnpm binary plus offline install.
- Confirm base image is cached locally in fully offline environments to prevent pulls.

## References

- Dockerfile
- .dockerignore
