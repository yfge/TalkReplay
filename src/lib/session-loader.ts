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

async function resolveDefaultPath(
  current: string | undefined,
  guesses: string[],
): Promise<string | undefined> {
  if (current && current.trim().length > 0) {
    return current.trim();
  }

  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  for (const guess of guesses) {
    const candidate = guess.startsWith("~")
      ? path.join(process.env.HOME ?? "", guess.slice(1))
      : guess;
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // ignore missing candidate
    }
  }

  return undefined;
}

export async function loadSessionsFromProviders(
  paths: ProviderPaths,
): Promise<ChatSession[]> {
  if (typeof window !== "undefined") {
    return filteredSampleSessions();
  }

  const sessions: ChatSession[] = [];

  const claudeRoot = await resolveDefaultPath(paths.claudeRoot, [
    "~/.claude/projects",
    "~/.local/share/claude/projects",
  ]);
  if (claudeRoot) {
    try {
      const { loadClaudeSessions } = await import("@/lib/providers/claude");
      sessions.push(...(await loadClaudeSessions(claudeRoot)));
    } catch {
      // ignore failures and continue with other providers
    }
  }

  const codexRoot = await resolveDefaultPath(paths.codexRoot, [
    "~/.codex/sessions",
  ]);
  if (codexRoot) {
    try {
      const { loadCodexSessions } = await import("@/lib/providers/codex");
      sessions.push(...(await loadCodexSessions(codexRoot)));
    } catch {
      // ignore failures
    }
  }

  if (sessions.length === 0) {
    return filteredSampleSessions();
  }

  return sessions;
}
