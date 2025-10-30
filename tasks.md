# Project Task Plan

## Milestone 0 – Spec Alignment & Decisions

Context: The current app is built on Next.js 14 (App Router) with Vitest for tests, Tailwind, Radix primitives, and shadcn-style components. The original spec mentions Vite; we will keep Next.js for the integrated API/filesystem access and document SSR considerations. A Vite migration remains optional.

- [x] Document decision to keep Next.js for now and why. _(2025-10-20: Added to README and this plan.)_
- [ ] Evaluate Vite migration feasibility (benefits vs. effort); record decision in `docs/architecture.md`.
- [ ] Document SSR/ISR considerations and static export trade-offs.

## Milestone 1.A – Schema-Based Log Normalisation

Goal: Drive Claude & Codex parsing from JSON Schemas so tool calls/results land in a consistent UI with minimal provider-specific logic.

### A1. Fixtures & Source Analysis

- [x] Refresh anonymised fixtures under `fixtures/{claude,codex}` covering current event types (tool*use/tool_result, item.\* events, response_item variants). *(2025-10-15: Added schema-aligned Claude/Codex logs with command*execution, reasoning, and error cases.)*
- [x] Document key field mappings and schema coverage notes in `docs/data-sources.md`. _(2025-10-14: Recorded Codex and Claude schema variants in `docs/data-sources.md`.)_

### A2. Schema Layer

- [x] Author JSON Schemas for Claude tool events (`tool_use`, `tool_result`, `text`) and Codex events (`item.started/updated/completed`, `response_item`, `function_call`, `function_call_output`). _(2025-10-14: Added `claude/message.*` mappings alongside Codex coverage.)_
- [x] Build an Ajv-based validator/normaliser that consumes schema + mapping definitions to emit `ChatMessage` objects. _(2025-10-14: `normalise()` now drives Codex & Claude providers behind the schema flag.)_
- [x] Implement reusable transforms (ISO timestamps, exitCode/duration extraction, diff parsing, toolType inference, stdout/stderr capture). _(2025-10-14: Added join-text-array, append-suffix, and nested property extraction for Codex schemas.)_
- [x] Document schema versioning, contribution workflow, and testing expectations. _(2025-10-15: Added `docs/schema-contribution.md` and cross-linked from `docs/data-sources.md`.)_

### A3. Adapter Migration & Tests

- [x] Wire Codex adapter to the schema normaliser for tool events with a controlled fallback path. _(2025-10-14: Provider switches to schema mappings when `NEXT_PUBLIC_SCHEMA_NORMALISER=1`.)_
- [x] _Update (2025-10-14): Codex session topic now prefers the user prompt preceding the first assistant message (including reasoning/tool preambles) to match UX expectations._ _(2025-10-14: Covered by schema-mode tests.)_
- [x] Wire Claude adapter to the same pipeline (`tool_use`/`tool_result`/`text`) while preserving raw payloads for audit. _(2025-10-14: Adapter emits schema-derived messages when `NEXT_PUBLIC_SCHEMA_NORMALISER=1`, with legacy fallback.)_
- [x] Add unit/snapshot tests that validate + normalise fixtures through the schema layer and guard regressions. _(2025-10-14: Added `src/schema/providers/codex/mappings.test.ts` to exercise new mappings.)_
- [ ] Benchmark parsing performance on large logs and record baseline metrics. _(Deferred: lightweight benchmarking approach TBD after settling on toolchain.)_

### A4. Structured Tool Call UI

- [x] Support pagination for long conversation lists (client-side pager in ChatList). _(2025-10-20: Added page controls in `src/components/chats/chat-list.tsx`.)_
- [ ] Add virtualisation for extra-large lists (e.g., `@tanstack/react-virtual`).
- [x] Add page-size selector (10/20/50/100) to ChatList pager. _(2025-10-20.)_
- [ ] Implement fast navigation affordances (keyboard shortcuts, breadcrumbs, recent sessions).
- [ ] Enhance ToolCallCard diff navigation (previous/next hunk indicators, keyboard bindings).

### 1.B – UI & Interaction

Goal: Deliver the core SPA shell, responsive layouts, and conversation ergonomics.

