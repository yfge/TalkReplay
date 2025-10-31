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

function getDefaultProviderCandidates(provider: ProviderId): string[] {
  const home = homedir();
  const system = platform();
  const candidates: string[] = [];

  if (provider === "claude") {
    candidates.push(join(home, ".claude", "projects"));
  } else if (provider === "codex") {
    candidates.push(join(home, ".codex", "sessions"));
  } else if (provider === "gemini") {
    candidates.push(join(home, ".gemini", "tmp"));
    candidates.push(join(home, ".gemini", "logs"));
    candidates.push(join(home, ".gemini", "sessions"));
  } else if (provider === "cursor") {
    if (system === "darwin") {
      candidates.push(join(home, "Library", "Application Support", "Cursor"));
    } else {
      candidates.push(join(home, ".config", "Cursor"));
    }
  }

  if (system === "win32") {
    if (provider === "claude") {
      candidates.push(join(home, "Documents", "Claude", "projects"));
    } else if (provider === "codex") {
      candidates.push(join(home, "Documents", "Codex", "sessions"));
    } else if (provider === "cursor") {
      candidates.push(join(home, "AppData", "Roaming", "Cursor"));
    }
  }

  const dockerPath = `/app/data/${provider === "claude" ? "claude" : provider}`;
  candidates.push(dockerPath);

  return candidates;
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

export async function resolveDefaultProviderRoot(
  provider: ProviderId,
): Promise<string | undefined> {
  const candidates = getDefaultProviderCandidates(provider);

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
  }
  if (!resolvedPaths.claude && paths.claude) {
    resolvedPaths.claude = paths.claude;
  }
  if (!resolvedPaths.claude) {
    const defaults = getDefaultProviderCandidates("claude");
    const suggestion = defaults.find(Boolean);
    if (suggestion) {
      resolvedPaths.claude = suggestion;
    }
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
  }
  if (!resolvedPaths.codex && paths.codex) {
    resolvedPaths.codex = paths.codex;
  }
  if (!resolvedPaths.codex) {
    const defaults = getDefaultProviderCandidates("codex");
    const suggestion = defaults.find(Boolean);
    if (suggestion) {
      resolvedPaths.codex = suggestion;
    }
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

  const cursorCandidate =
    paths.cursor ?? (await resolveDefaultProviderRoot("cursor"));
  const { path: cursorRoot, error: cursorPathError } =
    await normalizeProviderRoot(cursorCandidate);
  if (cursorPathError) {
    errors.push({ provider: "cursor", reason: cursorPathError });
  }
  if (cursorRoot) {
    resolvedPaths.cursor = cursorRoot;
  }
  if (!resolvedPaths.cursor && paths.cursor) {
    resolvedPaths.cursor = paths.cursor;
  }
  if (!resolvedPaths.cursor) {
    const defaults = getDefaultProviderCandidates("cursor");
    const suggestion = defaults.find(Boolean);
    if (suggestion) {
      resolvedPaths.cursor = suggestion;
    }
  }
  if (cursorRoot) {
    try {
      const { loadCursorSessions } = await import("@/lib/providers/cursor");
      const providerResult = await loadCursorSessions(
        cursorRoot,
        filterProviderSignatures(previousSignatures, "cursor"),
        previousByFile,
      );
      sessions.push(...providerResult.sessions);
      errors.push(...providerResult.errors);
      for (const [file, signature] of Object.entries(
        providerResult.signatures,
      )) {
        signatures[signatureKey("cursor", file)] = signature;
      }
    } catch (error) {
      errors.push({
        provider: "cursor",
        reason:
          error instanceof Error
            ? error.message
            : "Failed to load Cursor sessions",
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
  }
  if (!resolvedPaths.gemini && paths.gemini) {
    resolvedPaths.gemini = paths.gemini;
  }
  if (!resolvedPaths.gemini) {
    const defaults = getDefaultProviderCandidates("gemini");
    const suggestion = defaults.find(Boolean);
    if (suggestion) {
      resolvedPaths.gemini = suggestion;
    }
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

  const { path: cursorRoot } = await normalizeProviderRoot(paths.cursor);
  if (cursorRoot && filePath.startsWith(cursorRoot)) {
    try {
      const { loadCursorSessionFromFile } = await import(
        "@/lib/providers/cursor"
      );
      const session = await loadCursorSessionFromFile(filePath);
      if (!session) {
        return {
          error: {
            provider: "cursor",
            reason: "Session not found",
          },
        };
      }
      return { session: { ...session, id: encodeSessionId(filePath) } };
    } catch (error) {
      return {
        error: {
          provider: "cursor",
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
      try {
        const { loadCursorSessionFromFile } = await import(
          "@/lib/providers/cursor"
        );
        const session = await loadCursorSessionFromFile(filePath);
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
