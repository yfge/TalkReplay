# Schema Contribution Workflow

This document explains how we version, extend, and test the JSON Schema normalisation layer. Follow it whenever you introduce new provider events or tweak existing mappings.

## Versioning & Compatibility

- Every schema lives under `src/schema/providers/<provider>/schemas/` with a stable `$id` served from `https://talkreplay.dev/schema/...`.
- Treat schema changes as additive: prefer new schemas or mappings instead of mutating existing ones to avoid breaking previously imported logs.
- When a breaking change is unavoidable, bump the `$id` suffix (for example, append `/v2`) and register both versions to maintain backwards compatibility.

## Adding a New Mapping

1. Capture an anonymised fixture under `fixtures/<provider>/` that reflects the raw event.
2. Define the JSON Schema under the provider's `schemas/` directory and register it in `mappings.ts`.
3. Extend the mapping array with transform rules that emit `ChatMessage` objects following the shared contract in `src/types/chat.ts`.
4. Add a unit test to `mappings.test.ts` asserting `resolveMappingId`, `normalise`, and any critical metadata fields.

## Provider Integration Steps

- Update the corresponding provider adapter (e.g. `src/lib/providers/codex.ts`) to build schema-friendly payloads and fall back to legacy parsing when a mapping is missing.
- Preserve raw payloads by attaching them to `message.metadata.raw` so UI tooling can surface debugging details.
- Ensure token usage or other summary metadata is propagated exactly once per response item to avoid double-counting in analytics.

## Testing Expectations

- Run `pnpm test src/schema/providers/<provider>/mappings.test.ts` and any provider-level tests that cover schema-mode execution.
- Execute `pnpm lint` to validate transforms, import ordering, and TypeScript safety checks enforced by the Husky pre-commit hook.
- Update the latest `agents_chat` entry with the tests you ran, expected vs. actual results, and any skipped steps.

## Review Checklist

- [ ] Schema `$id` follows the `https://talkreplay.dev/schema/...` convention.
- [ ] Mapping rules only set defined fields and reuse existing transforms where possible.
- [ ] Tests cover success paths and ensure `resolveMappingId` identifies the new variant.
- [ ] Documentation (`docs/data-sources.md` or this file) references the new event type.
- [ ] `tasks.md` reflects progress if the change completes or partially completes a tracked milestone item.