- [x] App shell with sidebar (filters), main list, and toolbar. _(2025-10-13: `AppShell`, `ChatSidebar`, `ChatList` landed.)_
- [x] Route `/chats/[id]` for full-page detail view. _(2025-10-13: `src/app/chats/[id]/page.tsx`.)_
- [x] Theming (light/dark) and locale switch. _(2025-10-13: `ThemeProvider`, `ThemeToggle`, i18n providers.)_
- [x] Search, source filters, starred toggle, date range, project filter. _(2025-10-13: `useFilteredSessionSummaries` + `ChatSidebar` controls.)_
- [x] Collapsible long outputs and tool-call/result pairing with diff jump. _(2025-10-13: `ToolCallCard`, collapse toggles, next-diff action.)_
- [x] Add `/stats` page: basic counts by project/provider using `POST /api/projects`. _(2025-10-20: Implemented `src/app/stats/page.tsx` with search, totals, and project filter handoff.)_
- [x] Add header navigation entry to `/stats`. _(2025-10-20: AppShell button linking to `/stats`.)_
- [x] Add header navigation entry to `/settings`. _(2025-10-20: AppShell button linking to `/settings`.)_
- [x] Add `/settings` page: surface provider path config + theme/locale. _(2025-10-20: Implemented `src/app/settings/page.tsx` with provider paths form, validation, Theme/Locale toggles.)_
- [x] Hydrate settings form with resolved provider roots after session load so defaults surface automatically. _(2025-10-21: `loadSessionsOnServer` now returns `resolvedPaths`; client hydrates store via `hydrateProviderPaths`.)_
- [x] Remove provider setup dialog; move configuration to Settings. _(2025-10-20: Deleted `src/components/preferences/provider-setup-dialog.tsx`; header uses Settings.)_
- [ ] Virtualise long lists (e.g. `@tanstack/react-virtual`) in `ChatList`.
- [ ] Keyword highlighting within conversation view (respect current filters).
- [ ] Keyboard navigation: list up/down, open detail, next/prev diff bindings; document shortcuts.
- [ ] Accessibility pass: labels, contrast, focus rings, and tab order review; track fixes.

### 1.C – Ingestion & Provider Setup

Goal: Robust local import via server routes and in‑browser import with clear errors.

- [x] Filesystem ingestion with provider roots from env/UI. _(2025-10-13: `src/app/api/sessions`, server loader normalises paths.)_
- [x] Browser import via file selector + Web Worker. _(2025-10-13: `parseFile`, `parser.worker.ts`.)_
- [x] Error surfacing: banner for import errors and retry on detail. _(2025-10-13: `App.tsx` + `ChatDetail`.)_
- [x] Timestamp normalisation to ISO 8601 in adapters. _(2025-10-13: provider utilities.)_
- [x] Docker defaults map to `/app/data/{claude,codex}`; UI respects `NEXT_PUBLIC_*` env. _(2025-10-10: Dockerfile, provider paths.)_
- [x] Server-side auto-detect defaults for provider roots across OS (HOME-based + Docker path). _(2025-10-20: `loadSessionsOnServer` probes common paths for Claude/Codex; Gemini placeholder.)_
- [x] Add Gemini adapter parity once sample logs are ready. _(2025-10-22: Implemented `src/lib/providers/gemini.ts`, API wiring, tests, and default path detection.)_
- [ ] Research Cursor log format and collect anonymised fixtures; capture schema differences.
- [ ] Extend schema normaliser + adapters to support Cursor provider (`CURSOR_ROOT`) with tests covering tool/run events.
- [ ] Auto-detect default Cursor workspace path (macOS `~/Library/Application Support/Cursor`, Windows roaming profile) and expose override in settings.
- [ ] Update docs (`docs/data-sources.md`, README) and UI copy to reference Cursor ingestion and configuration.

### 1.D – Quality Gates, Hooks, Testing

Goal: Enforce reproducibility and ≥80% coverage with fast local feedback.

- [x] Husky `pre-commit`: require `agents_chat` record, validate sections, block unstaged changes, run `pnpm lint` + `pnpm test`. _(2025-10-02: `.husky/pre-commit`.)_
- [x] CI mirrors lint, tests, and build on pushes/PRs. _(2025-10-03: `.github/workflows/ci.yml`.)_
- [ ] Add `commitlint` + `husky commit-msg` to enforce Conventional Commits.
- [ ] Add `pre-push` hook to re-run integration/E2E (when defined).
- [ ] Introduce Storybook for core components (`button`, `ToolCallCard`, `ChatList`); add smoke stories.
- [ ] Add Stylelint config and wire into hooks/CI.
- [ ] Enforce coverage ≥80% (configure thresholds in Vitest) and backfill tests for parsing edge cases.

