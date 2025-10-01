# Provider Path Configuration

## Summary

- Added `getProviderPaths()` helper to centralise optional Claude/Codex/Gemini root directories from environment variables.
- Documented the corresponding `.env` keys in `README.md` and marked the roadmap task as completed.

## Code Highlights

- `src/config/providerPaths.ts:1` defines `ProviderPaths` types and exports defaults sourced from `import.meta.env` variables.
- `README.md:23` introduces an Environment Configuration section showing the new `VITE_*_ROOT` entries.
- `tasks.md:11` updates the Milestone 1 foundations checklist to reflect completion of the environment configuration task.

## Self-Tests

- Not run (documentation/config scaffolding only).

## Risks & Follow-Up

- Future work must validate user-provided paths at runtime and handle unsupported browsers lacking env-based defaults.
