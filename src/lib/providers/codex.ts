import type { Dirent } from "node:fs";
import path from "node:path";

import { parseUnifiedDiff } from "@/lib/diff";
import type { ProviderLoadResult } from "@/lib/providers/types";
import { codexSchema } from "@/schema";
import { normalise } from "@/schema/normaliser";
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

let codexSchemasReady = false;

function ensureCodexSchemasRegistered() {
  if (!codexSchemasReady) {
    codexSchema.registerCodexSchemas();
    codexSchemasReady = true;
  }
}

function deriveProjectFromCwd(cwd?: string): {
  project?: string;
  normalizedPath?: string;
} {
  if (!cwd || typeof cwd !== "string") {
    return {};
  }
  // If cwd already looks like a real path, use it directly.
  if (cwd.includes("/") || cwd.includes("\\")) {
    return { project: path.basename(cwd), normalizedPath: cwd };
  }
  // Some logs redact path separators and join with hyphens, e.g.
  // "-Users-foo-dev-bar-my-project" which actually means
  // "/Users/foo/dev/bar/my-project". We can't perfectly reconstruct
  // component boundaries inside the last segment (which may itself include hyphens),
  // but for project name we can heuristically take the last 2–3 tokens.
  const tokens = cwd.split("-").filter(Boolean);
  if (tokens.length === 0) return {};
  const parts: string[] = [];
  let combined = 0;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i];
    parts.unshift(t);
    combined += t.length + (parts.length > 1 ? 1 : 0);
    // Stop when project label is reasonably descriptive
    if (combined >= 8 || parts.length >= 3) break;
  }
  const project = parts.join("-");
  // Rebuild a plausible absolute path by treating earlier tokens as directories
  const dirTokens = tokens.slice(0, tokens.length - parts.length);
  const normalizedPath =
    dirTokens.length > 0 ? `/${dirTokens.join("/")}/${project}` : project;
  return { project, normalizedPath };
}

// Unified helpers for tool-call / tool-result messages so different Codex
// item types (command_execution, file_change, mcp_tool_call, function_call, etc.)
// are created consistently.
function makeToolCall(params: {
  id: string;
  timestamp: string;
  name: string;
  args?: Record<string, unknown> | undefined;
  toolType?: string | undefined;
  providerMessageType?: string | undefined;
  raw?: unknown;
}): ChatMessage {
  return {
    id: params.id,
    role: "assistant",
    kind: "tool-call",
    timestamp: params.timestamp,
    content: safeStringify(params.args) ?? null,
    metadata: {
      providerMessageType:
        params.providerMessageType ?? params.toolType ?? "tool_call",
      toolCallId: params.id,
      toolCall: {
        id: params.id,
        name: params.name,
        arguments: params.args,
        toolType: params.toolType ?? params.name,
      },
      raw: params.raw,
    },
  };
}

