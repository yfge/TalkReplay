import { NextResponse } from "next/server";

import { encodeSessionId } from "@/lib/session-loader/ids";
import { getSampleSessions } from "@/lib/session-loader/sample";
import {
  loadSessionsOnServer,
  normalizeProviderRoot,
  resolveDefaultProviderRoot,
} from "@/lib/session-loader/server";
import type { LoadSessionSummariesPayload } from "@/lib/session-loader/types";
import type { ChatSession } from "@/types/chat";
import type { ProviderImportError } from "@/types/providers";

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
  let payload: LoadSessionSummariesPayload;
  try {
    payload = (await request.json()) as LoadSessionSummariesPayload;
  } catch (unknownError) {
    const message =
      unknownError instanceof Error
        ? unknownError.message
        : "Failed to load chat sessions";
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
        resolvedPaths: {},
      },
      { status: 400 },
    );
  }

  try {
    const payloadDebugFlag = (payload as unknown as { __debug?: unknown })
      .__debug;
    const includeDebug =
      typeof payloadDebugFlag === "boolean" ? payloadDebugFlag : false;
    const result = await loadSessionsOnServer(
      payload.paths,
      payload.previousSignatures,
    );
    const summaries = result.sessions.map(toSummary);
    const responseBody: Record<string, unknown> = {
      sessions: summaries,
      signatures: result.signatures,
      errors: result.errors,
      resolvedPaths: result.resolvedPaths,
    };
    if (includeDebug) {
      (
        globalThis as typeof globalThis & {
          __cursorDebugSqlErrors?: string[];
        }
      ).__cursorDebugSqlErrors = [];
      const defaultCursorRoot = await resolveDefaultProviderRoot("cursor");
      const normalizedCursorRoot = await normalizeProviderRoot(
        result.resolvedPaths.cursor,
      );
      let cursorSessionCount: number | null = null;
      let cursorLoadError: string | undefined;
      let cursorLoadErrors: ProviderImportError[] | undefined;
      let workspaceDirStatus: boolean | string = "unknown";
      let workspaceEntries: string[] | undefined;
      const cursorSqlErrorsBefore =
        (
          globalThis as typeof globalThis & {
            __cursorDebugSqlErrors?: string[];
          }
        ).__cursorDebugSqlErrors ?? [];
      try {
        if (normalizedCursorRoot.path) {
          const fs = await import("node:fs/promises");
          const path = await import("node:path");
          const workspaceDir = path.join(
            normalizedCursorRoot.path,
            "User",
            "workspaceStorage",
          );
          try {
            const stats = await fs.stat(workspaceDir);
            workspaceDirStatus = stats.isDirectory()
              ? true
              : "workspaceStorage exists but is not a directory";
            if (workspaceDirStatus === true) {
              workspaceEntries = await fs.readdir(workspaceDir);
            }
          } catch (error) {
            workspaceDirStatus =
              error instanceof Error ? error.message : "stat failed";
          }
          const { loadCursorSessions } = await import("@/lib/providers/cursor");
          const debugResult = await loadCursorSessions(
            normalizedCursorRoot.path,
            {},
            new Map(),
          );
          cursorSessionCount = debugResult.sessions.length;
          cursorLoadErrors = debugResult.errors;
        }
      } catch (error) {
        cursorLoadError =
          error instanceof Error ? error.message : "Unknown cursor load error";
      }
      const cursorSqlErrors =
        (
          globalThis as typeof globalThis & {
            __cursorDebugSqlErrors?: string[];
          }
        ).__cursorDebugSqlErrors ?? cursorSqlErrorsBefore;
      responseBody.debug = {
        defaultCursorRoot,
        normalizedCursorRoot,
        cursorSessionCount,
        cursorLoadError,
        cursorLoadErrors,
        workspaceDirStatus,
        workspaceEntries,
        cursorSqlErrors,
        cursorErrors: result.errors.filter(
          (errorItem) => errorItem.provider === "cursor",
        ),
        sources: result.sessions.reduce<Record<string, number>>((acc, item) => {
          acc[item.source] = (acc[item.source] ?? 0) + 1;
          return acc;
        }, {}),
      };
    }
    return NextResponse.json(responseBody);
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
        resolvedPaths: payload.paths,
      },
      { status: 500 },
    );
  }
}
