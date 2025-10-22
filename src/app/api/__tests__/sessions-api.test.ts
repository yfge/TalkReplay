import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { POST as sessionDetailPost } from "@/app/api/sessions/detail/route";
import { POST as sessionsPost } from "@/app/api/sessions/route";
import type { ProviderPaths } from "@/config/providerPaths";
import { encodeSessionId } from "@/lib/session-loader/ids";
import { getSampleSessions } from "@/lib/session-loader/sample";
import type { ChatSession, ChatSessionSummary } from "@/types/chat";

async function callRoute<T>(
  handler: (request: Request) => Promise<Response>,
  url: string,
  body: unknown,
): Promise<T> {
  const request = new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const response = await handler(request);
  expect(response.ok).toBe(true);
  return (await response.json()) as T;
}

async function callRouteRaw(
  handler: (request: Request) => Promise<Response>,
  url: string,
  body: unknown,
) {
  const request = new Request(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return handler(request);
}

interface SessionsResponse {
  sessions: ChatSessionSummary[];
  signatures: Record<string, number>;
  errors: unknown[];
  resolvedPaths: ProviderPaths;
}

interface SessionDetailResponse {
  session?: ChatSession;
  error?: unknown;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesRoot = path.resolve(__dirname, "../../../../fixtures");
describe("/api/sessions", () => {
  it("returns normalised summaries", async () => {
    const payload = {
      paths: { claude: undefined, codex: undefined },
      previousSignatures: {},
    };

    const result = await callRoute<SessionsResponse>(
      sessionsPost,
      "http://localhost/api/sessions",
      payload,
    );

    expect(result.sessions.length).toBeGreaterThan(0);
    expect(result.resolvedPaths).toBeDefined();
    result.sessions.forEach((summary) => {
      expect(typeof summary.id).toBe("string");
      expect(summary.source).toMatch(/claude|codex/);
      expect(summary.topic).toBeTruthy();
      expect(summary.startedAt).toBeTruthy();
      expect(Array.isArray(summary.participants)).toBe(true);
      expect(summary.messageCount).toBeGreaterThan(0);
      expect(summary.preview ?? summary.topic).toBeTruthy();
    });
  });

  it("surfaces provider errors when directories are invalid", async () => {
    const result = await callRoute<SessionsResponse>(
      sessionsPost,
      "http://localhost/api/sessions",
      {
        paths: { claude: "/not-a-real-path", codex: undefined },
        previousSignatures: {},
      },
    );

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.sessions.length).toBeGreaterThan(0);
  });
});

describe("/api/sessions/detail", () => {
  it("round trips sample sessions with consistent message kinds", async () => {
    const samples = getSampleSessions();
    expect(samples.length).toBeGreaterThan(0);

    await Promise.all(
      samples.map(async (sample) => {
        const encodedId = encodeSessionId(
          sample.metadata?.sourceFile ?? sample.id,
        );
        const payload = {
          id: encodedId,
          paths: { claude: undefined, codex: undefined },
        };

        const result = await callRoute<SessionDetailResponse>(
          sessionDetailPost,
          "http://localhost/api/sessions/detail",
          payload,
        );

        expect(result.session).toBeDefined();
        const detail = result.session;
        if (!detail) {
          throw new Error("session detail is undefined in test");
        }
        expect(detail.id).toBe(encodedId);
        expect(detail.source).toBe(sample.source);
        expect(detail.messages.length).toBeGreaterThan(0);

        detail.messages.forEach((message) => {
          expect(message.kind).toMatch(
            /content|reasoning|tool-call|tool-result|system/,
          );
          expect(message.role).toMatch(/user|assistant|system|tool/);
          expect(message.timestamp).toBeTruthy();
        });
      }),
    );
  });

  it("returns error payload for unknown session id", async () => {
    const response = await callRouteRaw(
      sessionDetailPost,
      "http://localhost/api/sessions/detail",
      {
        id: encodeSessionId("/tmp/does-not-exist.jsonl"),
        paths: { claude: undefined, codex: undefined },
      },
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as SessionDetailResponse;
    expect(payload.session).toBeUndefined();
    expect(payload.error).toBeDefined();
  });
});

describe("fixtures", () => {
  it("parse tool and reasoning events from claude and codex fixtures", async () => {
    const fs = await import("node:fs/promises");
    const tempRoot = await fs.mkdtemp(path.join(tmpdir(), "session-fixture-"));
    try {
      const claudeSource = path.join(
        fixturesRoot,
        "claude/project-tool/tool-session.jsonl",
      );
      const claudeDir = path.join(tempRoot, "claude/project-tool");
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(
        path.join(claudeDir, "tool-session.jsonl"),
        await fs.readFile(claudeSource, "utf8"),
        "utf8",
      );

      const codexSource = path.join(
        fixturesRoot,
        "codex/2025/01/01/tool-session.jsonl",
      );
      const codexDir = path.join(tempRoot, "codex/2025/01/01");
      await fs.mkdir(codexDir, { recursive: true });
      await fs.writeFile(
        path.join(codexDir, "tool-session.jsonl"),
        await fs.readFile(codexSource, "utf8"),
        "utf8",
      );

      const paths = {
        claude: path.join(tempRoot, "claude"),
        codex: path.join(tempRoot, "codex"),
      } as const;

      const result = await callRoute<SessionsResponse>(
        sessionsPost,
        "http://localhost/api/sessions",
        {
          paths,
          previousSignatures: {},
        },
      );

      const claudeSummary = result.sessions.find(
        (summary) =>
          summary.source === "claude" &&
          summary.topic === "Fixture: Claude tool session",
      );
      expect(claudeSummary).toBeDefined();

      const claudeDetail = await callRoute<SessionDetailResponse>(
        sessionDetailPost,
        "http://localhost/api/sessions/detail",
        {
          id: claudeSummary!.id,
          paths,
        },
      );

      expect(
        claudeDetail.session?.messages.some(
          (message) => message.kind === "tool-call",
        ),
      ).toBe(true);
      expect(
        claudeDetail.session?.messages.some(
          (message) => message.kind === "tool-result",
        ),
      ).toBe(true);

      const codexSummary = result.sessions.find(
        (summary) =>
          summary.source === "codex" &&
          summary.metadata?.summary === "Fixture: Codex tool session",
      );
      expect(codexSummary).toBeDefined();

      const codexDetail = await callRoute<SessionDetailResponse>(
        sessionDetailPost,
        "http://localhost/api/sessions/detail",
        {
          id: codexSummary!.id,
          paths,
        },
      );

      expect(
        codexDetail.session?.messages.some(
          (message) => message.kind === "reasoning",
        ),
      ).toBe(true);
      expect(
        codexDetail.session?.messages.some(
          (message) => message.kind === "tool-call",
        ),
      ).toBe(true);
      expect(
        codexDetail.session?.messages.some(
          (message) => message.kind === "tool-result",
        ),
      ).toBe(true);
    } finally {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });
});
