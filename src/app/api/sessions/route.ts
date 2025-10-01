import { NextResponse } from "next/server";

import { loadSessionsOnServer } from "@/lib/session-loader/server";
import type { LoadSessionsPayload } from "@/lib/session-loader/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LoadSessionsPayload;
    const result = await loadSessionsOnServer(
      payload.paths,
      payload.previousSignatures,
      payload.previousSessions,
    );
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load chat sessions";
    return NextResponse.json(
      {
        sessions: [],
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
