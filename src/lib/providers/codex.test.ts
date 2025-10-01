import { describe, expect, it } from "vitest";

import { parseCodexSessionFromString } from "@/lib/providers/codex";

const CODEX_SAMPLE = `{"type":"session_meta","payload":{"id":"session-1","instructions":"Hello"},"timestamp":"2025-09-12T04:17:34.859Z"}\n{"type":"response_item","timestamp":"2025-09-12T04:17:35.000Z","payload":{"id":"msg-1","role":"user","content":[{"type":"input_text","text":"List files"}]}}\n{"type":"response_item","timestamp":"2025-09-12T04:17:35.200Z","payload":{"id":"msg-2","role":"assistant","model":"gpt-4-codex","content":[{"type":"output_text","text":"Here are the files."}],"usage":{"input_tokens":5,"output_tokens":7,"total_tokens":12}}}\n`;

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
  });
});
