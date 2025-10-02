import type { Dirent } from "node:fs";
import path from "node:path";

import type { ProviderLoadResult } from "@/lib/providers/types";
import type {
  ChatMessage,
  ChatRole,
  ChatSession,
  MessageMetadata,
  SessionMetadata,
  TokenUsage,
} from "@/types/chat";
import type { ProviderImportError } from "@/types/providers";

interface ClaudeUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}

interface ClaudeMessageContentText {
  type: "text";
  text: string;
}

interface ClaudeMessageContentToolUse {
  type: "tool_use";
  id: string;
  name?: string;
  input?: unknown;
}

interface ClaudeMessageContentToolResult {
  type: "tool_result";
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
}

interface ClaudeLogMessage {
  id?: string;
  role?: string;
  content?:
    | string
    | Array<
        | ClaudeMessageContentText
        | ClaudeMessageContentToolUse
        | ClaudeMessageContentToolResult
        | Record<string, unknown>
      >;
  model?: string;
  usage?: ClaudeUsage;
}

interface ClaudeLogEntry {
  type?: string;
  summary?: string;
  message?: ClaudeLogMessage;
  sessionId?: string;
  timestamp?: string;
  uuid?: string;
  toolUseResult?: {
    stdout?: string;
    stderr?: string;
    interrupted?: boolean;
    isImage?: boolean;
    [key: string]: unknown;
  };
}

const ROLE_MAP: Record<string, ChatRole> = {
  user: "user",
  assistant: "assistant",
  system: "system",
  tool: "tool",
};

