import { NextResponse } from "next/server";

import { encodeSessionId } from "@/lib/session-loader/ids";
import { getSampleSessions } from "@/lib/session-loader/sample";
import { loadSessionsOnServer } from "@/lib/session-loader/server";
import type { LoadSessionSummariesPayload } from "@/lib/session-loader/types";
import type { ChatSession } from "@/types/chat";

function toSummary(session: ChatSession) {
  const sourceFile = session.metadata?.sourceFile ?? session.id;
  const previewMessage = session.messages.find(
    (message) => message.kind === "content" && message.content,
  );
  return {
    id: encodeSessionId(sourceFile),
    source: session.source,
    topic: session.topic,
    startedAt: session.startedAt,
    participants: session.participants,
    metadata: session.metadata,
    preview:
      previewMessage?.content ?? session.metadata?.summary ?? session.topic,
    messageCount: session.messages.length,
  };
}

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LoadSessionSummariesPayload;
    const result = await loadSessionsOnServer(
      payload.paths,
      payload.previousSignatures,
    );
    const summaries = result.sessions.map(toSummary);
    return NextResponse.json({
      sessions: summaries,
      signatures: result.signatures,
      errors: result.errors,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load chat sessions";
    return NextResponse.json(
      {
        sessions: getSampleSessions().map(toSummary),
        signatures: {},
        errors: [
          {
            provider: "claude",
            reason: message,
          },
        ],
      },
      { status: 500 },
    );
  }
}
