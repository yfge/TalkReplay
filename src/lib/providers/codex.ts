import type { Dirent } from "node:fs";

import type {
  ChatMessage,
  ChatRole,
  ChatSession,
  SessionMetadata,
} from "@/types/chat";

interface CodexContentText {
  type: string;
  text?: string;
}

interface CodexContentToolUse {
  type: "tool_use";
  id?: string;
  name?: string;
  input?: unknown;
}

interface CodexContentToolResult {
  type: "tool_result";
  id?: string;
  content?: string;
  is_error?: boolean;
}

interface CodexPayload {
  id?: string;
  type?: string;
  role?: string;
  model?: string;
  content?: Array<
    | CodexContentText
    | CodexContentToolUse
    | CodexContentToolResult
    | Record<string, unknown>
  >;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
  };
  instructions?: string | null;
  cwd?: string;
  originator?: string;
  cli_version?: string;
}

interface CodexLogEntry {
  type: string;
  timestamp?: string;
  payload?: CodexPayload;
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

function extractCodexContent(content: CodexPayload["content"]): {
  text: string;
  toolCallId?: string;
} {
  if (!Array.isArray(content)) {
    return { text: "" };
  }

  const textParts: string[] = [];
  let toolCallId: string | undefined;

  for (const item of content) {
    if (!item || typeof item !== "object") {
      continue;
    }

    if ((item as CodexContentToolUse).type === "tool_use") {
      const toolId = (item as CodexContentToolUse).id;
      if (typeof toolId === "string") {
        toolCallId = toolId;
      }
      continue;
    }

    if ((item as CodexContentToolResult).type === "tool_result") {
      const result = (item as CodexContentToolResult).content;
      if (typeof result === "string") {
        textParts.push(result);
      }
      continue;
    }

    const text = (item as CodexContentText).text;
    if (typeof text === "string") {
      textParts.push(text);
    }
  }

  return { text: textParts.join("\n"), toolCallId };
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
      sessionId = entry.payload.id ?? sessionId;
      if (entry.payload.instructions) {
        instructions = entry.payload.instructions;
      }
      if (!firstTimestamp && entry.timestamp) {
        firstTimestamp = toIsoTimestamp(entry.timestamp);
      }
      return;
    }

    if (entry.type !== "response_item" || !entry.payload) {
      return;
    }

    const payload = entry.payload;
    const roleKey = (payload.role ?? "").toLowerCase();
    const role = ROLE_MAP[roleKey];
    if (!role) {
      return;
    }

    const { text, toolCallId } = extractCodexContent(payload.content);

    const chatMessage: ChatMessage = {
      id: payload.id ?? `${role}-${index}`,
      role,
      timestamp: toIsoTimestamp(entry.timestamp),
      content: text,
      metadata: {
        toolCallId,
        raw: entry,
      },
    };

    if (payload.usage) {
      chatMessage.metadata = {
        ...chatMessage.metadata,
        tokens: {
          prompt: payload.usage.input_tokens,
          completion: payload.usage.output_tokens,
          total: payload.usage.total_tokens,
        },
      };
    }

    messages.push(chatMessage);
    participants.add(role);

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
  };

  return {
    id: sessionId ?? filePath,
    source: "codex",
    topic: messages[0]?.content?.slice(0, 80) ?? "Codex session",
    startedAt:
      firstTimestamp ?? messages[0]?.timestamp ?? new Date().toISOString(),
    participants: Array.from(participants),
    messages,
    metadata,
  };
}

async function collectCodexFiles(root: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const path = await import("node:path");
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

export async function loadCodexSessions(root: string): Promise<ChatSession[]> {
  const { readFile } = await import("node:fs/promises");
  const files = await collectCodexFiles(root);
  const sessions: ChatSession[] = [];

  for (const filePath of files) {
    try {
      const raw = await readFile(filePath, "utf8");
      const lines = raw.split(/\r?\n/).filter(Boolean);
      const entries = parseCodexLines(lines);
      const session = buildCodexSession(filePath, entries);
      if (session) {
        sessions.push(session);
      }
    } catch {
      // ignore malformed files
    }
  }

  return sessions;
}

export function parseCodexSessionFromString(
  filePath: string,
  content: string,
): ChatSession | null {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const entries = parseCodexLines(lines);
  return buildCodexSession(filePath, entries);
}
