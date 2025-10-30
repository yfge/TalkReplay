import { describe, expect, it } from "vitest";

import { schemaRegistry } from "@/schema";
import { normalise } from "@/schema/normaliser";

import {
  cursorMappings,
  cursorSchemas,
  registerCursorSchemas,
  resolveMappingId,
} from "./mappings";

describe("cursor schema mappings", () => {
  registerCursorSchemas();

  it("resolves chat message mapping", () => {
    const payload = {
      variant: "cursor/chat.message",
      id: "session:assistant",
      role: "assistant",
      timestamp: "2025-10-30T00:00:00.000Z",
      content: "Cursor generated guidance.",
      providerMessageType: "cursor.assistant",
      attachments: [
        {
          type: "code",
          name: "session.py",
          language: "py",
          text: "print('hello world')",
        },
      ],
      raw: { source: "chatdata" },
    };
    const mappingId = resolveMappingId(payload);
    expect(mappingId).toBe("cursor/chat.message");
    const result = normalise(mappingId!, payload);
    expect(result?.message.kind).toBe("content");
    expect(result?.message.role).toBe("assistant");
    expect(result?.message.metadata?.providerMessageType).toBe(
      "cursor.assistant",
    );
    expect(result?.message.metadata?.attachments?.[0]?.name).toBe("session.py");
    expect(result?.message.metadata?.raw).toEqual({ source: "chatdata" });
  });

  it("registers schemas", () => {
    cursorSchemas.forEach((schema) => {
      const validator = schemaRegistry.getValidator(schema.$id);
      expect(validator).toBeDefined();
    });
    cursorMappings.forEach((mapping) => {
      const stored = schemaRegistry.getMapping(mapping.id);
      expect(stored).toBeDefined();
    });
  });
});
