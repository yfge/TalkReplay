import { describe, expect, it } from "vitest";

import { schemaRegistry } from "@/schema";
import { normalise } from "@/schema/normaliser";

import {
  claudeMappings,
  claudeSchemas,
  registerClaudeSchemas,
  resolveMappingId,
} from "./mappings";

describe("claude schema mappings", () => {
  registerClaudeSchemas();

  it("normalises message text payloads", () => {
    const payload = {
      variant: "message.text",
      timestamp: "2025-01-01T00:00:00Z",
      id: "msg-1",
      role: "assistant",
      content: "Hello from Claude",
    };
    const mappingId = resolveMappingId(payload);
    expect(mappingId).toBe("claude/message.text");
    const result = normalise(mappingId!, payload);
    expect(result?.message.kind).toBe("content");
    expect(result?.message.role).toBe("assistant");
    expect(result?.message.content).toBe("Hello from Claude");
    expect(result?.message.metadata?.providerMessageType).toBe("text");
  });

  it("normalises message content text items", () => {
    const payload = {
      variant: "message.content.text",
      timestamp: "2025-01-01T00:00:01Z",
      id: "msg-1:0",
      role: "assistant",
      contentItem: { type: "text", text: "Chunk" },
    };
    const mappingId = resolveMappingId(payload);
    expect(mappingId).toBe("claude/message.content.text");
    const result = normalise(mappingId!, payload);
    expect(result?.message.kind).toBe("content");
    expect(result?.message.role).toBe("assistant");
    expect(result?.message.content).toBe("Chunk");
    expect(result?.message.metadata?.providerMessageType).toBe("text");
  });

  it("normalises message tool_use items", () => {
    const payload = {
      variant: "message.content.tool_use",
      timestamp: "2025-01-01T00:00:02Z",
      id: "msg-1:1",
      role: "assistant",
      stringContent: '{"command":"ls"}',
      toolType: "bash",
      contentItem: {
        type: "tool_use",
        id: "tool-1",
        name: "Bash",
        input: { command: "ls" },
      },
    };
    const mappingId = resolveMappingId(payload);
    expect(mappingId).toBe("claude/message.content.tool_use");
    const result = normalise(mappingId!, payload);
    expect(result?.message.kind).toBe("tool-call");
    expect(result?.message.role).toBe("assistant");
    expect(result?.message.metadata?.toolCall?.id).toBe("tool-1");
    expect(result?.message.metadata?.toolCall?.toolType).toBe("bash");
    expect(result?.message.content).toBe('{"command":"ls"}');
    expect(result?.message.metadata?.providerMessageType).toBe("tool_use");
  });

  it("normalises message tool_result items", () => {
    const payload = {
      variant: "message.content.tool_result",
      timestamp: "2025-01-01T00:00:03Z",
      id: "msg-1:2",
      role: "tool",
      contentString: '{"stdout":"ok"}',
      output: { stdout: "ok" },
      toolUseResult: { stdout: "ok\n", stderr: "" },
      contentItem: {
        type: "tool_result",
        tool_use_id: "tool-1",
        content: { stdout: "ok" },
        is_error: false,
      },
    };
    const mappingId = resolveMappingId(payload);
    expect(mappingId).toBe("claude/message.content.tool_result");
    const result = normalise(mappingId!, payload);
    expect(result?.message.kind).toBe("tool-result");
    expect(result?.message.role).toBe("tool");
    expect(result?.message.metadata?.toolResult?.callId).toBe("tool-1");
    expect(result?.message.metadata?.toolResult?.stdout).toBe("ok\n");
    expect(result?.message.metadata?.toolResult?.isError).toBe(false);
    expect(result?.message.metadata?.providerMessageType).toBe("tool_result");
    expect(result?.message.content).toBe('{"stdout":"ok"}');
  });

  it("registers schemas for claude provider", () => {
    claudeSchemas.forEach((schema) => {
      const validator = schemaRegistry.getValidator(schema.$id);
      expect(validator).toBeDefined();
    });
    claudeMappings.forEach((mapping) => {
      const stored = schemaRegistry.getMapping(mapping.id);
      expect(stored).toBeDefined();
    });
  });
});
