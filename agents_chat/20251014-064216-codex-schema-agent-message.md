## Summary

- Expanded Codex schema coverage so `item.agent_message` and `item.reasoning` events flow through the json-schema normaliser.
- Ensured tool events emit deterministic ids during normalisation to stabilise tool call/result linking.

## Code Highlights

```ts
// src/schema/providers/codex/mappings.ts
{
  provider: "codex",
  id: "codex/item.reasoning.completed",
  kind: "reasoning",
  schemaId: reasoningCompletedSchema.$id,
  rules: [
    { source: "/item/text", target: "metadata.reasoning.summary", transform: "stringify" },
    {
      source: "",
      target: "metadata.reasoning.providerType",
      transform: { name: "set-constant", options: { value: "codex" } },
    },
  ],
}
```

- Added schemas at `src/schema/providers/codex/schemas/item-agent-message-completed.schema.json` and `src/schema/providers/codex/schemas/item-reasoning-completed.schema.json`.
- Strengthened tests in `src/schema/providers/codex/mappings.test.ts` to exercise the new mappings.

## Self-Tests

- `pnpm test -- --runInBand src/schema/providers/codex/mappings.test.ts` → **failed** (Vitest CLI rejects `--runInBand`; documented for hook follow-up).
- `pnpm test src/schema/providers/codex/mappings.test.ts` → **passed**, new and existing mapping cases all green.

## Risks / Blockers / Follow-ups

- Need schemas for remaining Codex item types (todo_list, error, agent_message updates) before retiring legacy parsing.
- Consider harmonising reasoning metadata across providers once Claude schemas land.
