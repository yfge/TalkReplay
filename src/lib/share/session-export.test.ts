import { describe, expect, it } from "vitest";

import type { ChatSession } from "@/types/chat";

import {
  sessionToFilename,
  sessionToJson,
  sessionToMarkdown,
} from "./session-export";

const sampleSession: ChatSession = {
  id: "session-1",
  source: "codex",
  topic: "Test Conversation",
  startedAt: "2024-05-01T10:00:00.000Z",
  participants: ["user", "assistant"],
  messages: [
    {
      id: "msg-1",
      role: "user",
      kind: "content",
      timestamp: "2024-05-01T10:00:01.000Z",
      content: "Hello there",
    },
    {
      id: "msg-2",
      role: "assistant",
      kind: "reasoning",
      timestamp: "2024-05-01T10:00:02.000Z",
      content: "Thinking...",
      metadata: {
        reasoning: { summary: "Thinking..." },
      },
    },
  ],
  metadata: {
    sourceFile: "/tmp/test.jsonl",
    summary: "Session summary",
  },
};

describe("session export helpers", () => {
  it("serialises to markdown", () => {
    const markdown = sessionToMarkdown(sampleSession);
    expect(markdown).toContain("# Test Conversation");
    expect(markdown).toContain("```\nHello there\n```");
    expect(markdown).toContain("Reasoning");
    expect(markdown).toContain("Source file: /tmp/test.jsonl");
  });

  it("serialises to json", () => {
    const json = sessionToJson(sampleSession);
    const parsed = JSON.parse(json) as ChatSession;
    expect(parsed.topic).toBe(sampleSession.topic);
    expect(parsed.messages).toHaveLength(2);
  });

  it("creates safe filenames", () => {
    const filename = sessionToFilename(sampleSession, "md");
    expect(filename).toBe("Test-Conversation.md");
  });
});
