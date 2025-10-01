import { encodeSessionId } from "@/lib/session-loader/ids";
import { getSampleSessions } from "@/lib/session-loader/sample";
import type { ChatSession, ChatSessionSummary } from "@/types/chat";

import type {
  LoadSessionDetailPayload,
  LoadSessionDetailResult,
  LoadSessionSummariesPayload,
  LoadSessionSummariesResult,
} from "./types";

function toSummary(session: ChatSession): ChatSessionSummary {
  const sourceFile = session.metadata?.sourceFile ?? session.id;
  return {
    id: encodeSessionId(sourceFile),
    source: session.source,
    topic: session.topic,
    startedAt: session.startedAt,
    participants: session.participants,
    metadata: session.metadata,
    preview: session.messages[0]?.content,
    messageCount: session.messages.length,
  };
}

function getBaseUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "http://localhost:3000";
}

export async function fetchSessionSummaries(
  payload: LoadSessionSummariesPayload,
): Promise<LoadSessionSummariesResult> {
  try {
    const response = await fetch(new URL("/api/sessions", getBaseUrl()), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Failed to load sessions: ${response.status}`);
    }

    const result = (await response.json()) as LoadSessionSummariesResult;
    return result;
  } catch (error) {
    console.error("Failed to load sessions", error);
    const sessions = getSampleSessions().map(toSummary);
    return {
      sessions,
      signatures: payload.previousSignatures,
      errors: [
        {
          provider: "claude",
          reason: error instanceof Error ? error.message : "Unknown error",
        },
      ],
    } satisfies LoadSessionSummariesResult;
  }
}

export async function fetchSessionDetail(
  payload: LoadSessionDetailPayload,
): Promise<ChatSession | null> {
  try {
    const response = await fetch(
      new URL("/api/sessions/detail", getBaseUrl()),
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to load session detail: ${response.status}`);
    }

    const result = (await response.json()) as LoadSessionDetailResult;
    if (result.session) {
      return result.session;
    }
    throw new Error(
      result.error?.reason ?? "Session detail response did not include data",
    );
  } catch (error) {
    console.error("Failed to load session detail", error);
    throw error instanceof Error
      ? error
      : new Error("Failed to load session detail");
  }
}
