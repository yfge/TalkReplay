import { NextResponse } from "next/server";

import { decodeSessionId, encodeSessionId } from "@/lib/session-loader/ids";
import { getSampleSessions } from "@/lib/session-loader/sample";
import { loadSessionDetail } from "@/lib/session-loader/server";
import type {
  LoadSessionDetailPayload,
  LoadSessionDetailResult,
} from "@/lib/session-loader/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LoadSessionDetailPayload;
    const sampleMatch = getSampleSessions().find((session) => {
      const sourceFile = session.metadata?.sourceFile ?? session.id;
      const encoded = encodeSessionId(sourceFile);
      return encoded === payload.id;
    });
    if (sampleMatch) {
      return NextResponse.json({
        session: {
          ...sampleMatch,
          id: encodeSessionId(
            sampleMatch.metadata?.sourceFile ?? sampleMatch.id,
          ),
        },
      } satisfies LoadSessionDetailResult);
    }

    const filePath = decodeSessionId(payload.id);
    const result = await loadSessionDetail(payload.paths, filePath);
    return NextResponse.json(result satisfies LoadSessionDetailResult);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load session detail";
    return NextResponse.json(
      {
        error: {
          provider: "claude",
          reason: message,
        },
      } satisfies LoadSessionDetailResult,
      { status: 500 },
    );
  }
}
