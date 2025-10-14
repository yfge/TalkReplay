import { describe, expect, it } from "vitest";

import { parseCodexSessionFromString } from "@/lib/providers/codex";

const CODEX_SAMPLE = `{"type":"session_meta","payload":{"id":"session-1","instructions":"Hello"},"timestamp":"2025-09-12T04:17:34.859Z"}\n{"type":"response_item","timestamp":"2025-09-12T04:17:35.000Z","payload":{"type":"message","id":"msg-1","role":"user","content":[{"type":"input_text","text":"List files"}]}}\n{"type":"response_item","timestamp":"2025-09-12T04:17:35.200Z","payload":{"type":"message","id":"msg-2","role":"assistant","model":"gpt-4-codex","content":[{"type":"output_text","text":"Here are the files."}],"usage":{"input_tokens":5,"output_tokens":7,"total_tokens":12}}}\n`;
const CODEX_TOPIC_SAMPLE = `{"type":"response_item","timestamp":"2025-10-14T01:00:00.000Z","payload":{"type":"message","id":"msg-1","role":"user","content":[{"type":"input_text","text":"Generate release notes for the latest build."}]}}\n{"type":"response_item","timestamp":"2025-10-14T01:00:01.000Z","payload":{"type":"reasoning","id":"think-1","summary":[{"text":"Reviewing commits"}]}}\n{"type":"response_item","timestamp":"2025-10-14T01:00:02.000Z","payload":{"type":"message","id":"msg-2","role":"assistant","content":[{"type":"output_text","text":"Here is a summary."}]}}\n`;

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
});
