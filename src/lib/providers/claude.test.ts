import { describe, expect, it } from "vitest";

import { parseClaudeSessionFromString } from "@/lib/providers/claude";

const CLAUDE_SAMPLE = `{"type":"summary","summary":"Timeline component guidance"}\n{"sessionId":"abc","timestamp":"2024-04-01T09:30:00.000Z","message":{"id":"msg-1","role":"user","content":"Help me build a timeline"}}\n{"sessionId":"abc","timestamp":"2024-04-01T09:30:05.000Z","message":{"id":"msg-2","role":"assistant","model":"claude-3","usage":{"input_tokens":10,"output_tokens":20,"total_tokens":30},"content":[{"type":"text","text":"Sure, here is an example."}]}}\n`;

describe("parseClaudeSessionFromString", () => {
  it("parses sessions into chat messages", () => {
    const session = parseClaudeSessionFromString(
      "/tmp/sample.jsonl",
      CLAUDE_SAMPLE,
    );
    expect(session).not.toBeNull();
    expect(session?.messages).toHaveLength(2);
    expect(session?.source).toBe("claude");
    expect(session?.messages?.[1]?.metadata?.tokens?.total).toBe(30);
    expect(session?.messages?.[0]?.kind).toBe("content");
  });

  it("parses sessions via schema normaliser when enabled", () => {
    process.env.NEXT_PUBLIC_SCHEMA_NORMALISER = "1";
    const session = parseClaudeSessionFromString(
      "/tmp/sample-schema.jsonl",
      CLAUDE_SAMPLE,
    );
    expect(session).not.toBeNull();
    expect(session?.messages).toHaveLength(2);
    expect(session?.messages?.[0]?.kind).toBe("content");
    expect(session?.messages?.[1]?.metadata?.providerMessageType).toBe("text");
    delete process.env.NEXT_PUBLIC_SCHEMA_NORMALISER;
  });
});
