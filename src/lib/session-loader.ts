import type { ProviderPaths } from "@/config/providerPaths";
import type { ChatSession } from "@/types/chat";
// eslint-disable-next-line import/order
import { sampleSessions } from "@/data/sampleSessions";

export async function loadSessionsFromProviders(
  paths: ProviderPaths,
): Promise<ChatSession[]> {
  if (typeof window !== "undefined") {
    return sampleSessions;
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
    return sampleSessions;
  }

  return sessions;
}