function makeToolResult(params: {
  callId: string;
  timestamp: string;
  output?: unknown;
  exitCode?: number;
  durationMs?: number;
  stdout?: string;
  stderr?: string;
  filesChanged?: string[];
  diff?: string;
  providerMessageType?: string | undefined;
  raw?: unknown;
}): ChatMessage {
  return {
    id: `${params.callId}:result`,
    role: "tool",
    kind: "tool-result",
    timestamp: params.timestamp,
    content: safeStringify(params.output) ?? null,
    metadata: {
      providerMessageType: params.providerMessageType ?? "tool_result",
      toolCallId: params.callId,
      toolResult: {
        callId: params.callId,
        output: params.output,
        exitCode: params.exitCode,
        durationMs: params.durationMs,
        stdout: params.stdout,
        stderr: params.stderr,
        filesChanged: params.filesChanged,
        diff: params.diff,
        diffFiles: params.diff ? parseUnifiedDiff(params.diff) : undefined,
      },
      raw: params.raw,
    },
  };
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
  let cwdPath: string | undefined;

  entries.forEach((entry, index) => {
    if (process.env.NEXT_PUBLIC_SCHEMA_NORMALISER === "1") {
      ensureCodexSchemasRegistered();
      const mappingId = codexSchema.resolveMappingId(entry);
      if (mappingId) {
        const normalised = normalise(mappingId, entry);
        if (normalised) {
          const message = normalised.message;
          message.metadata = {
            ...(message.metadata ?? {}),
            raw: entry,
          };
          messages.push(message);
          participants.add(message.role);
          if (!firstTimestamp && entry.timestamp) {
            firstTimestamp = toIsoTimestamp(entry.timestamp);
          }
          return;
        }
      }
    }
    // Handle exec JSON mode item events
    if (entry.type && entry.type.startsWith("item.")) {
      const p = (entry.payload ?? {}) as Record<string, unknown>;
      const item = p.item as Record<string, unknown> | undefined;
      if (!item || typeof item !== "object") {
        return;
      }
      const itemId = typeof item.id === "string" ? item.id : `item-${index}`;
      const itemType = typeof item.type === "string" ? item.type : undefined;
      const timestamp = toIsoTimestamp(entry.timestamp);

      if (itemType === "command_execution") {
        const command =
          typeof item.command === "string" ? item.command : undefined;
        if (entry.type === "item.started") {
          const msg = makeToolCall({
            id: itemId,
            timestamp,
            name: "command_execution",
            args: { command },
            toolType:
              command && command.startsWith("bash ")
                ? "bash"
                : "command_execution",
            providerMessageType: "command_execution",
            raw: entry,
          });
          messages.push(msg);
          participants.add("assistant");
          return;
        }

        if (entry.type === "item.completed") {
          const aggregated =
            typeof item.aggregated_output === "string"
              ? item.aggregated_output
              : undefined;
          const anyItem = item as Record<string, unknown> & {
            exit_code?: unknown;
          };
          const exitCode =
            typeof anyItem.exit_code === "number"
              ? anyItem.exit_code
              : undefined;
          const result = makeToolResult({
            callId: itemId,
            timestamp,
            output: aggregated,
            exitCode,
            providerMessageType: "command_execution",
            raw: entry,
          });
          messages.push(result);
          participants.add("tool");
          return;
        }
      }

      if (itemType === "file_change") {
        const status =
          typeof item.status === "string" ? item.status : undefined;
        const itemAny: Record<string, unknown> = item;
        const changesRaw = itemAny.changes;
        const changes = Array.isArray(changesRaw)
          ? (changesRaw as unknown[])
          : [];

        if (entry.type === "item.started") {
          const msg = makeToolCall({
            id: itemId,
            timestamp,
            name: "file_change",
            args: { changes },
            toolType: "file_change",
            providerMessageType: "file_change",
            raw: entry,
          });
          messages.push(msg);
          participants.add("assistant");
          return;
        }

        if (entry.type === "item.completed") {
          const filesChanged: string[] = [];
          for (const c of changes) {
            if (c && typeof c === "object") {
              const pathVal = (c as { path?: unknown }).path;
              if (typeof pathVal === "string") filesChanged.push(pathVal);
            }
          }
          // Attempt to extract unified diff content if present on any change object or on item
          let diff: string | undefined;
          const pushDiff = (val: unknown) => {
            if (typeof val === "string" && val.length > 0) {
              diff = val;
            }
          };
          for (const c of changes) {
            if (c && typeof c === "object") {
              const anyC = c as Record<string, unknown>;
              pushDiff(anyC.diff);
              // common alternative keys
              pushDiff(anyC.patch);
            }
            if (diff) break;
          }
          if (!diff) {
            const anyItem = item as Record<string, unknown> & {
              diff?: unknown;
              patch?: unknown;
            };
            if (typeof anyItem.diff === "string") pushDiff(anyItem.diff);
            if (typeof anyItem.patch === "string") pushDiff(anyItem.patch);
          }
          const exitCode = status === "completed" ? 0 : 1;
          const msg = makeToolResult({
            callId: itemId,
            timestamp,
            output: { status, filesChanged },
            exitCode,
            filesChanged,
            diff,
            providerMessageType: "file_change",
            raw: entry,
          });
          messages.push(msg);
          participants.add("tool");
          return;
        }
      }

      if (itemType === "mcp_tool_call") {
        const server =
          typeof item.server === "string" ? item.server : undefined;
        const tool = typeof item.tool === "string" ? item.tool : undefined;
        const name =
          server && tool
            ? `${server}.${tool}`
            : (tool ?? server ?? "mcp_tool_call");
        const status =
          typeof item.status === "string" ? item.status : undefined;
        if (entry.type === "item.started") {
          const msg = makeToolCall({
            id: itemId,
            timestamp,
            name,
            args: { server, tool },
            toolType: "mcp",
            providerMessageType: "mcp_tool_call",
            raw: entry,
          });
          messages.push(msg);
          participants.add("assistant");
          return;
        }
        if (entry.type === "item.completed") {
          const exitCode = status === "completed" ? 0 : 1;
          const msg = makeToolResult({
            callId: itemId,
            timestamp,
            output: { status },
            exitCode,
            providerMessageType: "mcp_tool_call",
            raw: entry,
          });
          messages.push(msg);
          participants.add("tool");
          return;
        }
      }

      if (itemType === "web_search") {
        const anyItemWS = item as Record<string, unknown> & {
          query?: unknown;
          results?: unknown;
        };
        const queryVal = anyItemWS.query;
        const query = typeof queryVal === "string" ? queryVal : undefined;
        if (entry.type === "item.started") {
          const msg = makeToolCall({
            id: itemId,
            timestamp,
            name: "web_search",
            args: { query },
            toolType: "web_search",
            providerMessageType: "web_search",
            raw: entry,
          });
          messages.push(msg);
          participants.add("assistant");
          return;
        }
        if (entry.type === "item.completed") {
          // results may appear as 'results' or similar; include payload for now
          const results = anyItemWS.results;
          const msg = makeToolResult({
            callId: itemId,
            timestamp,
            output: { query, results },
            exitCode: 0,
            providerMessageType: "web_search",
            raw: entry,
          });
          messages.push(msg);
          participants.add("tool");
          return;
        }
      }
    }

    if (entry.type === "session_meta" && entry.payload) {
      const payload = entry.payload as CodexPayload;
      sessionId = payload.id ?? sessionId;
      if (payload.instructions) {
        instructions = payload.instructions;
      }
      if (typeof payload.cwd === "string" && payload.cwd.length > 0) {
        cwdPath = payload.cwd;
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
        // Normalise common Codex tool names to canonical toolType
        const name = payload.name;
        const mapToolType = (n?: string): string | undefined => {
          if (!n) return undefined;
          const table: Record<string, string> = {
            shell: "bash",
            apply_patch: "apply_patch",
            read_file: "read_file",
            list_dir: "list_dir",
            grep_files: "grep_files",
            update_plan: "update_plan",
            unified_exec: "unified_exec",
            view_image: "view_image",
            web_search: "web_search",
          };
          if (n in table) return table[n];
          if (n.endsWith("_call") && n.startsWith("web_search"))
            return "web_search";
          return n;
        };
        const toolType = mapToolType(
          typeof name === "string" ? name : undefined,
        );
        pushMessage("tool-call", safeStringify(args), {
          toolCall: {
            id: payload.id,
            name,
            arguments: args,
            toolType,
          },
        });
        break;
      }
      case "function_call_output": {
        const parsed = safeJsonParse(payload.output);
        let display: unknown = parsed;
        let exitCode: number | undefined;
        let durationMs: number | undefined;
        let stdout: string | undefined;
        let stderr: string | undefined;

        if (parsed && typeof parsed === "object") {
          const anyParsed = parsed as Record<string, unknown>;
          const maybeOutput = anyParsed.output;
          if (typeof maybeOutput === "string") {
            stdout = maybeOutput;
            display = maybeOutput;
          }
          const md = anyParsed.metadata as Record<string, unknown> | undefined;
          if (md && typeof md === "object") {
            const code = md.exit_code;
            const secs = md.duration_seconds;
            if (typeof code === "number") exitCode = code;
            if (typeof secs === "number") durationMs = Math.round(secs * 1000);
          }
        }

        pushMessage(
          "tool-result",
          safeStringify(display),
          {
            toolResult: {
              callId: payload.call_id,
              output: parsed,
              exitCode,
              durationMs,
              stdout,
              stderr,
            },
          },
          undefined,
          "tool",
        );
        break;
      }
      default: {
        // In Codex logs many "system"-like entries are actually tool-ish
        // operational messages. Treat them as a generic tool-result so they
        // are grouped consistently in the UI.
        const callId =
          (typeof payload.call_id === "string" ? payload.call_id : undefined) ||
          (typeof payload.id === "string" ? payload.id : undefined) ||
          `sys-${index}`;
        const output =
          payload.output ?? payload.content ?? payload.summary ?? payload;
        const msg = makeToolResult({
          callId: callId ?? `sys-${index}`,
          timestamp,
          output,
          providerMessageType: "system-as-tool",
          raw: entry,
        });
        messages.push(msg);
        participants.add("tool");
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
    project: (() => {
      const { project } = deriveProjectFromCwd(cwdPath);
      return project;
    })(),
    provider: providerModel ? { model: providerModel } : undefined,
    extra: (() => {
      const out: Record<string, unknown> = {};
      if (sessionId) out.sessionId = sessionId;
      const derived = deriveProjectFromCwd(cwdPath);
      if (derived.normalizedPath) out.cwd = derived.normalizedPath;
      else if (cwdPath) out.cwd = cwdPath;
      return out;
    })(),
  };

  const firstContent = messages.find(
    (message) => message.kind === "content" && message.content,
  );
  const firstAssistantIndex = messages.findIndex(
    (message) => message.role === "assistant",
  );
  let userPromptBeforeAssistant: string | undefined;
  if (firstAssistantIndex > 0) {
    for (let i = firstAssistantIndex - 1; i >= 0; i--) {
      const candidate = messages[i];
      if (
        candidate.role === "user" &&
        candidate.kind === "content" &&
        typeof candidate.content === "string" &&
        candidate.content.trim().length > 0
      ) {
        userPromptBeforeAssistant = candidate.content;
        break;
      }
    }
  }

  return {
    id: filePath,
    source: "codex",
    topic:
      userPromptBeforeAssistant?.split("\n", 1)[0]?.slice(0, 80) ??
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
