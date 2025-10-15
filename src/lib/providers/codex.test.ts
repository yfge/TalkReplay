import { describe, expect, it } from "vitest";

import { parseCodexSessionFromString } from "@/lib/providers/codex";

const serialiseEntries = (entries: unknown[]): string =>
  `${entries.map((entry) => JSON.stringify(entry)).join("\n")}\n`;

const CODEX_SAMPLE = serialiseEntries([
  {
    type: "session_meta",
    payload: { id: "session-1", instructions: "Hello" },
    timestamp: "2025-09-12T04:17:34.859Z",
  },
  {
    type: "response_item",
    timestamp: "2025-09-12T04:17:35.000Z",
    payload: {
      type: "message",
      id: "msg-1",
      role: "user",
      content: [{ type: "input_text", text: "List files" }],
    },
  },
  {
    type: "response_item",
    timestamp: "2025-09-12T04:17:35.200Z",
    payload: {
      type: "message",
      id: "msg-2",
      role: "assistant",
      model: "gpt-4-codex",
      content: [{ type: "output_text", text: "Here are the files." }],
      usage: { input_tokens: 5, output_tokens: 7, total_tokens: 12 },
    },
  },
]);

const CODEX_TOPIC_SAMPLE = serialiseEntries([
  {
    type: "response_item",
    timestamp: "2025-10-14T01:00:00.000Z",
    payload: {
      type: "message",
      id: "msg-1",
      role: "user",
      content: [
        {
          type: "input_text",
          text: "Generate release notes for the latest build.",
        },
      ],
    },
  },
  {
    type: "response_item",
    timestamp: "2025-10-14T01:00:01.000Z",
    payload: {
      type: "reasoning",
      id: "think-1",
      summary: [{ text: "Reviewing commits" }],
    },
  },
  {
    type: "response_item",
    timestamp: "2025-10-14T01:00:02.000Z",
    payload: {
      type: "message",
      id: "msg-2",
      role: "assistant",
      content: [{ type: "output_text", text: "Here is a summary." }],
    },
  },
]);

const CODEX_TOOL_SAMPLE = serialiseEntries([
  {
    type: "response_item",
    timestamp: "2025-10-14T02:00:00.000Z",
    payload: {
      type: "message",
      id: "msg-10",
      role: "assistant",
      model: "gpt-4-codex",
      content: [
        {
          type: "tool_use",
          id: "call-42",
          name: "Bash",
          input: { command: 'bash -lc "ls -la"' },
        },
        {
          type: "tool_result",
          tool_use_id: "call-42",
          content: { stdout: "README.md\n", stderr: "", is_error: false },
        },
        { type: "output_text", text: "Listing complete." },
      ],
      usage: { input_tokens: 9, output_tokens: 15, total_tokens: 24 },
    },
  },
]);

describe("parseCodexSessionFromString", () => {
  it("parses codex session log", () => {
    const session = parseCodexSessionFromString(
      "/tmp/codex.jsonl",
      CODEX_SAMPLE,
    );
    expect(session).not.toBeNull();
    expect(session?.messages).toHaveLength(2);
    expect(session?.messages?.[1]?.metadata?.tokens?.total).toBe(12);
    expect(session?.metadata?.summary).toContain("Hello");
    expect(session?.messages?.[0]?.kind).toBe("content");
  });

  it("uses preceding user prompt for session topic", () => {
    const session = parseCodexSessionFromString(
      "/tmp/codex-topic.jsonl",
      CODEX_TOPIC_SAMPLE,
    );
    expect(session).not.toBeNull();
    expect(session?.topic).toBe("Generate release notes for the latest build.");
  });

  it("parses via schema normaliser", () => {
    process.env.NEXT_PUBLIC_SCHEMA_NORMALISER = "1";
    const session = parseCodexSessionFromString(
      "/tmp/codex-schema.jsonl",
      CODEX_SAMPLE,
    );
    expect(session).not.toBeNull();
    expect(session?.messages).toHaveLength(2);
    expect(session?.messages?.[1]?.metadata?.tokens?.total).toBe(12);
    delete process.env.NEXT_PUBLIC_SCHEMA_NORMALISER;
  });

  it("parses tool events via schema normaliser", () => {
    process.env.NEXT_PUBLIC_SCHEMA_NORMALISER = "1";
    const session = parseCodexSessionFromString(
      "/tmp/codex-tool-schema.jsonl",
      CODEX_TOOL_SAMPLE,
    );
    delete process.env.NEXT_PUBLIC_SCHEMA_NORMALISER;
    expect(session).not.toBeNull();
    expect(session?.messages).toHaveLength(3);
    const toolCall = session?.messages?.find((m) => m.kind === "tool-call");
    expect(toolCall?.metadata?.toolCall?.id).toBe("call-42");
    const toolResult = session?.messages?.find((m) => m.kind === "tool-result");
    expect(toolResult?.content ?? "").toContain("README.md");
    const tokenCarrier = session?.messages?.find(
      (m) => m.metadata?.tokens?.total === 24,
    );
    expect(tokenCarrier).toBeDefined();
  });
});
