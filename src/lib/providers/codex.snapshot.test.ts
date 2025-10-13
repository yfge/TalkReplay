import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";

import { parseCodexSessionFromString } from "@/lib/providers/codex";

describe("codex exec item snapshots", () => {
  it("parses file_change and mcp_tool_call items", async () => {
    const file = path.resolve(
      process.cwd(),
      "fixtures/codex/file_change_mcp.jsonl",
    );
    const content = await fs.readFile(file, "utf8");
    const session = parseCodexSessionFromString(file, content);
    expect(session).not.toBeNull();
    const messages = session!.messages;
    const kinds = messages.map((m) => m.kind);
    expect(kinds).toContain("tool-call");
    expect(kinds).toContain("tool-result");

    const fileChangeCall = messages.find(
      (m) =>
        m.kind === "tool-call" &&
        m.metadata?.toolCall?.toolType === "file_change",
    );
    const fileChangeResult = messages.find(
      (m) => m.kind === "tool-result" && m.metadata?.toolResult?.filesChanged,
    );
    expect(fileChangeCall).toBeDefined();
    expect(fileChangeResult?.metadata?.toolResult?.filesChanged).toEqual([
      "README.md",
      "src/main.ts",
    ]);

    const mcpCall = messages.find(
      (m) => m.kind === "tool-call" && m.metadata?.toolCall?.toolType === "mcp",
    );
    expect(mcpCall?.metadata?.toolCall?.name).toContain("sentry.search_logs");
  });
});
