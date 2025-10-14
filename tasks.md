# Project Task Plan

## Milestone 1.A – Schema-Based Log Normalisation

Goal: Drive Claude & Codex parsing from JSON Schemas so tool calls/results land in a consistent UI with minimal provider-specific logic.

### A1. Fixtures & Source Analysis

- [ ] Refresh anonymised fixtures under `fixtures/{claude,codex}` covering current event types (tool_use/tool_result, item.\* events, response_item variants).
- [ ] Document key field mappings and schema coverage notes in `docs/data-sources.md`.

### A2. Schema Layer

- [ ] Author JSON Schemas for Claude tool events (`tool_use`, `tool_result`, `text`) and Codex events (`item.started/updated/completed`, `response_item`, `function_call`, `function_call_output`).
- [ ] Build an Ajv-based validator/normaliser that consumes schema + mapping definitions to emit `ChatMessage` objects.
- [ ] Implement reusable transforms (ISO timestamps, exitCode/duration extraction, diff parsing, toolType inference, stdout/stderr capture).
- [ ] Document schema versioning, contribution workflow, and testing expectations.

### A3. Adapter Migration & Tests

- [ ] Wire Codex adapter to the schema normaliser for tool events with a controlled fallback path.
- [ ] _Update (2025-10-14): Codex session topic now prefers the user prompt preceding the first assistant message (including reasoning/tool preambles) to match UX expectations._
- [ ] Wire Claude adapter to the same pipeline (tool_use/tool_result/text) while preserving raw payloads for audit.
- [ ] Add unit/snapshot tests that validate + normalise fixtures through the schema layer and guard regressions.
- [ ] Benchmark parsing performance on large logs and record baseline metrics.

### A4. Structured Tool Call UI

- [ ] Support pagination/virtualisation for long conversation lists (e.g., `@tanstack/react-virtual`).
- [ ] Implement fast navigation affordances (keyboard shortcuts, breadcrumbs, recent sessions).
- [ ] Enhance ToolCallCard diff navigation (previous/next hunk indicators, keyboard bindings).

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
