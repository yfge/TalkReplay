import type { Dirent } from "node:fs";

import type {
  ChatMessage,
  ChatRole,
  ChatSession,
  SessionMetadata,
} from "@/types/chat";

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

interface ClaudeLogMessage {
  id?: string;
  role?: string;
  content?:
    | string
    | Array<
        | ClaudeMessageContentText
        | ClaudeMessageContentToolUse
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

function extractClaudeText(content: ClaudeLogMessage["content"]): {
  text: string;
  toolCallId?: string;
} {
  if (typeof content === "string") {
    return { text: content };
  }

  if (Array.isArray(content)) {
    const textParts: string[] = [];
    let toolCallId: string | undefined;

    for (const item of content) {
      if (!item || typeof item !== "object") {
        continue;
      }

      if ((item as ClaudeMessageContentText).type === "text") {
        const text = (item as ClaudeMessageContentText).text;
        if (typeof text === "string") {
          textParts.push(text);
        }
      }

      if ((item as ClaudeMessageContentToolUse).type === "tool_use") {
        const toolId = (item as ClaudeMessageContentToolUse).id;
        if (typeof toolId === "string") {
          toolCallId = toolId;
        }
      }
    }

    return { text: textParts.join("\n"), toolCallId };
  }

  return { text: "" };
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
    const role = ROLE_MAP[roleKey];
    if (!role) {
      return;
    }

    const { text, toolCallId } = extractClaudeText(message.content);

    const chatMessage: ChatMessage = {
      id: message.id ?? entry.uuid ?? `${role}-${index}`,
      role,
      timestamp: toIsoTimestamp(entry.timestamp),
      content: text,
      metadata: {
        toolCallId,
        raw: entry,
      },
    };

    if (message.usage) {
      chatMessage.metadata = {
        ...chatMessage.metadata,
        tokens: {
          prompt: message.usage.input_tokens,
          completion: message.usage.output_tokens,
          total: message.usage.total_tokens,
        },
      };
    }

    messages.push(chatMessage);
    participants.add(role);

    if (!providerModel && message.model) {
      providerModel = message.model;
    }
  });

  if (messages.length === 0) {
    return null;
  }

  const metadata: SessionMetadata = {
    sourceFile: filePath,
    provider: providerModel ? { model: providerModel } : undefined,
  };

  return {
    id: sessionId ?? filePath,
    source: "claude",
    topic: topic ?? messages[0]?.content?.slice(0, 80) ?? "Claude session",
    startedAt:
      firstTimestamp ?? messages[0]?.timestamp ?? new Date().toISOString(),
    participants: Array.from(participants),
    messages,
    metadata,
  };
}

async function collectClaudeFiles(root: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const path = await import("node:path");
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

export async function loadClaudeSessions(root: string): Promise<ChatSession[]> {
  const { readFile } = await import("node:fs/promises");
  const files = await collectClaudeFiles(root);
  const sessions: ChatSession[] = [];

  for (const filePath of files) {
    try {
      const raw = await readFile(filePath, "utf8");
      const lines = raw.split(/\r?\n/).filter(Boolean);
      const entries = parseClaudeLines(lines);
      const session = buildClaudeSession(filePath, entries);
      if (session) {
        sessions.push(session);
      }
    } catch {
      // ignore malformed files for now
    }
  }

  return sessions;
}

export function parseClaudeSessionFromString(
  filePath: string,
  content: string,
): ChatSession | null {
  const lines = content.split(/\r?\n/).filter(Boolean);
  const entries = parseClaudeLines(lines);
  return buildClaudeSession(filePath, entries);
}
