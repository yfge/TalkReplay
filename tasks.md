# Project Task Plan

## Milestone 1 – Local Frontend Experience

**Goal:** Ship a browser-based UI that can ingest local Claude, Codex, and Gemini chat histories, display unified conversations, and support internationalisation without requiring a backend.

### 1. Foundations & Developer Experience

- [x] Define environment configuration interface (e.g., `.env`, runtime config) for provider root paths; document in `README.md` (see `src/config/providerPaths.ts`).
- [x] Establish provider-agnostic transcript schema in `src/types` (extend existing models for Gemini, add metadata fields) — see `src/types/chat.ts`.
- [x] Expand sample data fixtures to cover Claude, Codex, Gemini edge cases (large files, missing metadata, code blocks) — see `src/data/sampleSessions.ts`.
- [x] Set up i18n framework (e.g., `react-i18next`) with initial locales (en, zh-CN); add locale switcher component (see `src/lib/i18n.ts`).
- [ ] Update lint/test/prettier configs to cover i18n files and new provider modules.

### 2. Local Directory Configuration

- [x] Research browser API options for reading local directories (File System Access API, drag-and-drop, manual file upload) and document supported browsers (see `docs/browser-file-access.md`).
- [x] Implement startup wizard/modal to let users input or pick directories per provider; persist choices (localStorage/zustand persist) — see `src/components/preferences/provider-setup-dialog.tsx`.
- [ ] Add validation and error messaging for invalid directories or empty histories.
- [ ] Provide manual refresh/import controls to rescan directories.

### 3. Transcript Ingestion & Normalisation

- [ ] Build provider adapters (`claudeAdapter`, `codexAdapter`, `geminiAdapter`) translating raw files into unified session/message schema.
- [ ] Support incremental import (only new/changed files) and surface parsing errors in UI notifications.
- [ ] Implement background parsing worker (Web Worker) to keep UI responsive for large datasets.
- [ ] Write unit tests covering parser edge cases per provider (Vitest snapshot/fixtures).

### 4. Conversation Explorer UI

- [ ] Enhance chat list filtering (source toggles, search, date range, starred sessions).
- [ ] Implement session detail view improvements (message grouping, inline code formatting, copy button, metadata panel).
- [ ] Add provider badges, icons, and color accents for visual distinction.
- [ ] Support pagination/virtualisation for long conversation lists (e.g., `@tanstack/react-virtual`).
- [ ] Implement quick navigation (keyboard shortcuts, breadcrumbs, recent sessions panel).

### 5. Internationalisation & Accessibility

- [ ] Externalise copy to locale files; ensure components pull strings via i18n hooks.
- [ ] Provide RTL support review (layout adjustments, Tailwind RTL plugin if needed).
- [ ] Verify accessibility (ARIA landmarks, focus management, color contrast) and document results.
- [ ] Provide e2e smoke test (Playwright) to toggle locales and validate UI renders.

### 6. Quality, Docs, Release Ready

- [ ] Update `README.md` with local setup, supported browsers, known limitations (file system access restrictions).
- [ ] Create troubleshooting guide (`docs/troubleshooting.md`) covering directory permissions and parsing failures.
- [ ] Expand `agents_chat` template snippet for multi-locale work and parser testing.
- [ ] Prepare demo data script (optional) bundling sanitized transcripts for quick demos.
- [ ] Define acceptance checklist for Milestone 1 (QA scenarios, manual test plan).

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
