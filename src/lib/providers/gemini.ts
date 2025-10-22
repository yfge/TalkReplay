import type { Dirent } from "node:fs";
import path from "node:path";

import type { ProviderLoadResult } from "@/lib/providers/types";
import type {
  ChatMessage,
  ChatRole,
  ChatSession,
  MessageAttachment,
  MessageMetadata,
  SessionMetadata,
  TokenUsage,
} from "@/types/chat";
import type { ProviderImportError } from "@/types/providers";

interface GeminiThought {
  subject?: string;
  description?: string;
  timestamp?: string;
}

interface GeminiTokens {
  input?: number;
  output?: number;
  total?: number;
  cached?: number;
  thoughts?: number;
  tool?: number;
}

interface GeminiAttachment {
  type?: string;
  name?: string;
  url?: string;
  mimeType?: string;
  language?: string;
  text?: string;
}

interface GeminiMessage {
  id?: string;
  timestamp?: string;
  type?: string;
  content?: unknown;
  thoughts?: GeminiThought[];
  tokens?: GeminiTokens;
  model?: string;
  attachments?: GeminiAttachment[];
}

interface GeminiSessionDocument {
  sessionId?: string;
  projectHash?: string;
  projectName?: string;
  startTime?: string;
  lastUpdated?: string;
  messages?: GeminiMessage[];
  metadata?: Record<string, unknown>;
}

const ROLE_MAP: Record<string, ChatRole> = {
  user: "user",
  gemini: "assistant",
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

function toMessageAttachment(
  attachment: GeminiAttachment,
): MessageAttachment | undefined {
  const type = attachment.type;
  if (!type) {
    return undefined;
  }
  const mapped: MessageAttachment = {
    type: type === "code" ? "code" : type === "image" ? "image" : "file",
    name: attachment.name,
    uri: attachment.url,
    mimeType: attachment.mimeType,
    language: attachment.language,
    text: attachment.text,
  };
  return mapped;
}

function buildReasoningDetail(thoughts: GeminiThought[]): {
  summary?: string;
  detail?: string;
} {
  if (thoughts.length === 0) {
    return {};
  }
  const summary = thoughts[0]?.subject ?? "Thoughts";
  const detail = thoughts
    .map((thought) => {
      const parts: string[] = [];
      if (thought.subject) {
        parts.push(thought.subject);
      }
      if (thought.description) {
        parts.push(thought.description);
      }
      return parts.join(": ").trim();
    })
    .filter(Boolean)
    .join("\n\n");
  return {
    summary,
    detail: detail.length > 0 ? detail : summary,
  };
}

function normaliseTokens(tokens?: GeminiTokens): TokenUsage | undefined {
  if (!tokens) {
    return undefined;
  }
  const prompt = tokens.input;
  const completion = tokens.output;
  const total = tokens.total ?? (prompt ?? 0) + (completion ?? 0);
  if (
    typeof prompt !== "number" &&
    typeof completion !== "number" &&
    typeof total !== "number"
  ) {
    return undefined;
  }
  return {
    prompt,
    completion,
    total,
  };
}

export function buildGeminiSession(
  filePath: string,
  document: GeminiSessionDocument,
): ChatSession | null {
  const rawMessages = Array.isArray(document.messages) ? document.messages : [];
  if (rawMessages.length === 0) {
    return null;
  }

  const messages: ChatMessage[] = [];
  const participants = new Set<string>();
  let providerModel: string | undefined;
  let startedAt = document.startTime
    ? toIsoTimestamp(document.startTime)
    : undefined;
  let topic: string | undefined;

  rawMessages.forEach((raw, index) => {
    const typeKey = (raw.type ?? "").toLowerCase();
    const role = ROLE_MAP[typeKey] ?? "assistant";
    const timestamp = toIsoTimestamp(raw.timestamp);
    if (!startedAt || timestamp < startedAt) {
      startedAt = timestamp;
    }

    const baseId = raw.id ?? `${role}-${index}`;
    const content =
      typeof raw.content === "string"
        ? raw.content
        : raw.content != null
          ? JSON.stringify(raw.content, null, 2)
          : null;

    if (!topic && role === "user" && content) {
      topic = content.slice(0, 80);
    }

    const attachments = Array.isArray(raw.attachments)
      ? raw.attachments
          .map((attachment) => toMessageAttachment(attachment))
          .filter((value): value is MessageAttachment => Boolean(value))
      : undefined;

    const metadata: MessageMetadata = {
      providerMessageType: raw.type,
      tokens: normaliseTokens(raw.tokens),
      attachments,
      raw,
    };

    if (Array.isArray(raw.thoughts) && raw.thoughts.length > 0) {
      const reasoning = buildReasoningDetail(raw.thoughts);
      metadata.reasoning = {
        summary: reasoning.summary,
        detail: reasoning.detail,
        providerType: "gemini-thought",
      };
    }

    const chatMessage: ChatMessage = {
      id: baseId,
      role,
      kind: "content",
      timestamp,
      content,
      metadata,
    };
    messages.push(chatMessage);
    participants.add(role);

    if (Array.isArray(raw.thoughts) && raw.thoughts.length > 0) {
      const reasoning = buildReasoningDetail(raw.thoughts);
      const reasoningId = `${baseId}:reasoning`;
      const reasoningMessage: ChatMessage = {
        id: reasoningId,
        role: role === "user" ? "assistant" : role,
        kind: "reasoning",
        timestamp,
        content: reasoning.detail ?? reasoning.summary ?? null,
        metadata: {
          reasoning: {
            summary: reasoning.summary,
            detail: reasoning.detail,
            providerType: "gemini-thought",
          },
          raw: raw.thoughts,
        },
      };
      messages.push(reasoningMessage);
      participants.add(reasoningMessage.role);
    }

    if (!providerModel && raw.model) {
      providerModel = raw.model;
    }
  });

  if (messages.length === 0) {
    return null;
  }

  const metadata: SessionMetadata = {
    sourceFile: filePath,
    project: document.projectName ?? document.projectHash,
    provider: providerModel ? { model: providerModel } : undefined,
    extra: (() => {
      const extra: Record<string, unknown> = {};
      if (document.sessionId) extra.sessionId = document.sessionId;
      if (document.projectHash) extra.projectHash = document.projectHash;
      if (document.lastUpdated) extra.lastUpdated = document.lastUpdated;
      if (document.metadata) extra.metadata = document.metadata;
      return Object.keys(extra).length > 0 ? extra : undefined;
    })(),
  };

  const firstContent = messages.find(
    (message) => message.kind === "content" && message.content,
  );

  return {
    id: filePath,
    source: "gemini",
    topic: topic ?? firstContent?.content?.slice(0, 80) ?? "Gemini session",
    startedAt: startedAt ?? messages[0]?.timestamp,
    participants: Array.from(participants),
    messages,
    metadata,
  };
}

function toPortableRelativePath(root: string, filePath: string): string {
  const relative = path.relative(root, filePath);
  const normalised = relative.split(path.sep).join("/");
  return normalised.length > 0 ? normalised : path.basename(filePath);
}

async function collectGeminiFiles(root: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  const files: string[] = [];
  const queue: string[] = [root];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }

    let entries: Dirent[];
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.name === "bin") {
        continue;
      }
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (!entry.name.endsWith(".json")) {
        continue;
      }

      if (entry.name === "logs.json") {
        continue;
      }

      files.push(fullPath);
    }
  }

  return files;
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

