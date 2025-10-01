import type { ProviderPaths } from "@/config/providerPaths";
import { SUPPORTED_SOURCES, type ChatSession } from "@/types/chat";
// eslint-disable-next-line import/order
import { sampleSessions } from "@/data/sampleSessions";

function filteredSampleSessions(): ChatSession[] {
  const allowed = new Set<string>(SUPPORTED_SOURCES);
  const filtered = sampleSessions.filter((session) =>
    allowed.has(session.source),
  );
  return filtered.length > 0 ? filtered : sampleSessions;
}

export async function loadSessionsFromProviders(
  paths: ProviderPaths,
): Promise<ChatSession[]> {
  if (typeof window !== "undefined") {
    return filteredSampleSessions();
  }

  const sessions: ChatSession[] = [];

  if (paths.claudeRoot) {
    try {
      const { loadClaudeSessions } = await import("@/lib/providers/claude");
      sessions.push(...(await loadClaudeSessions(paths.claudeRoot)));
    } catch {
      // ignore failures and continue with other providers
    }
  }

  if (paths.codexRoot) {
    try {
      const { loadCodexSessions } = await import("@/lib/providers/codex");
      sessions.push(...(await loadCodexSessions(paths.codexRoot)));
    } catch {
      // ignore failures
    }
  }

  if (sessions.length === 0) {
    return filteredSampleSessions();
  }

  return sessions;
}
