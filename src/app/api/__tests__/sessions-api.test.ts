import { describe, expect, it } from "vitest";

import { POST as sessionDetailPost } from "@/app/api/sessions/detail/route";
import { POST as sessionsPost } from "@/app/api/sessions/route";
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
}

interface SessionDetailResponse {
  session?: ChatSession;
  error?: unknown;
}

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
