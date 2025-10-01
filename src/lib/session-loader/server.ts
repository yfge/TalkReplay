import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

import type { ProviderPaths } from "@/config/providerPaths";
import { encodeSessionId } from "@/lib/session-loader/ids";
import { getSampleSessions } from "@/lib/session-loader/sample";
import type { ChatSession } from "@/types/chat";
import type { ProviderId, ProviderImportError } from "@/types/providers";

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

function expandHomePath(rawPath: string): string {
  if (rawPath === "~") {
    return homedir();
  }
  if (rawPath.startsWith("~/") || rawPath.startsWith("~\\")) {
    return join(homedir(), rawPath.slice(2));
  }
  return rawPath;
}

export async function normalizeProviderRoot(
  rawPath?: string,
): Promise<{ path?: string; error?: string }> {
  if (!rawPath) {
    return { path: undefined };
  }

  const trimmed = rawPath.trim();
  if (trimmed.length === 0) {
    return { path: undefined };
  }

  const expanded = expandHomePath(trimmed);
  const normalized = isAbsolute(expanded) ? expanded : resolve(expanded);

  try {
    const stats = await (await import("node:fs/promises")).stat(normalized);
    if (!stats.isDirectory()) {
      return { error: `${normalized} is not a directory` };
    }
    return { path: normalized };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Directory is not accessible",
    };
  }
}

export async function loadSessionsOnServer(
  paths: ProviderPaths,
  previousSignatures: Record<string, number>,
): Promise<{
  sessions: ChatSession[];
  signatures: Record<string, number>;
  errors: ProviderImportError[];
}> {
  const sessions: ChatSession[] = [];
  const signatures: Record<string, number> = {};
  const errors: ProviderImportError[] = [];

  const previousByFile = new Map<string, ChatSession>();

  const { path: claudeRoot, error: claudePathError } =
    await normalizeProviderRoot(paths.claude);
  if (claudePathError) {
    errors.push({ provider: "claude", reason: claudePathError });
  }
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

  const { path: codexRoot, error: codexPathError } =
    await normalizeProviderRoot(paths.codex);
  if (codexPathError) {
    errors.push({ provider: "codex", reason: codexPathError });
  }
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

  const usableSessions = sessions.length > 0 ? sessions : getSampleSessions();

  return {
    sessions: usableSessions,
    signatures,
    errors,
  };
}

export async function loadSessionDetail(
  paths: ProviderPaths,
  filePath: string,
): Promise<{ session?: ChatSession; error?: ProviderImportError }> {
  const { path: claudeRoot } = await normalizeProviderRoot(paths.claude);
  if (claudeRoot && filePath.startsWith(claudeRoot)) {
    try {
      const { loadClaudeSessionFromFile } = await import(
        "@/lib/providers/claude"
      );
      const session = await loadClaudeSessionFromFile(filePath);
      if (!session) {
        return {
          error: {
            provider: "claude",
            reason: "Session not found",
          },
        };
      }
      return { session: { ...session, id: encodeSessionId(filePath) } };
    } catch (error) {
      return {
        error: {
          provider: "claude",
          reason:
            error instanceof Error
              ? error.message
              : "Failed to load session detail",
        },
      };
    }
  }

  const { path: codexRoot } = await normalizeProviderRoot(paths.codex);
  if (codexRoot && filePath.startsWith(codexRoot)) {
    try {
      const { loadCodexSessionFromFile } = await import(
        "@/lib/providers/codex"
      );
      const session = await loadCodexSessionFromFile(filePath);
      if (!session) {
        return {
          error: {
            provider: "codex",
            reason: "Session not found",
          },
        };
      }
      return { session: { ...session, id: encodeSessionId(filePath) } };
    } catch (error) {
      return {
        error: {
          provider: "codex",
          reason:
            error instanceof Error
              ? error.message
              : "Failed to load session detail",
        },
      };
    }
  }

  return {
    error: {
      provider: "claude",
      reason: "Unknown provider for provided session path",
    },
  };
}