export async function loadGeminiSessions(
  root: string,
  previousSignatures: Record<string, number>,
  previousSessions: Map<string, ChatSession>,
): Promise<ProviderLoadResult> {
  const fs = await import("node:fs/promises");
  const files = await collectGeminiFiles(root);
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
        provider: "gemini",
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
      const document = JSON.parse(raw) as GeminiSessionDocument;
      const session = buildGeminiSession(filePath, document);
      if (session) {
        sessions.push(session);
      }
    } catch (error) {
      errors.push({
        provider: "gemini",
        file: filePath,
        reason: error instanceof Error ? error.message : "Failed to read file",
      });
      if (cachedSession) {
        sessions.push(cachedSession);
      }
    }
  }

  return { sessions, signatures, errors };
}

export async function loadGeminiSessionFromFile(
  filePath: string,
): Promise<ChatSession | null> {
  try {
    const fs = await import("node:fs/promises");
    const raw = await fs.readFile(filePath, "utf8");
    const document = JSON.parse(raw) as GeminiSessionDocument;
    return buildGeminiSession(filePath, document);
  } catch (error) {
    console.error("Failed to load Gemini session", error);
    return null;
  }
}

export function parseGeminiSessionFromString(
  filePath: string,
  content: string,
): ChatSession | null {
  try {
    const document = JSON.parse(content) as GeminiSessionDocument;
    return buildGeminiSession(filePath, document);
  } catch {
    return null;
  }
}
