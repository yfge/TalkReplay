import { homedir, platform } from "node:os";
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

async function pathExists(dir: string): Promise<boolean> {
  try {
    const fs = await import("node:fs/promises");
    const stats = await fs.stat(dir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function resolveDefaultProviderRoot(
  provider: ProviderId,
): Promise<string | undefined> {
  const home = homedir();
  const system = platform();
  const candidates: string[] = [];

  // Docker/Container defaults (also set in Dockerfile envs)
  candidates.push(`/app/data/${provider === "claude" ? "claude" : provider}`);

  // Generic home-based defaults per provider
  if (provider === "claude") {
    candidates.push(join(home, ".claude", "projects"));
  } else if (provider === "codex") {
    candidates.push(join(home, ".codex", "sessions"));
  } else if (provider === "gemini") {
    // Tentative default; adjust when canonical path is confirmed
    candidates.push(join(home, ".gemini", "logs"));
    candidates.push(join(home, ".gemini", "sessions"));
    candidates.push(join(home, ".gemini", "tmp"));
  }

  // Additional Windows-friendly mirrors (homedir already returns user profile)
  if (system === "win32") {
    if (provider === "claude") {
      candidates.push(join(home, "Documents", "Claude", "projects"));
    }
    if (provider === "codex") {
      candidates.push(join(home, "Documents", "Codex", "sessions"));
    }
  }

  for (const dir of candidates) {
    if (await pathExists(dir)) {
      return dir;
    }
  }
  return undefined;
}

export async function loadSessionsOnServer(
  paths: ProviderPaths,
  previousSignatures: Record<string, number>,
): Promise<{
  sessions: ChatSession[];
  signatures: Record<string, number>;
  errors: ProviderImportError[];
  resolvedPaths: ProviderPaths;
}> {
  const sessions: ChatSession[] = [];
  const signatures: Record<string, number> = {};
  const errors: ProviderImportError[] = [];
  const resolvedPaths: ProviderPaths = {};

  const previousByFile = new Map<string, ChatSession>();

  const claudeCandidate =
    paths.claude ?? (await resolveDefaultProviderRoot("claude"));
  const { path: claudeRoot, error: claudePathError } =
    await normalizeProviderRoot(claudeCandidate);
  if (claudePathError) {
    errors.push({ provider: "claude", reason: claudePathError });
  }
  if (claudeRoot) {
    resolvedPaths.claude = claudeRoot;
  } else if (paths.claude) {
    resolvedPaths.claude = paths.claude;
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

  const codexCandidate =
    paths.codex ?? (await resolveDefaultProviderRoot("codex"));
  const { path: codexRoot, error: codexPathError } =
    await normalizeProviderRoot(codexCandidate);
  if (codexPathError) {
    errors.push({ provider: "codex", reason: codexPathError });
  }
  if (codexRoot) {
    resolvedPaths.codex = codexRoot;
  } else if (paths.codex) {
    resolvedPaths.codex = paths.codex;
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

  const geminiCandidate =
    paths.gemini ?? (await resolveDefaultProviderRoot("gemini"));
  const { path: geminiRoot, error: geminiPathError } =
    await normalizeProviderRoot(geminiCandidate);
  if (geminiPathError) {
    errors.push({ provider: "gemini", reason: geminiPathError });
  }
  if (geminiRoot) {
    resolvedPaths.gemini = geminiRoot;
  } else if (paths.gemini) {
    resolvedPaths.gemini = paths.gemini;
  }
  if (geminiRoot) {
    try {
      const { loadGeminiSessions } = await import("@/lib/providers/gemini");
      const providerResult = await loadGeminiSessions(
        geminiRoot,
        filterProviderSignatures(previousSignatures, "gemini"),
        previousByFile,
      );
      sessions.push(...providerResult.sessions);
      errors.push(...providerResult.errors);
      for (const [file, signature] of Object.entries(
        providerResult.signatures,
      )) {
        signatures[signatureKey("gemini", file)] = signature;
      }
    } catch (error) {
      errors.push({
        provider: "gemini",
        reason:
          error instanceof Error
            ? error.message
            : "Failed to load Gemini sessions",
      });
    }
  }

  const usableSessions = sessions.length > 0 ? sessions : getSampleSessions();

  if (paths.gemini && !resolvedPaths.gemini) {
    resolvedPaths.gemini = paths.gemini;
  }

  return {
    sessions: usableSessions,
    signatures,
    errors,
    resolvedPaths,
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

  const { path: geminiRoot } = await normalizeProviderRoot(paths.gemini);
  if (geminiRoot && filePath.startsWith(geminiRoot)) {
    try {
      const { loadGeminiSessionFromFile } = await import(
        "@/lib/providers/gemini"
      );
      const session = await loadGeminiSessionFromFile(filePath);
      if (!session) {
        return {
          error: {
            provider: "gemini",
            reason: "Session not found",
          },
        };
      }
      return { session: { ...session, id: encodeSessionId(filePath) } };
    } catch (error) {
      return {
        error: {
          provider: "gemini",
          reason:
            error instanceof Error
              ? error.message
              : "Failed to load session detail",
        },
      };
    }
  }

  // Fallback: attempt to load by probing both providers when roots are not configured/matching
  try {
    const fs = await import("node:fs/promises");
    const stat = await fs.stat(filePath);
    if (stat.isFile()) {
      try {
        const { loadClaudeSessionFromFile } = await import(
          "@/lib/providers/claude"
        );
        const session = await loadClaudeSessionFromFile(filePath);
        if (session) {
          return { session: { ...session, id: encodeSessionId(filePath) } };
        }
      } catch {
        // ignore and try next
      }
      try {
        const { loadCodexSessionFromFile } = await import(
          "@/lib/providers/codex"
        );
        const session = await loadCodexSessionFromFile(filePath);
        if (session) {
          return { session: { ...session, id: encodeSessionId(filePath) } };
        }
      } catch {
        // ignore
      }
      try {
        const { loadGeminiSessionFromFile } = await import(
          "@/lib/providers/gemini"
        );
        const session = await loadGeminiSessionFromFile(filePath);
        if (session) {
          return { session: { ...session, id: encodeSessionId(filePath) } };
        }
      } catch {
        // ignore
      }
    }
  } catch {
    // stat/read failed, fall through to error
  }

  return {
    error: {
      provider: "claude",
      reason: "Unknown provider for provided session path",
    },
  };
}
