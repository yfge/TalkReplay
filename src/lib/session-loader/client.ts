import { getSampleSessions } from "@/lib/session-loader/sample";

import type { LoadSessionsPayload, LoadSessionsResult } from "./types";

export async function loadSessionsFromProviders(
  paths: LoadSessionsPayload["paths"],
  previousSignatures: LoadSessionsPayload["previousSignatures"],
  previousSessions: LoadSessionsPayload["previousSessions"],
): Promise<LoadSessionsResult> {
  const payload: LoadSessionsPayload = {
    paths,
    previousSignatures,
    previousSessions,
  };

  try {
    const baseUrl =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "http://localhost:3000";

    const response = await fetch(new URL("/api/sessions", baseUrl), {
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

    const result = (await response.json()) as LoadSessionsResult;
    return result;
  } catch (error) {
    console.error("Failed to load sessions", error);
    return {
      sessions: getSampleSessions(),
      signatures: previousSignatures,
      errors: [
        {
          provider: "claude",
          reason: error instanceof Error ? error.message : "Unknown error",
        },
      ],
    };
  }
}
