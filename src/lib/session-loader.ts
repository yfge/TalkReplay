import type { ProviderPaths } from "@/config/providerPaths";
import { SUPPORTED_SOURCES, type ChatSession } from "@/types/chat";
import type { ProviderImportError, ProviderId } from "@/types/providers";
// eslint-disable-next-line import/order
import { sampleSessions } from "@/data/sampleSessions";

export interface LoadSessionsResult {
  sessions: ChatSession[];
  signatures: Record<string, number>;
  errors: ProviderImportError[];
}

function filteredSampleSessions(): ChatSession[] {
  const allowed = new Set<string>(SUPPORTED_SOURCES);
  const filtered = sampleSessions.filter((session) =>
    allowed.has(session.source),
  );
  return filtered.length > 0 ? filtered : sampleSessions;
}

function signatureKey(provider: ProviderId, filePath: string): string {
  return `${provider}:${filePath}`;
}

function filterProviderSignatures(
  signatures: Record<string, number>,
  provider: ProviderId,
): Record<string, number> {
  const result: Record<string, number> = {};
  const prefix = `${provider}:`;
  for (const [key, value] of Object.entries(signatures)) {
    if (key.startsWith(prefix)) {
      result[key.slice(prefix.length)] = value;
    }
  }
  return result;
}

export async function loadSessionsFromProviders(
  paths: ProviderPaths,
  previousSignatures: Record<string, number>,
  previousSessions: ChatSession[],
): Promise<LoadSessionsResult> {
  if (typeof window !== "undefined") {
    return {
      sessions: filteredSampleSessions(),
      signatures: previousSignatures,
      errors: [],
    };
  }

  const sessions: ChatSession[] = [];
  const signatures: Record<string, number> = {};
  const errors: ProviderImportError[] = [];

  const previousByFile = new Map<string, ChatSession>();
  for (const session of previousSessions) {
    const filePath = session.metadata?.sourceFile;
    if (filePath) {
      previousByFile.set(filePath, session);
    }
  }

  const claudeRoot = paths.claudeRoot;
  if (claudeRoot) {
    try {
      const { loadClaudeSessions } = await import("@/lib/providers/claude");
      const providerResult = await loadClaudeSessions(
        claudeRoot,
        filterProviderSignatures(previousSignatures, "claude"),
        previousByFile,
      );
      sessions.push(...providerResult.sessions);
      errors.push(...providerResult.errors);
      for (const [file, signature] of Object.entries(
        providerResult.signatures,
      )) {
        signatures[signatureKey("claude", file)] = signature;
      }
    } catch (error) {
      errors.push({
        provider: "claude",
        reason:
          error instanceof Error
            ? error.message
            : "Failed to load Claude sessions",
      });
    }
  }

  const codexRoot = paths.codexRoot;
  if (codexRoot) {
    try {
      const { loadCodexSessions } = await import("@/lib/providers/codex");
      const providerResult = await loadCodexSessions(
        codexRoot,
        filterProviderSignatures(previousSignatures, "codex"),
        previousByFile,
      );
      sessions.push(...providerResult.sessions);
      errors.push(...providerResult.errors);
      for (const [file, signature] of Object.entries(
        providerResult.signatures,
      )) {
        signatures[signatureKey("codex", file)] = signature;
      }
    } catch (error) {
      errors.push({
        provider: "codex",
        reason:
          error instanceof Error
            ? error.message
            : "Failed to load Codex sessions",
      });
    }
  }

  const dedupedSessions =
    sessions.length > 0 ? sessions : filteredSampleSessions();

  return {
    sessions: dedupedSessions,
    signatures,
    errors,
  };
}
