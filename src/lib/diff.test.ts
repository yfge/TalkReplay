import { describe, expect, it } from "vitest";

import { parseUnifiedDiff } from "@/lib/diff";

const SAMPLE = `--- a/src/app.ts\n+++ b/src/app.ts\n@@ -1,1 +1,1 @@\n-console.log('Hello')\n+console.log('Hello world')\n`;

describe("parseUnifiedDiff", () => {
  it("parses basic hunks", () => {
    const files = parseUnifiedDiff(SAMPLE);
    expect(files.length).toBeGreaterThan(0);
    const f = files[0];
    expect(f).toBeDefined();
    expect(f?.oldPath ?? "").toContain("a/src/app.ts");
    expect(f?.newPath ?? "").toContain("b/src/app.ts");
    expect(f?.hunks?.[0]?.lines.some((l) => l.type === "add")).toBe(true);
  });
});
