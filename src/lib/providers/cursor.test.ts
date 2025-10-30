import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { loadCursorSessions } from "@/lib/providers/cursor";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cursorFixturesRoot = path.resolve(
  __dirname,
  "../../../fixtures/cursor/sample-root",
);

describe("cursor provider", () => {
  it("parses workspace storage and history artifacts", async () => {
    const result = await loadCursorSessions(cursorFixturesRoot, {}, new Map());
    expect(result.sessions.length).toBeGreaterThan(0);
    const session = result.sessions[0];
    expect(session.source).toBe("cursor");
    expect(session.messages[0]?.role).toBe("user");
    expect(session.messages[0]?.content).toContain("final newline");
    expect(session.messages[1]?.role).toBe("assistant");
    expect(session.messages[1]?.content).toContain(
      "Cursor generated an update",
    );
    const sourceFile = session.metadata?.sourceFile;
    expect(sourceFile).toBeDefined();
    if (sourceFile) {
      expect(result.signatures[sourceFile]).toBeDefined();
    }
  });
});
