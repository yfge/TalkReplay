import { describe, expect, it } from "vitest";

import { schemaRegistry } from "@/schema";
import { normalise } from "@/schema/normaliser";

import {
  codexMappings,
  codexSchemas,
  registerCodexSchemas,
  resolveMappingId,
} from "./mappings";

describe("codex schema mappings", () => {
  registerCodexSchemas();

  it("resolves mapping for item.command_execution.started", () => {
    const payload = {
      type: "item.started",
      timestamp: "2025-01-01T00:00:00Z",
      item: { id: "123", type: "command_execution", command: "bash -lc ls" },
    };
    const mappingId = resolveMappingId(payload);
    expect(mappingId).toBe("codex/item.command_execution.started");
    const result = normalise(mappingId!, payload);
    expect(result?.message.kind).toBe("tool-call");
    expect(result?.message.role).toBe("assistant");
    expect(result?.message.metadata?.toolCall?.toolType).toBe("bash");
  });

  it("normalises function_call_output", () => {
    const payload = {
      type: "response_item",
      timestamp: "2025-01-01T00:00:01Z",
      payload: {
        type: "function_call_output",
        call_id: "call-1",
        output: JSON.stringify({ output: "hello", metadata: { exit_code: 0 } }),
      },
    };
    const mappingId = resolveMappingId(payload);
    expect(mappingId).toBe("codex/response_item.function_call_output");
    const result = normalise(mappingId!, payload);
    expect(result?.message.kind).toBe("tool-result");
    expect(result?.message.metadata?.toolResult?.exitCode).toBe(0);
  });

  it("normalises agent_message", () => {
    const payload = {
      type: "item.completed",
      timestamp: "2025-01-01T00:00:02Z",
      item: {
        id: "msg-1",
        type: "agent_message",
        text: "All done!",
      },
    };
    const mappingId = resolveMappingId(payload);
    expect(mappingId).toBe("codex/item.agent_message.completed");
    const result = normalise(mappingId!, payload);
    expect(result?.message.kind).toBe("content");
    expect(result?.message.content).toContain("All done");
    expect(result?.message.metadata?.providerMessageType).toBe("agent_message");
  });

  it("normalises reasoning", () => {
    const payload = {
      type: "item.completed",
      timestamp: "2025-01-01T00:00:03Z",
      item: {
        id: "reason-1",
        type: "reasoning",
        text: "**Plan**: search for docs",
      },
    };
    const mappingId = resolveMappingId(payload);
    expect(mappingId).toBe("codex/item.reasoning.completed");
    const result = normalise(mappingId!, payload);
    expect(result?.message.kind).toBe("reasoning");
    expect(result?.message.metadata?.reasoning?.summary).toContain("Plan");
    expect(result?.message.metadata?.reasoning?.providerType).toBe("codex");
  });

  it("normalises response_item.reasoning", () => {
    const payload = {
      type: "response_item",
      timestamp: "2025-01-01T00:00:04Z",
      payload: {
        type: "reasoning",
        id: "resp-1",
        summary: [{ text: "Step 1" }, { text: "Step 2" }],
        detail: "More detail",
      },
    };
    const mappingId = resolveMappingId(payload);
    expect(mappingId).toBe("codex/response_item.reasoning");
    const result = normalise(mappingId!, payload);
    expect(result?.message.kind).toBe("reasoning");
    expect(result?.message.content).toBe("Step 1\nStep 2");
    expect(result?.message.metadata?.reasoning?.summary).toBe("Step 1\nStep 2");
    expect(result?.message.metadata?.reasoning?.detail).toContain(
      "More detail",
    );
  });

  it("registers schemas", () => {
    codexSchemas.forEach((schema) => {
      const validator = schemaRegistry.getValidator(schema.$id);
      expect(validator).toBeDefined();
    });
    codexMappings.forEach((mapping) => {
      const stored = schemaRegistry.getMapping(mapping.id);
      expect(stored).toBeDefined();
    });
  });
});
