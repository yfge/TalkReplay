import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";

import { parseCodexSessionFromString } from "@/lib/providers/codex";

describe("codex file_change diff and web_search", () => {
  it("captures diff in file_change result with hunks", async () => {
    const file = path.resolve(
      process.cwd(),
      "fixtures/codex/file_change_with_diff.jsonl",
    );
    const content = await fs.readFile(file, "utf8");
    const session = parseCodexSessionFromString(file, content);
    expect(session).not.toBeNull();
    const res = session!.messages.find((m) => m.kind === "tool-result");
    expect(res?.metadata?.toolResult?.filesChanged).toEqual(["src/app.ts"]);
    expect(res?.metadata?.toolResult?.diff).toContain("+++ b/src/app.ts");
    expect(
      res?.metadata?.toolResult?.diffFiles?.[0]?.hunks?.length,
    ).toBeGreaterThan(0);
  });

  it("maps web_search to tool-call/result with query/results", async () => {
    const file = path.resolve(process.cwd(), "fixtures/codex/web_search.jsonl");
    const content = await fs.readFile(file, "utf8");
    const session = parseCodexSessionFromString(file, content);
    expect(session).not.toBeNull();
    const call = session!.messages.find((m) => m.kind === "tool-call");
    const result = session!.messages.find((m) => m.kind === "tool-result");
    expect(call?.metadata?.toolCall?.toolType).toBe("web_search");
    expect(result?.content).toContain("codex cli docs");
  });
});
