import { NextResponse } from "next/server";

import { loadSessionsOnServer } from "@/lib/session-loader/server";
import type {
  LoadProjectsPayload,
  LoadProjectsResult,
  ProjectEntry,
} from "@/lib/session-loader/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as LoadProjectsPayload;
    const { sessions } = await loadSessionsOnServer(
      payload.paths,
      payload.previousSignatures ?? {},
    );
    const counts = new Map<string, number>();
    for (const s of sessions) {
      const name = s.metadata?.project;
      if (!name) continue;
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    const projects: ProjectEntry[] = Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ projects } satisfies LoadProjectsResult);
  } catch {
    return NextResponse.json({ projects: [] } satisfies LoadProjectsResult, {
      status: 500,
    });
  }
}