### 1.E – Packaging & Deployment

Goal: Multi-stage Docker targeting <200MB; clear runbooks for macOS/Windows/Docker.

- [x] Multi-stage Docker build on `node:18-alpine` using Next standalone output. _(2025-10-10: `Dockerfile`.)_
- [x] `.dockerignore` tuned to reduce context size. _(2025-10-02.)_
- [x] README documents Docker and host runtime flows (envs, volumes, Windows/WSL notes). _(2025-10-13.)_
- [x] Release workflow: auto-draft version PR + Docker publish on release. _(2025-10-22: revamped `prepare-release.yml`, `build-on-release.yml`, added docs.)_
- [ ] Measure image size in CI; document size and optimise if >200MB (alpine libc, prune locales, strip dev deps from standalone if needed).
- [ ] Optional NGINX/alpine scratch serving of static assets, document trade-offs.

## Milestone 2 – Collaborative Server Platform

Goal: Introduce a backend service that aggregates shared directories from team members, enabling collaborative browsing while preserving the frontend UX.

### 1. Backend Architecture & Infrastructure

- [ ] Select backend stack (e.g., Node + Fastify/Express) and persistence layer (PostgreSQL/SQLite).
- [ ] Define API contract for provider sync (manifests, diff updates, attachments).
- [ ] Implement authentication/authorisation with RBAC for directories.
- [ ] Set up background jobs for periodic sync and conflict resolution.
- [ ] Provide database migration + seeding workflow.

### 2. Sync & Storage Pipeline

- [ ] Build CLI/agent for teammates to register local directories and push metadata.
- [ ] Reuse schema normalisation on the server to avoid duplicating frontend logic.
- [ ] Handle binary attachments (images, files) with pluggable storage (S3-compatible + local fallback).
- [ ] Introduce privacy controls (masking, redaction) for shared sessions.

### 3. Frontend Integration (Phase 2)

- [ ] Create account management flows (login, directory management, sharing settings).
- [ ] Add workspace/team selector with real-time updates (websocket/SSE).
- [ ] Surface sync status indicators, conflict prompts, and activity logs.
- [ ] Support mixed mode (local-only + shared sessions) via toggle or merged view.
- [ ] Expand i18n strings to cover collaboration terminology.

### 4. DevOps, Deployment, Observability

- [ ] Extend Docker setup for multi-service development (frontend, backend, database, proxy).
- [ ] Add CI pipelines (lint, test, build, integration) for both frontend and backend.
- [ ] Instrument logging/metrics (pino + OpenTelemetry) and hook basic alerting.
- [ ] Publish deployment guides (self-hosted, cloud) including TLS, backups, scaling.
- [ ] Define security checklist (input validation, rate limiting, dependency audits).

### 5. QA & Documentation

- [ ] Expand automated tests: backend unit/integration, contract tests, end-to-end flows.
- [ ] Update `README.md` and add `docs/architecture.md` describing system components and onboarding.
- [ ] Provide runbooks for administrators (user management, directory onboarding, recovery drills).
- [ ] Review `agents_chat` process to capture cross-team collaboration sessions.
- [ ] Define Milestone 2 acceptance criteria and release plan.

## Cross-Milestone Continuous Tasks

- [ ] Maintain detailed `agents_chat` logs per collaboration session and keep hooks up to date.
- [ ] Track dependency updates and security advisories (dependabot/renovate).
- [ ] Periodically profile parsing/rendering performance on large transcripts.
- [ ] Capture user feedback/feature requests and update backlog regularly.
- [ ] Keep commits small and focused; reflect significant progress in `tasks.md`.

Notes

- Frontend currently uses Next.js 14 (App Router). We will revisit Vite if SSR/API needs change; document decisions in `docs/architecture.md`.
- Environment toggles: schema mode via `NEXT_PUBLIC_SCHEMA_NORMALISER=1`; provider roots via `NEXT_PUBLIC_{CLAUDE,CODEX,GEMINI}_ROOT` with server fallbacks (`CLAUDE_ROOT`, etc.).
