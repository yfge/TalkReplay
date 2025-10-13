# Project Task Plan

## Milestone 1.A – Log Analysis + Structured Tool Call UI

Goal: Analyse Claude Code and Codex CLI log formats in detail, finalise a unified conversation schema (v1), and refactor the chat detail UI to present tool invocations and results in a structured, inspectable way.

### A1. Source Log Formats (observed)

- Claude Code
  - Location: `~/.claude/projects/<sanitized-cwd>/*.jsonl`
  - Entries: `file-history-snapshot`, `summary`, `user`/`assistant` messages; assistant `content[]` includes `text`, `tool_use`, `tool_result` chunks; paired `tool_result` may also include `toolUseResult` with `stdout`, `stderr`, `interrupted`, `isImage`.
  - Sample: `~/.claude/projects/-Users-geyunfei-dev-yfge-ai-shifu/4658f936-*.jsonl` shows `message.content[{ type: "tool_use" | "tool_result", id/name/input/content }]` with `message.usage` token counts.
- Codex CLI
  - Location: `~/.codex/sessions/YYYY/MM/DD/*.jsonl`
  - Interactive logs: `session_meta`, `turn_context`, `event_msg{ type: agent_reasoning | token_count }`, `response_item{ type: message | reasoning | function_call | function_call_output }`.
  - Exec JSON mode (docs): `thread.started`, `turn.started/completed/failed`, `item.started/updated/completed` with `type: command_execution | file_change | mcp_tool_call | web_search | agent_message | reasoning`.
  - Sample: `~/.codex/sessions/2025/10/13/rollout-*.jsonl` shows `function_call{name: shell, arguments}` and `function_call_output{ output: { output, metadata:{ exit_code, duration_seconds }}}`.

Acceptance: Capture at least 3 real files per source as fixtures (sanitised) under `fixtures/{claude,codex}/` and document field mappings in `docs/data-sources.md`.

### A2. Unified Schema v1 (gaps + extensions)

- Keep `src/types/chat.ts` as the core model; extend minimally:
  - `MessageMetadata.toolCall`: add `toolType?: "bash" | "apply_patch" | "mcp" | "web_search" | "file_change" | string`.
  - `MessageMetadata.toolResult`: add optional `exitCode?: number`, `durationMs?: number`, `stdout?: string`, `stderr?: string`, `filesChanged?: string[]`, `diff?: string`.
  - `MessageMetadata.reasoning.detail?: string | null` reserved for future expansion.
- Normalisation rules:
  - Timestamps → ISO 8601 strings.
  - Roles → `user|assistant|system|tool`.
  - Preserve provider raw in `metadata.raw` for forensic inspection.

Acceptance: Types updated with strict TypeScript, no breaking changes to existing callers; add a small migration note in `docs/data-sources.md`.

### A3. Parser Adapters (Claude, Codex)

- Claude (`src/lib/providers/claude.ts`)
  - Map `content[]` items:
    - `tool_use` → `kind: tool-call` with `toolCallId`, `toolCall.name`, `toolCall.arguments`, infer `toolType` by `name` (e.g., `Bash`, `apply_patch`).
    - `tool_result` → `kind: tool-result` with `toolResult.callId`, attach `stdout`/`stderr`/`interrupted`/`isImage` from sibling `toolUseResult` when present.
  - Token usage: attach `message.usage` to the first chunk per log entry.
- Codex (`src/lib/providers/codex.ts`)
  - `response_item.type`:
    - `message` → text chunks; include `tool_use`/`tool_result` when present.
    - `reasoning` → `kind: reasoning` with `summary` text.
    - `function_call` → `kind: tool-call` with `toolCall.*`.
    - `function_call_output` → `kind: tool-result` with `toolResult.*`; parse JSON `output` to extract `{ output, metadata: { exit_code, duration_seconds } }` into `stdout`, `exitCode`, `durationMs`.
  - Exec JSON mode: when `item.*` events are encountered (from `docs/exec.md`), map `command_execution`/`file_change` into tool-call/result pairs with aggregated output and status.

Acceptance: Parsing produces stable `ChatSession` with correct `kind` and enriched `toolResult` fields for the provided fixtures; unit tests snapshot important messages.

### A4. Structured Tool Call UI Refactor

- New component: `ToolCallCard` (collapsible)
  - Header: icon + tool name + status chip (success/warn/error) + `exitCode` + duration.
  - Body: arguments (pretty JSON), result tabs (stdout/stderr/diff/preview), large-output collapse with expand.
  - Footer: actions (copy command/args, copy output, export to file), mini-metadata (cwd, sandbox/approvals if available).
- Grouping: Co-locate `tool-call` + matching `tool-result` by `toolCallId` into one card.
- Reasoning: optional toggle to show/hide `kind: reasoning` messages inline.
- Token usage: show per-message token usage and session totals (in metadata panel).

Acceptance: For both providers’ fixtures, tool calls render as grouped cards with status/exit code and outputs; long outputs are collapsed by default; keyboard navigation preserved.

