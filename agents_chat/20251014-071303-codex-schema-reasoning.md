## Summary

- Added `join-text-array` transform and a schema-driven mapping for Codex `response_item.reasoning` events so assistant thinking flows through the normaliser.
- Captured reasoning detail/summary fields consistently while keeping provider metadata for traceability.

## Code Highlights

```ts
// src/schema/providers/codex/mappings.ts
{
  provider: "codex",
  id: "codex/response_item.reasoning",
  kind: "reasoning",
  schemaId: reasoningResponseSchema.$id,
  rules: [
    { source: "/payload/summary", target: "content", transform: "join-text-array" },
    {
      source: "",
      target: "metadata.reasoning.providerType",
      transform: { name: "set-constant", options: { value: "codex" } },
    },
  ],
}
```

- Introduced `src/schema/providers/codex/schemas/response-item-reasoning.schema.json` and covered behaviour with new Vitest cases.

## Self-Tests

- `pnpm test src/schema/providers/codex/mappings.test.ts` → **passed** (6 tests).

## Risks / Blockers / Follow-ups

- Schema path still treats `response_item.message` via legacy adapter; future work should emit multiple tool-call/result chunks from schema definitions.
- Need fixture updates ensuring reasoning summaries cover nested/object cases to exercise `join-text-array` robustness.
