import { nanoid } from "nanoid";

import type { AgentSource, ChatMessage, ChatSession } from "@/types/chat";

function normaliseTimestamp(value: string | number | Date): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return new Date().toISOString();
  }
  return new Date(parsed).toISOString();
}

interface RawMessage {
  id?: string;
  role: string;
  timestamp?: string | number;
  content: string;
}

interface RawSession {
  id?: string;
  topic?: string;
  startedAt?: string | number;
  participants?: string[];
  messages: RawMessage[];
}

export function parseJsonSessions(
  data: unknown,
  source: AgentSource,
): ChatSession[] {
  if (!Array.isArray(data)) {
    throw new Error("Expected an array of sessions");
  }

  return data.map((session) => {
    if (typeof session !== "object" || session === null) {
      throw new Error("Session entry must be an object");
    }
    const raw = session as RawSession;
    if (!Array.isArray(raw.messages)) {
      throw new Error("Session missing messages array");
    }

    const messages: ChatMessage[] = raw.messages.map((message) => {
      if (!message || typeof message !== "object") {
        throw new Error("Invalid message entry");
      }
      if (typeof message.content !== "string") {
        throw new Error("Message content must be a string");
      }
      const role = (message.role ?? "assistant").toLowerCase();
      if (!["user", "assistant", "system", "tool"].includes(role)) {
        throw new Error(`Unsupported role: ${message.role}`);
      }
      return {
        id: message.id ?? nanoid(),
        role: role as ChatMessage["role"],
        timestamp: normaliseTimestamp(
          message.timestamp ?? raw.startedAt ?? Date.now(),
        ),
        content: message.content,
      };
    });

    return {
      id: raw.id ?? `${source}-${nanoid(8)}`,
      source,
      topic: raw.topic ?? `${source.toUpperCase()} conversation`,
      startedAt: normaliseTimestamp(
        raw.startedAt ?? messages[0]?.timestamp ?? Date.now(),
      ),
      participants: raw.participants ?? ["user", source],
      messages,
      metadata: {},
    } satisfies ChatSession;
  });
}

export function parsePlainTextTranscript(
  text: string,
  source: AgentSource,
): ChatSession[] {
  const lines = text.split(/\r?\n/);
  const messages: ChatMessage[] = [];
  for (const line of lines) {
    const match = line.match(/^(user|assistant|system|tool)\s*:\s*(.*)$/i);
    if (!match) {
      continue;
    }
    const [, role, content] = match;
    messages.push({
      id: nanoid(),
      role: role.toLowerCase() as ChatMessage["role"],
      timestamp: new Date().toISOString(),
      content: content.trim(),
    });
  }
  if (messages.length === 0) {
    throw new Error("No parsable messages found in transcript");
  }
  return [
    {
      id: `${source}-${nanoid(8)}`,
      source,
      topic: `${source.toUpperCase()} imported transcript`,
      startedAt: messages[0].timestamp,
      participants: ["user", source],
      messages,
      metadata: { format: "plain-text" },
    },
  ];
}

export async function parseFile(
  file: File,
  source: AgentSource,
): Promise<ChatSession[]> {
  const text = await file.text();
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    const jsonData: unknown = JSON.parse(trimmed);
    return parseJsonSessions(jsonData, source);
  }
  return parsePlainTextTranscript(trimmed, source);
}
