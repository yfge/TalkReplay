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
    expect(result.sessions.length).toBeGreaterThan(1);

    const firstSession = result.sessions.find(
      (session) =>
        session.metadata?.extra?.cursor?.generationUUID ===
        "cursor-sample-final-newline",
    );
    expect(firstSession).toBeDefined();
    expect(firstSession?.messages[0]?.role).toBe("user");
    expect(firstSession?.messages[0]?.content).toContain("final newline");
    expect(firstSession?.messages[1]?.role).toBe("assistant");
    expect(firstSession?.messages[1]?.content).toContain(
      "Cursor generated an update",
    );

    const toolSession = result.sessions.find(
      (session) =>
        session.metadata?.extra?.cursor?.generationUUID ===
        "cursor-sample-tool-invoke",
    );
    expect(toolSession).toBeDefined();
    const assistantMessage = toolSession?.messages.find(
      (message) => message.role === "assistant",
    );
    expect(assistantMessage?.content ?? "").toContain(
      "printf '\\n' >> \"$FILE\"",
    );
    expect(assistantMessage?.metadata?.attachments?.[0]?.language).toBe("py");

    const sourceFile = toolSession?.metadata?.sourceFile;
    expect(sourceFile).toBeDefined();
    if (sourceFile) {
      expect(result.signatures[sourceFile]).toBeDefined();
    }
  });

  it("parses via schema normaliser when enabled", async () => {
    process.env.NEXT_PUBLIC_SCHEMA_NORMALISER = "1";
    const result = await loadCursorSessions(cursorFixturesRoot, {}, new Map());
    delete process.env.NEXT_PUBLIC_SCHEMA_NORMALISER;
    expect(result.sessions.length).toBeGreaterThan(0);
    const session = result.sessions[0];
    expect(session.messages[0]?.metadata?.providerMessageType).toBe(
      "cursor.user",
    );
    const assistant = session.messages.find(
      (message) => message.role === "assistant",
    );
    expect(assistant?.metadata?.attachments?.length ?? 0).toBeGreaterThan(0);
    expect(
      result.sessions
        .map((s) =>
          s.messages
            .filter((m) => m.role === "assistant")
            .some((m) =>
              (m.content ?? "").includes("printf '\\n' >> \"$FILE\""),
            ),
        )
        .some(Boolean),
    ).toBe(true);
  });
});
