# Agents Web App Specification

## 1. Project Overview

- Build a cross-platform web application that renders Claude and Codex chat transcripts.
- Target environments: macOS, Windows, and Docker-based deployments.
- Enforce a disciplined workflow that guarantees quality, maintainability, and traceability.

## 2. Functional Goals

- Ingest local Claude and Codex chat logs and present them through a unified UI.
- Provide session filtering, keyword search, and lightweight statistics with hooks for future expansion.
- Implement the UI with React + Tailwind CSS + shadcn/ui and ensure responsive layouts.
- Support light/dark themes by default to improve usability.

## 3. Technology Stack & Dependencies

- Frontend: React with Vite + TypeScript (strict mode enabled).
- UI: Tailwind CSS, shadcn/ui component library, Radix UI primitives.
- State & Data: React Query combined with Context or Zustand for predictable data flow.
- Build tooling: Vite/ESBuild for development and bundling; optional SSR considerations documented.
- Testing: Vitest + React Testing Library; optional Playwright for E2E scenarios.
- Code quality: ESLint, Prettier, Stylelint, integrated with Husky pre-commit hook.
- Documentation: Markdown files with consistent tone and structure.

## 4. Architectural Principles

- Data layer: shared parser module that adapts Claude and Codex formats into a common schema.
- Component layer: atomic + composite components following shadcn/ui design conventions.
- Routing: SPA with base routes `/chats`, `/stats`, `/settings`. Document future SSR plans if needed.
- Service layer: encapsulate data loading, caching, and search logic to allow replacing the data source.
- Plugin-friendly design to accommodate additional AI providers without large refactors.

## 5. Data Source & Schema Guidelines

- Default directories: `data/claude/` and `data/codex/` containing JSON or Markdown transcripts.
- Unified interface per conversation: `id`, `timestamp`, `participants`, `messages` array.
- Normalise timestamps to ISO 8601 strings regardless of original format (ISO or Unix epoch).
- File ingestion strategy:
  - Browser: use file selector + FileReader for local imports.
  - Desktop/local deployments: optional backend/Electron bridge for filesystem access.
- Robust error handling: surface parsing errors in the UI with actionable messages.

## 6. UI & Interaction Standards

- Keep shadcn/ui component semantics intact; wrap only when behaviour needs customisation.
- Use Tailwind theme tokens; avoid ad-hoc hard-coded colours.
- Layout blueprint: sidebar (source filters), main panel (conversation list + details), toolbar (sort/search).
- Conversation view: chronological ordering, distinct speaker styling, collapsible code blocks, keyword highlights.
- Responsive support down to 320px viewport; verify accessibility (keyboard navigation, ARIA labels).

## 7. Cross-Platform & Deployment

- Local development: Node.js LTS (>=18) with pnpm as the preferred package manager.
- macOS/Windows parity: provide launch scripts (pnpm tasks) that behave identically across platforms.
- Docker: base on `node:18-alpine`, use multi-stage build (install → build → serve/static export).
- Optimise image size (< 200 MB) and document runtime instructions in README.

## 8. `agents_chat` Record Policy

- Repository root must contain an `agents_chat/` directory at all times.
- Every AI collaboration round must add a new record:
  - Naming: `YYYYMMDD-HHMMSS-topic.md` (UTC by default; note timezone if different).
  - Contents:
    - Summary of the request and relevant context.
    - Key code snippets or explanations produced by the AI (wrap in fenced code blocks when useful).
    - Self-test commands, parameters, expected vs. actual outcomes.
    - Risks, blockers, and follow-up tasks.
  - Reference all touched source files using project-relative paths.
- Files must be UTF-8 encoded, ASCII preferred unless non-ASCII is essential (document justification).

## 9. Git Workflow & Hook Requirements

- Install Husky and configure a mandatory `pre-commit` hook that:
  - Fails if no staged file inside `agents_chat/` matches the naming pattern `\\b[0-9]{8}-[0-9]{6}-[a-z0-9-]+\\.md\\b`.
  - Ensures each staged `agents_chat` file contains sections for summary, code highlights, and self-tests (validate via grep on headings).
  - Runs quality checks (`pnpm lint`, `pnpm test -- --runInBand`, additional scripts as required) and aborts on failure.
  - Blocks commits when `agents_chat/` contains unstaged changes to avoid losing the latest record.
- Provide sample hook script under `.husky/pre-commit` and document manual install steps in `README.md`.
- Optional `pre-push` hook should re-execute integration or E2E tests when defined.
- Commit messages follow Conventional Commits (e.g., `feat: add conversation parser`).
- Disallow skipping hooks; mirror critical checks in CI/CD pipelines for consistency.

## 10. Code Quality & Testing

- ESLint extends `@typescript-eslint/recommended` and `plugin:react-hooks/recommended`.
- Tailwind class ordering enforced via `eslint-plugin-tailwindcss`.
- Maintain ≥80% unit test coverage; parsing and transformation logic must be thoroughly tested.
- Add Storybook for key components to facilitate design review and regression testing.
- Every bug fix or feature includes corresponding tests or documentation updates.

## 11. Self-Test Documentation

- After each feature/fix, update the most recent `agents_chat` entry with:
  - Executed commands, inputs, expected vs. actual outputs.
  - UI validation notes (screenshots optional; compress before committing if included).
  - Docker build/run verification steps when relevant.
- Explicitly list skipped or pending tests with rationale and follow-up plan.

## 12. Documentation & Knowledge Sharing

- `README.md`: quick start, project structure, key scripts, FAQ.
- `docs/`: deeper design docs, API references, component guidelines.
- Cross-link major design decisions in `agents_chat` records for traceability.

## 13. Security & Privacy

- Redact or anonymise sensitive content in chat logs before importing.
- Never commit real credentials or API keys; leverage `.env` + `.env.example` patterns.
- Exclude irrelevant files from Docker context using `.dockerignore`.

## 14. Future Enhancements (Optional)

- Integrate full-text search (e.g., Lunr.js) and tagging capabilities.
- Provide side-by-side conversation diff view for comparative analysis.
- Enable export of conversations (JSON/Markdown) for backup and sharing.

## 15. Development Conventions

- Keep code changes and commits as small and focused as possible.
- Every commit must add a new `agents_chat/` record capturing the user prompts, interruptions, and key decisions for that work.
- Update `tasks.md` in the same commit to reflect progress or new agreements.
