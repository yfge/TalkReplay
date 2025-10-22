import { describe, expect, it } from "vitest";

import { parseGeminiSessionFromString } from "@/lib/providers/gemini";

describe("Gemini provider", () => {
  it("parses chat session with reasoning thoughts", () => {
    const content = JSON.stringify(
      {
        sessionId: "session-test",
        projectHash: "project-xyz",
        startTime: "2025-05-01T10:00:00.000Z",
        messages: [
          {
            id: "user-1",
            timestamp: "2025-05-01T10:00:00.000Z",
            type: "user",
            content: "Show me the integration status summary.",
          },
          {
            id: "gemini-1",
            timestamp: "2025-05-01T10:00:05.000Z",
            type: "gemini",
            content: "Integration is 80% complete with pending documentation.",
            thoughts: [
              {
                subject: "Assess progress",
                description: "Check recent commits and outstanding tasks.",
                timestamp: "2025-05-01T10:00:03.000Z",
              },
            ],
            tokens: {
              input: 256,
              output: 64,
              total: 320,
            },
            model: "gemini-1.5-pro",
          },
        ],
      },
      null,
      2,
    );

    const session = parseGeminiSessionFromString(
      "/tmp/gemini/session.json",
      content,
    );

    expect(session).not.toBeNull();
    if (!session) {
      throw new Error("Gemini session parsing failed");
    }

    expect(session.source).toBe("gemini");
    expect(session.topic).toContain("Show me the integration status summary.");
    expect(session.metadata?.provider?.model).toBe("gemini-1.5-pro");

    const reasoningMessage = session.messages.find(
      (message) => message.kind === "reasoning",
    );
    expect(reasoningMessage).toBeDefined();
    expect(reasoningMessage?.metadata?.reasoning?.summary).toBe(
      "Assess progress",
    );

    const assistantMessage = session.messages.find(
      (message) => message.role === "assistant" && message.kind === "content",
    );
    expect(assistantMessage?.metadata?.tokens?.total).toBe(320);
  });
});