### A5. Search, Filters, and Stats Enhancements

- Filters: `has:tool-calls`, `has:errors`, `source:claude|codex`, `project:<name>`; surface as sidebar chips.
- Keyword highlight: match within message text, tool args, stdout/stderr.
- Mini-stats: per-session counts (messages, tool calls, errors), duration estimate.

Acceptance: Filters narrow the chat list and highlights appear inside detail view; counts match parser outputs for fixtures.

### A6. Fixtures, Tests, and Docs

- Fixtures: add sanitised examples to `fixtures/claude/*.jsonl`, `fixtures/codex/*.jsonl`.
- Unit tests (Vitest): parser mapping per provider; snapshot key message shapes; edge cases (missing fields, malformed lines, large outputs).
- Docs: `docs/data-sources.md` detailing field mapping tables and known caveats; `docs/ui-tool-calls.md` with screenshots of the new cards.

Acceptance: ≥80% coverage for parser modules; docs linked from `README.md` “Data Sources” section.

### A7. Integration & Release Tasks

- Wire `ToolCallCard` into `src/components/chats/chat-detail.tsx` with grouping logic.
- i18n: add new strings (labels, tabs, chips) to `src/locales/en/*` and `src/locales/zh-CN/*`.
- Accessibility: keyboard toggles for collapse/expand; ARIA labels on tabs and buttons.
- Performance: virtualise message list if total nodes > 500; lazy-render heavy outputs.

Acceptance: No regressions in existing features; renders smoothly on long sessions; Lighthouse a11y score unchanged or better.

—

Owner: @yfge
ETA: 5–7 days (including tests and docs)
Blocking risks: very large JSONL files, provider format drift, path permissions in browsers.

## Milestone 1 – Local Frontend Experience

**Goal:** Ship a browser-based UI that can ingest local Claude, Codex, and Gemini chat histories, display unified conversations, and support internationalisation without requiring a backend.

### 1. Foundations & Developer Experience

- [x] Define environment configuration interface (e.g., `.env`, runtime config) for provider root paths; document in `README.md` (see `src/config/providerPaths.ts`).
- [x] Establish provider-agnostic transcript schema in `src/types` (extend existing models for Gemini, add metadata fields) — see `src/types/chat.ts`.
- [x] Expand sample data fixtures to cover Claude, Codex, Gemini edge cases (large files, missing metadata, code blocks) — see `src/data/sampleSessions.ts`.
- [x] Set up i18n framework (e.g., `react-i18next`) with initial locales (en, zh-CN); add locale switcher component (see `src/lib/i18n.ts`).
- [x] Update lint/test/prettier configs to cover i18n files and new provider modules (see `package.json`, `vitest.config.ts`, `.prettierignore`).
- [x] Migrate SPA scaffold to Next.js App Router with shared providers (`src/app/layout.tsx`, `src/app/providers.tsx`, `src/app/page.tsx`).
- [x] Ensure Docker builds and runtime export provider roots via `NEXT_PUBLIC_*` env defaults so the UI skips manual setup (`Dockerfile`, `docker-compose.yml`).

### 2. Local Directory Configuration

- [x] Research browser API options for reading local directories (File System Access API, drag-and-drop, manual file upload) and document supported browsers (see `docs/browser-file-access.md`).
- [x] Implement startup wizard/modal to let users input or pick directories per provider; persist choices (localStorage/zustand persist) — see `src/components/preferences/provider-setup-dialog.tsx`.
- [x] Add validation and error messaging for invalid directories or empty histories — provider dialog warns about invalid characters and empty states prompt configuration.
- [x] Provide manual refresh/import controls to rescan directories — header button and empty state trigger refresh via `loadSessionsFromProviders`.

### 3. Transcript Ingestion & Normalisation

- [ ] Build provider adapters translating raw files into unified session/message schema:
  - [x] Claude adapter reads JSONL sessions from ~/.claude/projects
  - [x] Codex adapter reads JSONL sessions from ~/.codex/sessions
  - [ ] Gemini adapter pending
- [x] Support incremental import (only new/changed files) and surface parsing errors in UI notifications — see `src/lib/session-loader/server.ts`, `src/lib/session-loader/client.ts`, and the import error banner in `App`.
- [x] Implement background parsing worker (Web Worker) to keep UI responsive for large datasets — see `src/workers/parser.worker.ts`.
- [x] Expose server-side loader via Next.js API route for lightweight backend (`src/app/api/sessions/route.ts`).
- [x] Split session summary/detail flow with dedicated API route and cached detail store.
- [x] Unify session ID encoding/decoding across client and server to keep sample + provider data in sync.
- [x] Add integration tests for session summary/detail endpoints and store wiring.
- [ ] Write unit tests covering parser edge cases per provider (Vitest snapshot/fixtures).

### 4. Conversation Explorer UI

