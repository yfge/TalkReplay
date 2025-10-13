import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";

import { parseClaudeSessionFromString } from "@/lib/providers/claude";

describe("claude tool_use/tool_result snapshots", () => {
  it("parses stdout/stderr and toolType", async () => {
    const file = path.resolve(
      process.cwd(),
      "fixtures/claude/tool_use_result.jsonl",
    );
    const content = await fs.readFile(file, "utf8");
    const session = parseClaudeSessionFromString(file, content);
    expect(session).not.toBeNull();
    const messages = session!.messages;
    const call = messages.find((m) => m.kind === "tool-call");
    const res = messages.find((m) => m.kind === "tool-result");
    expect(call?.metadata?.toolCall?.toolType).toBe("bash");
    expect(res?.metadata?.toolResult?.stdout).toContain("README.md");
  });
});