function toIsoTimestamp(value?: string): string {
  if (!value) {
    return new Date().toISOString();
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function parseClaudeLines(lines: string[]): ClaudeLogEntry[] {
  const entries: ClaudeLogEntry[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as ClaudeLogEntry;
      entries.push(parsed);
    } catch {
      // ignore malformed line
    }
  }
  return entries;
}

function safeStringify(value: unknown): string | null {
  if (value === null || typeof value === "undefined") {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "[unserialisable]";
  }
}

function buildClaudeSession(
  filePath: string,
  entries: ClaudeLogEntry[],
): ChatSession | null {
  const messages: ChatMessage[] = [];
  const participants = new Set<string>();
  let topic: string | undefined;
  let providerModel: string | undefined;
  let sessionId: string | undefined;
  let firstTimestamp: string | undefined;

  entries.forEach((entry, index) => {
    if (!sessionId && entry.sessionId) {
      sessionId = entry.sessionId;
    }

    if (!firstTimestamp && entry.timestamp) {
      firstTimestamp = toIsoTimestamp(entry.timestamp);
    }

    if (entry.type === "summary" && entry.summary) {
      topic = entry.summary;
      return;
    }

    const message = entry.message;
    if (!message) {
      return;
    }

    const roleKey = (message.role ?? entry.type ?? "").toLowerCase();
    const defaultRole = ROLE_MAP[roleKey];
    if (!defaultRole) {
      return;
    }

    const timestamp = toIsoTimestamp(entry.timestamp);
    const baseId = message.id ?? entry.uuid ?? `${defaultRole}-${index}`;
    const baseMetadata: MessageMetadata = {
      raw: entry,
      providerMessageType: undefined,
    };
    let usageAttached = false;

    const attachUsage = (metadata: MessageMetadata): MessageMetadata => {
      if (!usageAttached && message.usage) {
        metadata.tokens = {
          prompt: message.usage.input_tokens,
          completion: message.usage.output_tokens,
          total: message.usage.total_tokens,
        } satisfies TokenUsage;
        usageAttached = true;
      }
      return metadata;
    };

    const pushMessage = (
      kind: ChatMessage["kind"],
      content: string | null,
      metadata: Partial<MessageMetadata> = {},
      suffix?: string,
      roleOverride?: ChatRole,
    ) => {
      const finalRole = roleOverride ?? defaultRole;
      const meta = attachUsage({
        ...baseMetadata,
        ...metadata,
      });
      const chatMessage: ChatMessage = {
        id: suffix ? `${baseId}:${suffix}` : baseId,
        role: finalRole,
        kind,
        timestamp,
        content,
        metadata: meta,
      };
      messages.push(chatMessage);
      participants.add(finalRole);
    };

    if (typeof message.content === "string") {
      pushMessage("content", message.content, { providerMessageType: "text" });
    } else if (Array.isArray(message.content)) {
      let chunkIndex = 0;
      for (const item of message.content) {
        if (!item || typeof item !== "object") {
          continue;
        }
        const itemType = (item as { type?: string }).type;
        if (itemType === "text") {
          const text = (item as ClaudeMessageContentText).text ?? "";
          pushMessage(
            "content",
            text,
            { providerMessageType: "text" },
            `${chunkIndex++}`,
          );
        } else if (itemType === "tool_use") {
          const tool = item as ClaudeMessageContentToolUse;
          pushMessage(
            "tool-call",
            safeStringify(tool.input),
            {
              providerMessageType: "tool_use",
              toolCallId: tool.id,
              toolCall: {
                id: tool.id,
                name: tool.name,
                arguments: tool.input,
              },
            },
            `${chunkIndex++}`,
          );
        } else if (itemType === "tool_result") {
          const result = item as ClaudeMessageContentToolResult;
          const output =
            typeof result.content === "string"
              ? result.content
              : (safeStringify(result.content) ??
                safeStringify(entry.toolUseResult) ??
                null);
          pushMessage(
            "tool-result",
            output,
            {
              providerMessageType: "tool_result",
              toolCallId: result.tool_use_id,
              toolResult: {
                callId: result.tool_use_id,
                output: result.content ?? entry.toolUseResult ?? null,
              },
            },
            `${chunkIndex++}`,
            "tool",
          );
        }
      }

      if (chunkIndex === 0) {
        pushMessage("content", safeStringify(message.content), {
          providerMessageType: "unknown",
        });
      }
    } else {
      pushMessage("content", safeStringify(message.content), {
        providerMessageType: "unknown",
      });
    }

    if (!providerModel && message.model) {
      providerModel = message.model;
    }
  });

  if (messages.length === 0) {
    return null;
  }

  const metadata: SessionMetadata = {
    sourceFile: filePath,
    project: (() => {
      try {
        const dir = path.dirname(filePath);
        const base = path.basename(dir);
        if (
          base.startsWith("-") &&
          !base.includes("/") &&
          !base.includes("\\")
        ) {
          const parts = base.split("-").filter(Boolean);
          return parts.length > 0 ? parts[parts.length - 1] : base;
        }
        return base;
      } catch {
        return undefined;
      }
    })(),
    provider: providerModel ? { model: providerModel } : undefined,
    extra: (() => {
      const e: Record<string, unknown> = {};
      if (sessionId) e.sessionId = sessionId;
      try {
        const dir = path.dirname(filePath);
        const base = path.basename(dir);
        if (
          base.startsWith("-") &&
          !base.includes("/") &&
          !base.includes("\\")
        ) {
          const tokens = base.split("-").filter(Boolean);
          if (tokens.length > 0) e.cwd = `/${tokens.join("/")}`;
        }
      } catch {
        // ignore
      }
      return Object.keys(e).length > 0 ? e : undefined;
    })(),
  };

  const firstContent = messages.find(
    (message) => message.kind === "content" && message.content,
  );

  return {
    id: filePath,
    source: "claude",
    topic: topic ?? firstContent?.content?.slice(0, 80) ?? "Claude session",
    startedAt:
      firstTimestamp ?? messages[0]?.timestamp ?? new Date().toISOString(),
    participants: Array.from(participants),
    messages,
    metadata,
  };
}

async function collectClaudeFiles(root: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const results: string[] = [];

  let entries: Dirent[] = [];
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const dirent of entries) {
    if (!dirent.isDirectory()) {
      continue;
    }

    const projectDir = path.join(root, dirent.name);
    let projectFiles: Dirent[] = [];
    try {
      projectFiles = await readdir(projectDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const file of projectFiles) {
      if (file.isFile() && file.name.endsWith(".jsonl")) {
        results.push(path.join(projectDir, file.name));
      }
    }
  }

  return results;
}

function toPortableRelativePath(root: string, filePath: string): string {
  const relative = path.relative(root, filePath);
  const normalised = relative.split(path.sep).join("/");
  return normalised.length > 0 ? normalised : path.basename(filePath);
}

function findPreviousSignature(
  previousSignatures: Record<string, number>,
  filePath: string,
  relativePath: string,
): number | undefined {
  if (relativePath in previousSignatures) {
    return previousSignatures[relativePath];
  }
  if (filePath in previousSignatures) {
    return previousSignatures[filePath];
  }
  return undefined;
}

export async function loadClaudeSessions(
  root: string,
  previousSignatures: Record<string, number>,
  previousSessions: Map<string, ChatSession>,
): Promise<ProviderLoadResult> {
  const fs = await import("node:fs/promises");

  const files = await collectClaudeFiles(root);
  const sessions: ChatSession[] = [];
  const signatures: Record<string, number> = {};
  const errors: ProviderImportError[] = [];

  for (const filePath of files) {
    let mtimeMs = 0;
    const relativePath = toPortableRelativePath(root, filePath);
    try {
      const stats = await fs.stat(filePath);
      mtimeMs = stats.mtimeMs;
      signatures[relativePath] = mtimeMs;
    } catch (error) {
      errors.push({
        provider: "claude",
        file: filePath,
        reason: error instanceof Error ? error.message : "Failed to stat file",
      });
      const cached = previousSessions.get(filePath);
      if (cached) {
        sessions.push(cached);
      }
      continue;
    }

    const previousSignature = findPreviousSignature(
      previousSignatures,
      filePath,
      relativePath,
    );
    const cachedSession = previousSessions.get(filePath);
    if (previousSignature === mtimeMs && cachedSession) {
      sessions.push(cachedSession);
      continue;
    }

    try {
      const raw = await fs.readFile(filePath, "utf8");
      const lines = raw.split(/\r?\n/).filter(Boolean);
      const entries = parseClaudeLines(lines);
      const session = buildClaudeSession(filePath, entries);
      if (session) {
        session.metadata = {
          ...(session.metadata ?? {}),
          sourceFile: filePath,
        };
        sessions.push(session);
      }
    } catch (error) {
      errors.push({
        provider: "claude",
        file: filePath,
        reason: error instanceof Error ? error.message : "Failed to read log",
      });
      if (cachedSession) {
        sessions.push(cachedSession);
      }
    }
  }

  return { sessions, signatures, errors };
}

export function parseClaudeSessionFromString(
  filePath: string,
  content: string,
): ChatSession | null {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const entries = parseClaudeLines(lines);
  return buildClaudeSession(filePath, entries);
}

export async function loadClaudeSessionFromFile(
  filePath: string,
): Promise<ChatSession | null> {
  try {
    const fs = await import("node:fs/promises");
    const raw = await fs.readFile(filePath, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const entries = parseClaudeLines(lines);
    return buildClaudeSession(filePath, entries);
  } catch (error) {
    console.error("Failed to load Claude session", error);
    return null;
  }
}