- [x] Enhance chat list filtering (source toggles, search, date range, starred sessions) — added starred toggle and date range in sidebar.
- [x] Implement session detail view improvements (message grouping, inline code formatting, copy button, metadata panel).
- [x] Add provider badges, icons, and color accents for visual distinction.
- [x] Stabilise chat list/detail layout so the message pane stays visible after refresh/import.
- [ ] Support pagination/virtualisation for long conversation lists (e.g., `@tanstack/react-virtual`).
- [ ] Implement quick navigation (keyboard shortcuts, breadcrumbs, recent sessions panel).

  Progress (2025-10-02):
  - [x] Render images inline in chat detail (tool results + content) and add secure file proxy API for local image paths.
  - [x] Improve long-text wrapping in message cards to avoid clipping when base64/JSON is present.
  - [x] Add Project filter in sidebar and wire to store.

### 5. Internationalisation & Accessibility

- [ ] Externalise copy to locale files; ensure components pull strings via i18n hooks.
- [ ] Provide RTL support review (layout adjustments, Tailwind RTL plugin if needed).
- [ ] Verify accessibility (ARIA landmarks, focus management, color contrast) and document results.
- [ ] Provide e2e smoke test (Playwright) to toggle locales and validate UI renders.

### 6. Quality, Docs, Release Ready

- [x] Update `README.md` with local setup, supported browsers, known limitations (see "Browser Support & Limitations").
- [x] Refactor Dockerfile for offline builds (no Corepack/pnpm), add `.dockerignore`, enable Next `output: "standalone"`.
- [ ] Create troubleshooting guide (`docs/troubleshooting.md`) covering directory permissions and parsing failures.
- [ ] Expand `agents_chat` template snippet for multi-locale work and parser testing.
- [ ] Prepare demo data script (optional) bundling sanitized transcripts for quick demos.
- [ ] Define acceptance checklist for Milestone 1 (QA scenarios, manual test plan).
- [ ] Resolve Next.js build warnings surfaced after fixing Docker devDependencies (Tailwind class ordering and `@next/next/no-img-element`).

## Milestone 2 – Collaborative Server Platform

**Goal:** Introduce a backend service that aggregates shared directories from team members, enabling collaborative browsing and learning, while preserving the frontend UX.

### 1. Backend Architecture & Infrastructure

- [ ] Choose backend stack (e.g., Node + Fastify/Express) and persistence layer (PostgreSQL/SQLite) for session metadata.
- [ ] Design API contract for provider sync (upload manifests, fetch conversations, diff updates).
- [ ] Implement authentication & authorisation strategy (JWT, OAuth, or team tokens) with RBAC for directories.
- [ ] Set up background jobs for periodic directory sync and conflict resolution.
- [ ] Provide migration & seeding mechanism for database schemas.

### 2. Sync & Storage Pipeline

- [ ] Build CLI/agent for teammates to register local directories and push metadata to server.
- [ ] Implement server-side parsers/storage reuse to avoid duplicating frontend logic (shared library or pkg).
- [ ] Handle binary/artifact uploads (attachments, images) with storage abstraction (S3-compatible, local disk fallback).
- [ ] Add versioning + audit trails for shared sessions.
- [ ] Introduce privacy controls (masking, redaction options) before sharing conversations.

### 3. Frontend Integration (Phase 2)

- [ ] Create account management screens (login, directory management, sharing settings).
- [ ] Add workspace/team selector UI with real-time updates from server (React Query mutations, websockets or SSE).
- [ ] Integrate sync status indicators, conflict resolution prompts, and activity logs in the UI.
- [ ] Support mixed mode: local-only sessions + shared sessions (toggle or combined view).
- [ ] Expand i18n strings to cover collaboration terminology.

### 4. DevOps, Deployment, Observability

- [ ] Extend Docker setup to include backend service, database, frontend proxy; create docker-compose for local dev.
- [ ] Add CI pipelines (lint, test, build, integration tests) for both frontend and backend.
- [ ] Implement logging/metrics (e.g., pino + OpenTelemetry) and alerting hooks.
- [ ] Document deployment guides (self-hosted, cloud options) including TLS and backup strategies.
- [ ] Define security checklist (input validation, rate limiting, dependency audits).

### 5. QA & Documentation

- [ ] Expand automated tests: backend unit/integration tests, contract tests between frontend/backend, end-to-end flows.
- [ ] Update `README.md` and create `docs/architecture.md` describing system components, data flow, and onboarding for contributors.
- [ ] Provide runbooks for administrators (user management, directory onboarding, failure recovery).
- [ ] Review `agents_chat` process to capture cross-team collaboration sessions.
- [ ] Define Milestone 2 acceptance criteria with stakeholder sign-off and release plan.

## Cross-Milestone Continuous Tasks

- [ ] Maintain detailed `agents_chat` logs per collaboration session (include prompts, interruptions, key decisions) and ensure hooks stay in sync.
- [ ] Track dependency updates and security advisories (dependabot/renovate).
- [ ] Periodic performance profiling for parsing and rendering large transcripts.
- [ ] Capture user feedback/feature requests and update backlog regularly.
- [ ] Keep commits small and focused; document progress updates in `tasks.md` for each change.
