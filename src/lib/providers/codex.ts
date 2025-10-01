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

interface CodexPayload {
  id?: string;
  type?: string;
  role?: string;
  model?: string;
  content?: Array<Record<string, unknown>>;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  instructions?: string | null;
  cwd?: string;
  originator?: string;
  cli_version?: string;
  summary?: Array<{ type?: string; text?: string }>;
  encrypted_content?: string | null;
  arguments?: string | null;
  name?: string;
  call_id?: string;
  output?: string | null;
}

interface CodexLogEntry {
  type: string;
  timestamp?: string;
  payload?: CodexPayload | Record<string, unknown>;
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

function parseCodexLines(lines: string[]): CodexLogEntry[] {
  const entries: CodexLogEntry[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as CodexLogEntry;
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

function safeJsonParse(value: string | null | undefined): unknown {
  if (typeof value !== "string") {
    return value ?? null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function buildCodexSession(
  filePath: string,
  entries: CodexLogEntry[],
): ChatSession | null {
  const messages: ChatMessage[] = [];
  const participants = new Set<string>();
  let sessionId: string | undefined;
  let instructions: string | undefined;
  let providerModel: string | undefined;
  let firstTimestamp: string | undefined;

  entries.forEach((entry, index) => {
    if (entry.type === "session_meta" && entry.payload) {
      const payload = entry.payload as CodexPayload;
      sessionId = payload.id ?? sessionId;
      if (payload.instructions) {
        instructions = payload.instructions;
      }
      if (!firstTimestamp && entry.timestamp) {
        firstTimestamp = toIsoTimestamp(entry.timestamp);
      }
      return;
    }

    if (entry.type === "event_msg" && entry.payload) {
      const eventPayload = entry.payload as Record<string, unknown>;
      const eventType =
        typeof eventPayload.type === "string" ? eventPayload.type : undefined;
      if (eventType !== "agent_reasoning") {
        return;
      }
      const text =
        typeof eventPayload.text === "string" ? eventPayload.text : null;
      if (!text) {
        return;
      }
      const timestamp = toIsoTimestamp(entry.timestamp);
      const message: ChatMessage = {
        id: `event-reasoning-${index}`,
        role: "assistant",
        kind: "reasoning",
        timestamp,
        content: text,
        metadata: {
          providerMessageType: eventType,
          raw: entry,
        },
      };
      messages.push(message);
      participants.add("assistant");
      return;
    }

    if (entry.type !== "response_item" || !entry.payload) {
      return;
    }

    const payload = entry.payload as CodexPayload;
    const roleKey = (payload.role ?? "").toLowerCase();
    const defaultRole = ROLE_MAP[roleKey] ?? "assistant";
    const timestamp = toIsoTimestamp(entry.timestamp);
    const baseId = payload.id ?? `${defaultRole}-${index}`;
    const baseMetadata: MessageMetadata = {
      raw: entry,
      providerMessageType: payload.type,
    };
    let usageAttached = false;

    const attachUsage = (metadata: MessageMetadata): MessageMetadata => {
      if (!usageAttached && payload.usage) {
        metadata.tokens = {
          prompt: payload.usage.input_tokens,
          completion: payload.usage.output_tokens,
          total: payload.usage.total_tokens,
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
      const message: ChatMessage = {
        id: suffix ? `${baseId}:${suffix}` : baseId,
        role: finalRole,
        kind,
        timestamp,
        content,
        metadata: meta,
      };
      messages.push(message);
      participants.add(finalRole);
    };

    switch (payload.type) {
      case "message": {
        const items = Array.isArray(payload.content) ? payload.content : [];
        let chunkIndex = 0;
        for (const item of items) {
          if (!item || typeof item !== "object") {
            continue;
          }
          const itemType =
            typeof item.type === "string" ? item.type : undefined;
          if (itemType === "tool_use") {
            const callId = typeof item.id === "string" ? item.id : undefined;
            const name = typeof item.name === "string" ? item.name : undefined;
            pushMessage(
              "tool-call",
              safeStringify(item.input),
              {
                toolCallId: callId,
                toolCall: {
                  id: callId,
                  name,
                  arguments: item.input,
                },
              },
              `${chunkIndex++}`,
            );
            continue;
          }
          if (itemType === "tool_result") {
            const callId = typeof item.id === "string" ? item.id : undefined;
            const outputValue =
              typeof item.content === "string"
                ? safeJsonParse(item.content)
                : (item.content ?? null);
            pushMessage(
              "tool-result",
              safeStringify(outputValue),
              {
                toolCallId: callId,
                toolResult: {
                  callId,
                  output: outputValue,
                },
              },
              `${chunkIndex++}`,
              "tool",
            );
            continue;
          }
          const text =
            typeof item.text === "string" ? item.text : safeStringify(item);
          if (text) {
            pushMessage("content", text, {}, `${chunkIndex++}`);
          }
        }
        if (chunkIndex === 0) {
          pushMessage("content", safeStringify(payload.content) ?? "");
        }
        break;
      }
      case "reasoning": {
        const summaryText = Array.isArray(payload.summary)
          ? payload.summary
              .map((item) => (typeof item.text === "string" ? item.text : ""))
              .filter(Boolean)
              .join("\n")
          : undefined;
        pushMessage("reasoning", summaryText ?? null, {
          reasoning: {
            summary: summaryText,
            detail: null,
            providerType: "reasoning",
          },
        });
        break;
      }
      case "function_call": {
        const args = safeJsonParse(payload.arguments);
        pushMessage("tool-call", safeStringify(args), {
          toolCall: {
            id: payload.id,
            name: payload.name,
            arguments: args,
          },
        });
        break;
      }
      case "function_call_output": {
        const output = safeJsonParse(payload.output);
        pushMessage(
          "tool-result",
          safeStringify(output),
          {
            toolResult: {
              callId: payload.call_id,
              output,
            },
          },
          undefined,
          "tool",
        );
        break;
      }
      default: {
        pushMessage(
          "system",
          safeStringify(payload) ?? null,
          {},
          undefined,
          "system",
        );
        break;
      }
    }

    if (!providerModel && payload.model) {
      providerModel = payload.model;
    }
  });

  if (messages.length === 0) {
    return null;
  }

  const metadata: SessionMetadata = {
    sourceFile: filePath,
    summary: instructions ?? undefined,
    provider: providerModel ? { model: providerModel } : undefined,
    extra: sessionId ? { sessionId } : undefined,
  };

  const firstContent = messages.find(
    (message) => message.kind === "content" && message.content,
  );

  return {
    id: filePath,
    source: "codex",
    topic:
      instructions?.split("\n", 1)[0]?.slice(0, 80) ??
      firstContent?.content?.slice(0, 80) ??
      "Codex session",
    startedAt:
      firstTimestamp ?? messages[0]?.timestamp ?? new Date().toISOString(),
    participants: Array.from(participants),
    messages,
    metadata,
  };
}

async function collectCodexFiles(root: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const results: string[] = [];
  const stack: string[] = [root];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    let entries: Dirent[] = [];
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
        results.push(fullPath);
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

export async function loadCodexSessions(
  root: string,
  previousSignatures: Record<string, number>,
  previousSessions: Map<string, ChatSession>,
): Promise<ProviderLoadResult> {
  const fs = await import("node:fs/promises");

  const files = await collectCodexFiles(root);
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
        provider: "codex",
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
      const entries = parseCodexLines(lines);
      const session = buildCodexSession(filePath, entries);
      if (session) {
        session.metadata = {
          ...(session.metadata ?? {}),
          sourceFile: filePath,
        };
        sessions.push(session);
      }
    } catch (error) {
      errors.push({
        provider: "codex",
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

export function parseCodexSessionFromString(
  filePath: string,
  content: string,
): ChatSession | null {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const entries = parseCodexLines(lines);
  return buildCodexSession(filePath, entries);
}

export async function loadCodexSessionFromFile(
  filePath: string,
): Promise<ChatSession | null> {
  try {
    const fs = await import("node:fs/promises");
    const raw = await fs.readFile(filePath, "utf8");
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const entries = parseCodexLines(lines);
    return buildCodexSession(filePath, entries);
  } catch (error) {
    console.error("Failed to load Codex session", error);
    return null;
  }
}
