import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

import type { ProviderPaths } from "@/config/providerPaths";
import { getSampleSessions } from "@/lib/session-loader/sample";
import type { ChatSession } from "@/types/chat";
import type { ProviderId } from "@/types/providers";

import type { LoadSessionsResult } from "./types";

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

async function normalizeProviderRoot(
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
  previousSessions: ChatSession[],
): Promise<LoadSessionsResult> {
  const sessions: ChatSession[] = [];
  const signatures: Record<string, number> = {};
  const errors: LoadSessionsResult["errors"] = [];

  const previousByFile = new Map<string, ChatSession>();
  for (const session of previousSessions) {
    const filePath = session.metadata?.sourceFile;
    if (filePath) {
      previousByFile.set(filePath, session);
    }
  }

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

  const dedupedSessions = sessions.length > 0 ? sessions : getSampleSessions();

  return {
    sessions: dedupedSessions,
    signatures,
    errors,
  };
}
