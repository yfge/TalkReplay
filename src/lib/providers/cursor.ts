import { promises as fs } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import initSqlJs from "sql.js";

import type { ProviderLoadResult } from "@/lib/providers/types";
import { encodeSessionId } from "@/lib/session-loader/ids";
import { cursorSchema } from "@/schema";
import { normalise } from "@/schema/normaliser";
import type {
  ChatMessage,
  ChatSession,
  MessageAttachment,
  MessageMetadata,
} from "@/types/chat";

interface CursorPrompt {
  text?: string;
  commandType?: number;
}

interface CursorGeneration {
  unixMs: number;
  generationUUID: string;
  type?: string;
  textDescription?: string;
  promptText?: string;
  promptMarkdown?: string;
  promptHtml?: string;
  request?: unknown;
  responseText?: string;
  responseMarkdown?: string;
  responseHtml?: string;
  response?: unknown;
  messages?: unknown;
}

interface CursorComposer {
  composerId?: string;
  name?: string;
  createdAt?: number;
  lastUpdatedAt?: number;
}

type CursorChatView = Record<string, unknown> | unknown[];

interface CursorWorkspaceState {
  prompts?: CursorPrompt[];
  generations?: CursorGeneration[];
  composers?: CursorComposer[];
  chatData?: Record<string, CursorChatView>;
}

interface ChatMessageGroup {
  messages: unknown[];
  source: string;
}

type SqlStatement = {
  step(): boolean;
  getAsObject(): Record<string, unknown>;
  free(): void;
};

type SqlDatabase = {
  prepare(sql: string): SqlStatement;
  close(): void;
};

type SqlJsModule = {
  Database: new (data: Uint8Array) => SqlDatabase;
};

interface ResolvedText {
  text: string;
  source: string;
}

interface CursorMessageBlueprint {
  id: string;
  role: ChatMessage["role"];
  timestamp: string;
  content: string;
  metadata: MessageMetadata;
}

let cursorSchemasRegistered = false;

function ensureCursorSchemasRegistered() {
  if (!cursorSchemasRegistered) {
    cursorSchema.registerCursorSchemas();
    cursorSchemasRegistered = true;
  }
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toTrimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractTextFromRichContent(content: unknown): string | undefined {
  const direct = toTrimmedString(content);
  if (direct) {
    return direct;
  }
  if (Array.isArray(content)) {
    const parts: string[] = [];
    content.forEach((item) => {
      if (typeof item === "string") {
        const part = toTrimmedString(item);
        if (part) {
          parts.push(part);
        }
        return;
      }
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>;
        const part =
          toTrimmedString(record.text) ??
          toTrimmedString(record.content) ??
          extractTextFromRichContent(record.content);
        if (part) {
          parts.push(part);
        }
      }
    });
    if (parts.length > 0) {
      return parts.join("\n");
    }
  }
  if (content && typeof content === "object") {
    const record = content as Record<string, unknown>;
    return (
      toTrimmedString(record.text) ??
      toTrimmedString(record.markdown) ??
      toTrimmedString(record.html) ??
      (Array.isArray(record.messageParts)
        ? extractTextFromRichContent(record.messageParts)
        : undefined)
    );
  }
  return undefined;
}

function extractTextFromMessage(
  entry: Record<string, unknown>,
): string | undefined {
  const candidates: unknown[] = [
    entry.content,
    entry.text,
    entry.markdown,
    entry.html,
    entry.body,
    entry.value,
  ];
  if ("message" in entry && isRecord(entry.message)) {
    candidates.push(entry.message);
    if ("content" in entry.message) {
      candidates.push(entry.message.content);
    }
  }
  if ("data" in entry && isRecord(entry.data)) {
    candidates.push(entry.data);
    if ("content" in entry.data) {
      candidates.push(entry.data.content);
    }
  }
  if (Array.isArray(entry.parts)) {
    candidates.push(entry.parts);
  }
  for (const candidate of candidates) {
    const text = extractTextFromRichContent(candidate);
    if (text) {
      return text;
    }
  }
  return undefined;
}

function getMessageRole(entry: Record<string, unknown>): string | undefined {
  const roleCandidates = [
    "role",
    "sender",
    "author",
    "speaker",
    "participant",
    "source",
  ];
  for (const key of roleCandidates) {
    if (key in entry) {
      const role = toTrimmedString(entry[key]);
      if (role) {
        return role.toLowerCase();
      }
    }
  }
  if ("message" in entry && isRecord(entry.message)) {
    const nested = getMessageRole(entry.message);
    if (nested) {
      return nested;
    }
  }
  if ("metadata" in entry && isRecord(entry.metadata)) {
    const nested = getMessageRole(entry.metadata);
    if (nested) {
      return nested;
    }
  }
  if ("meta" in entry && isRecord(entry.meta)) {
    const nested = getMessageRole(entry.meta);
    if (nested) {
      return nested;
    }
  }
  return undefined;
}

function collectMessagesFromChatView(
  view: CursorChatView,
  baseKey: string,
): ChatMessageGroup[] {
  const groups: ChatMessageGroup[] = [];
  const addGroup = (candidate: unknown, suffix: string) => {
    if (Array.isArray(candidate)) {
      groups.push({ messages: candidate, source: `${baseKey}${suffix}` });
    }
  };
  if (Array.isArray(view)) {
    addGroup(view, "");
    return groups;
  }
  if (!isRecord(view)) {
    return groups;
  }
  addGroup(view.messages, "");
  if ("data" in view && isRecord(view.data)) {
    addGroup(view.data.messages, ".data");
  }
  if ("chat" in view && isRecord(view.chat)) {
    addGroup(view.chat.messages, ".chat");
  }
  if ("conversation" in view && isRecord(view.conversation)) {
    addGroup(view.conversation.messages, ".conversation");
  }
  const viewRecord: Record<string, unknown> = view;
  const sessionsValue = viewRecord.sessions;
  if (Array.isArray(sessionsValue)) {
    sessionsValue.forEach((session, index) => {
      if (isRecord(session)) {
        addGroup(session.messages, `.sessions[${index}]`);
      }
    });
  }
  const conversationsValue = viewRecord.conversations;
  if (Array.isArray(conversationsValue)) {
    conversationsValue.forEach((conversation, index) => {
      if (isRecord(conversation)) {
        addGroup(conversation.messages, `.conversations[${index}]`);
      }
    });
  }
  const logsValue = viewRecord.logs;
  if (Array.isArray(logsValue)) {
    logsValue.forEach((log, index) => {
      if (isRecord(log)) {
        addGroup(log.messages, `.logs[${index}]`);
      }
    });
  }
  return groups;
}

function findAssistantAfterIndex(
  messages: unknown[],
  startIndex: number,
  source: string,
): ResolvedText | undefined {
  for (let idx = startIndex; idx < messages.length; idx += 1) {
    const candidate = messages[idx];
    if (!isRecord(candidate)) {
      continue;
    }
    const role = getMessageRole(candidate);
    if (role !== "assistant") {
      continue;
    }
    const text = extractTextFromMessage(candidate);
    if (text) {
      return { text, source: `${source}[${idx}]` };
    }
  }
  return undefined;
}

function resolveChatDataPair(
  chatData: Record<string, CursorChatView> | undefined,
  promptCandidate?: string | null,
): { prompt?: ResolvedText; assistant?: ResolvedText } {
  if (!chatData) {
    return {};
  }
  const normalizedTarget = promptCandidate
    ? normalizeText(promptCandidate)
    : undefined;
  let fallbackPair:
    | { prompt?: ResolvedText; assistant?: ResolvedText }
    | undefined;

  for (const [key, view] of Object.entries(chatData)) {
    const groups = collectMessagesFromChatView(view, key);
    for (const group of groups) {
      const { messages, source } = group;
      if (!Array.isArray(messages) || messages.length === 0) {
        continue;
      }
      let lastUser: ResolvedText | undefined;
      let latestPair:
        | { prompt?: ResolvedText; assistant?: ResolvedText }
        | undefined;
      for (let idx = 0; idx < messages.length; idx += 1) {
        const rawMessage = messages[idx];
        if (!isRecord(rawMessage)) {
          continue;
        }
        const role = getMessageRole(rawMessage);
        const text = extractTextFromMessage(rawMessage);
        if (!role || !text) {
          continue;
        }
        const normalized = normalizeText(text);
        if (role === "user") {
          const user: ResolvedText = { text, source: `${source}[${idx}]` };
          lastUser = user;
          if (normalizedTarget && normalized === normalizedTarget) {
            const assistant = findAssistantAfterIndex(
              messages,
              idx + 1,
              source,
            );
            if (assistant) {
              return { prompt: user, assistant };
            }
            return { prompt: user };
          }
          if (!normalizedTarget && !fallbackPair?.prompt) {
            fallbackPair = { prompt: user };
          }
        } else if (role === "assistant") {
          const assistant: ResolvedText = { text, source: `${source}[${idx}]` };
          if (lastUser) {
            latestPair = { prompt: lastUser, assistant };
            if (!normalizedTarget) {
              fallbackPair = latestPair;
            } else if (normalizeText(lastUser.text) === normalizedTarget) {
              return latestPair;
            }
          } else if (!normalizedTarget && !fallbackPair?.assistant) {
            fallbackPair = { assistant };
          }
        }
      }
      if (!normalizedTarget && latestPair) {
        fallbackPair = latestPair;
      }
    }
  }

  return fallbackPair ?? {};
}

function normaliseChatData(
  value: unknown,
): Record<string, CursorChatView> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const entries = Object.entries(value);
  if (entries.length === 0) {
    return undefined;
  }
  const map: Record<string, CursorChatView> = {};
  entries.forEach(([key, item]) => {
    if (Array.isArray(item) || isRecord(item)) {
      map[key] = item as CursorChatView;
    }
  });
  return Object.keys(map).length > 0 ? map : undefined;
}

function extractTextField(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    if (!(key in record)) {
      continue;
    }
    const value = record[key];
    const text = extractTextFromRichContent(value);
    if (text) {
      return text;
    }
  }
  return undefined;
}

function extractFromMessages(
  messages: unknown,
  targetRole: string,
): string | undefined {
  if (!Array.isArray(messages)) {
    return undefined;
  }
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const rawEntry = messages[index];
    if (!isRecord(rawEntry)) {
      continue;
    }
    const roleValue = "role" in rawEntry ? rawEntry.role : undefined;
    const role = toTrimmedString(roleValue)?.toLowerCase();
    if (role !== targetRole.toLowerCase()) {
      continue;
    }
    const contentValue = "content" in rawEntry ? rawEntry.content : undefined;
    const content = extractTextFromRichContent(contentValue);
    if (content) {
      return content;
    }
  }
  return undefined;
}

function resolvePromptText(
  generation: CursorGeneration,
): ResolvedText | undefined {
  const candidates: Array<{ value: unknown; source: string }> = [
    { value: generation.textDescription, source: "textDescription" },
    { value: generation.promptText, source: "promptText" },
    { value: generation.promptMarkdown, source: "promptMarkdown" },
    { value: generation.promptHtml, source: "promptHtml" },
  ];
  for (const candidate of candidates) {
    const text = extractTextFromRichContent(candidate.value);
    if (text) {
      return { text, source: candidate.source };
    }
  }
  if (isRecord(generation.request)) {
    const requestRecord = generation.request;
    const text = extractTextField(requestRecord, [
      "prompt",
      "text",
      "markdown",
      "html",
    ]);
    if (text) {
      return { text, source: "request" };
    }
  }
  const fromMessages = extractFromMessages(
    "messages" in generation ? generation.messages : undefined,
    "user",
  );
  if (fromMessages) {
    return { text: fromMessages, source: "messages.user" };
  }
  if (isRecord(generation.response)) {
    const responseRecord = generation.response;
    const promptViaResponse = extractFromMessages(
      responseRecord.messages,
      "user",
    );
    if (promptViaResponse) {
      return { text: promptViaResponse, source: "response.messages.user" };
    }
  }
  return undefined;
}

function resolveAssistantText(
  generation: CursorGeneration,
): ResolvedText | undefined {
  const directCandidates: Array<{ value: unknown; source: string }> = [
    { value: generation.responseText, source: "responseText" },
    { value: generation.responseMarkdown, source: "responseMarkdown" },
    { value: generation.responseHtml, source: "responseHtml" },
  ];
  for (const candidate of directCandidates) {
    const text = extractTextFromRichContent(candidate.value);
    if (text) {
      return { text, source: candidate.source };
    }
  }
  if (isRecord(generation.response)) {
    const responseRecord = generation.response;
    const direct = extractTextField(responseRecord, [
      "text",
      "markdown",
      "html",
    ]);
    if (direct) {
      return { text: direct, source: "response" };
    }
    if (Array.isArray(responseRecord.choices)) {
      for (const choice of responseRecord.choices as unknown[]) {
        if (!choice || typeof choice !== "object") {
          continue;
        }
        const choiceRecord = choice as Record<string, unknown>;
        const messageValue =
          "message" in choiceRecord && isRecord(choiceRecord.message)
            ? choiceRecord.message
            : undefined;
        const text =
          (messageValue &&
            extractTextFromRichContent(
              "content" in messageValue ? messageValue.content : undefined,
            )) ??
          extractTextField(choiceRecord, ["text", "markdown", "html"]);
        if (text) {
          return { text, source: "response.choices" };
        }
      }
    }
    const responseMessages = extractFromMessages(
      "messages" in responseRecord ? responseRecord.messages : undefined,
      "assistant",
    );
    if (responseMessages) {
      return { text: responseMessages, source: "response.messages" };
    }
  }
  const fromGenerationMessages = extractFromMessages(
    "messages" in generation ? generation.messages : undefined,
    "assistant",
  );
  if (fromGenerationMessages) {
    return { text: fromGenerationMessages, source: "messages.assistant" };
  }
  return undefined;
}

type SqlJsConfig = {
  locateFile?: (file: string) => string;
};

interface CursorWorkspace {
  id: string;
  folderUri?: string;
  folderPath?: string;
  state: CursorWorkspaceState;
}

interface CursorArtifact {
  snapshotPath: string;
  resourceUri: string;
  resourcePath?: string;
  timestampMs: number;
  content?: string;
  language?: string;
}

interface CursorContext {
  workspaces: CursorWorkspace[];
  artifacts: CursorArtifact[];
}

let sqlModulePromise: Promise<SqlJsModule> | null = null;
let wasmPathCache: string | null = null;

const require = createRequire(import.meta.url);

function isUrl(value: string): boolean {
  return (
    value.startsWith("file:") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/")
  );
}

function ensureAbsolutePath(p: string): string {
  if (p.startsWith("/node_modules/")) {
    return path.join(process.cwd(), p.slice(1));
  }
  if (path.isAbsolute(p)) {
    return p;
  }
  return path.resolve(process.cwd(), p);
}

async function resolveWasmPath(): Promise<string> {
  if (wasmPathCache) {
    return wasmPathCache;
  }
  const isNodeRuntime =
    typeof process !== "undefined" && !!process.versions?.node;

  if (!isNodeRuntime && typeof window !== "undefined") {
    try {
      const wasmModule = await import("sql.js/dist/sql-wasm.wasm?url");
      const wasmUrl = (wasmModule as { default: string }).default;
      if (typeof wasmUrl === "string" && wasmUrl.length > 0) {
        wasmPathCache = wasmUrl;
        return wasmUrl;
      }
    } catch {
      // Fall through to Node resolution.
    }
  }
  const pkgPath = ensureAbsolutePath(require.resolve("sql.js/package.json"));
  const wasmPath = path.join(path.dirname(pkgPath), "dist/sql-wasm.wasm");
  wasmPathCache = wasmPath;
  return wasmPath;
}

async function getSqlModule(): Promise<SqlJsModule> {
  if (!sqlModulePromise) {
    const wasmPath = await resolveWasmPath();
    const wasmDir = isUrl(wasmPath) ? undefined : path.dirname(wasmPath);
    sqlModulePromise = (
      initSqlJs as unknown as (config?: SqlJsConfig) => Promise<SqlJsModule>
    )({
      locateFile: (file: string) => {
        if (isUrl(wasmPath)) {
          return wasmPath;
        }
        const dir = wasmDir ?? path.dirname(wasmPath);
        return path.join(dir, file);
      },
    });
  }
  return sqlModulePromise;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function decodeFileUri(uri: string | undefined): string | undefined {
  if (!uri) {
    return undefined;
  }
  try {
    const url = new URL(uri);
    return decodeURIComponent(url.pathname);
  } catch {
    return undefined;
  }
}

function normalizeCursorPath(value: string | undefined): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  let normalized = value.trim();
  if (normalized.length === 0) {
    return undefined;
  }
  normalized = normalized.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  if (/^\/[A-Za-z]:/.test(normalized)) {
    normalized = normalized.slice(1);
  }
  if (/^[A-Za-z]:/.test(normalized)) {
    normalized = normalized.toLowerCase();
  }
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  return normalized;
}

async function readWorkspaceStateFromSqlite(
  statePath: string,
): Promise<CursorWorkspaceState | null> {
  try {
    const SQL = await getSqlModule();
    const buffer = await fs.readFile(statePath);
    const db = new SQL.Database(
      buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer),
    );
    const stmt = db.prepare("SELECT key, value FROM ItemTable");
    const state: CursorWorkspaceState = {};
    const chatDataKeyPattern = /^workbench\.panel\.aichat\.view\..+\.chatdata$/;
    while (stmt.step()) {
      const row = stmt.getAsObject() as { key?: string; value?: string };
      if (!row.key || typeof row.value !== "string") {
        continue;
      }
      try {
        const parsed = JSON.parse(row.value) as unknown;
        if (chatDataKeyPattern.test(row.key)) {
          if (Array.isArray(parsed) || isRecord(parsed)) {
            state.chatData = state.chatData ?? {};
            state.chatData[row.key] = parsed as CursorChatView;
          }
          continue;
        }
        if (row.key === "aiService.prompts" && Array.isArray(parsed)) {
          state.prompts = parsed as CursorPrompt[];
        } else if (
          row.key === "aiService.generations" &&
          Array.isArray(parsed)
        ) {
          state.generations = parsed as CursorGeneration[];
        } else if (
          row.key === "composer.composerData" &&
          isComposerContainer(parsed)
        ) {
          state.composers = parsed.allComposers as CursorComposer[];
        }
      } catch {
        // ignore malformed JSON
      }
    }
    stmt.free();
    db.close();
    if (
      !state.prompts &&
      !state.generations &&
      !state.composers &&
      !state.chatData
    ) {
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

function isComposerContainer(
  value: unknown,
): value is { allComposers: unknown[] } {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as { allComposers?: unknown };
  return Array.isArray(candidate.allComposers);
}

async function readWorkspaceStateFallback(
  workspaceDir: string,
): Promise<CursorWorkspaceState | null> {
  const candidates = ["workspace-state.json", "workspace-state-prompts.json"];
  // eslint-disable-next-line no-restricted-syntax
  for (const file of candidates) {
    const fullPath = path.join(workspaceDir, file);
    // eslint-disable-next-line no-await-in-loop
    if (await pathExists(fullPath)) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const raw = await fs.readFile(fullPath, "utf8");
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        const state: CursorWorkspaceState = {};
        const promptsValue = (parsed as { prompts?: unknown }).prompts;
        if (Array.isArray(promptsValue)) {
          state.prompts = promptsValue as CursorPrompt[];
        }
        const generationsValue = (parsed as { generations?: unknown })
          .generations;
        if (Array.isArray(generationsValue)) {
          state.generations = generationsValue as CursorGeneration[];
        }
        if (isComposerContainer(parsed)) {
          state.composers = parsed.allComposers as CursorComposer[];
        } else {
          const composersValue = (parsed as { composers?: unknown }).composers;
          if (Array.isArray(composersValue)) {
            state.composers = composersValue as CursorComposer[];
          }
        }
        const chatData = normaliseChatData(
          (parsed as { chatData?: unknown }).chatData,
        );
        if (chatData) {
          state.chatData = chatData;
        }
        if (
          state.prompts ||
          state.generations ||
          state.composers ||
          state.chatData
        ) {
          return state;
        }
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function readWorkspaceState(
  workspaceDir: string,
): Promise<CursorWorkspaceState | null> {
  const statePath = path.join(workspaceDir, "state.vscdb");
  if (await pathExists(statePath)) {
    const sqliteState = await readWorkspaceStateFromSqlite(statePath);
    if (sqliteState) {
      return sqliteState;
    }
  }
  return readWorkspaceStateFallback(workspaceDir);
}

async function readWorkspace(
  workspaceStorageDir: string,
  entry: string,
): Promise<CursorWorkspace | null> {
  const workspaceDir = path.join(workspaceStorageDir, entry);
  const stats = await fs.stat(workspaceDir);
  if (!stats.isDirectory()) {
    return null;
  }
  const workspaceJsonPath = path.join(workspaceDir, "workspace.json");
  let folderUri: string | undefined;
  if (await pathExists(workspaceJsonPath)) {
    try {
      const raw = await fs.readFile(workspaceJsonPath, "utf8");
      const parsed = JSON.parse(raw) as { folder?: string };
      folderUri = parsed.folder;
    } catch {
      folderUri = undefined;
    }
  }
  const state = await readWorkspaceState(workspaceDir);
  if (!state) {
    return null;
  }
  return {
    id: entry,
    folderUri,
    folderPath: decodeFileUri(folderUri),
    state,
  };
}

async function collectWorkspaces(root: string): Promise<CursorWorkspace[]> {
  const storageDir = path.join(root, "User", "workspaceStorage");
  if (!(await pathExists(storageDir))) {
    return [];
  }
  const entries = await fs.readdir(storageDir);
  const results: CursorWorkspace[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const entry of entries) {
    // eslint-disable-next-line no-await-in-loop
    const workspace = await readWorkspace(storageDir, entry);
    if (workspace) {
      results.push(workspace);
    }
  }
  return results;
}

async function collectArtifacts(root: string): Promise<CursorArtifact[]> {
  const historyRoot = path.join(root, "User", "History");
  if (!(await pathExists(historyRoot))) {
    return [];
  }
  const sessions = await fs.readdir(historyRoot);
  const artifacts: CursorArtifact[] = [];
  // eslint-disable-next-line no-restricted-syntax
  for (const session of sessions) {
    const sessionDir = path.join(historyRoot, session);
    // eslint-disable-next-line no-await-in-loop
    const stat = await fs.stat(sessionDir);
    if (!stat.isDirectory()) {
      // eslint-disable-next-line no-continue
      continue;
    }
    const entriesPath = path.join(sessionDir, "entries.json");
    // eslint-disable-next-line no-await-in-loop
    if (!(await pathExists(entriesPath))) {
      // eslint-disable-next-line no-continue
      continue;
    }
    let data: { resource?: string; entries?: Array<Record<string, unknown>> };
    try {
      // eslint-disable-next-line no-await-in-loop
      const raw = await fs.readFile(entriesPath, "utf8");
      data = JSON.parse(raw) as {
        resource?: string;
        entries?: Array<Record<string, unknown>>;
      };
    } catch {
      // eslint-disable-next-line no-continue
      continue;
    }
    if (!data.entries || !Array.isArray(data.entries)) {
      // eslint-disable-next-line no-continue
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    for (const entry of data.entries) {
      const id = typeof entry.id === "string" ? entry.id : undefined;
      const timestamp =
        typeof entry.timestamp === "number" ? entry.timestamp : undefined;
      if (!id || typeof timestamp !== "number") {
        // eslint-disable-next-line no-continue
        continue;
      }
      const snapshotPath = path.join(sessionDir, id);
      let content: string | undefined;
      if (await pathExists(snapshotPath)) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const rawContent = await fs.readFile(snapshotPath, "utf8");
          content = rawContent;
        } catch {
          content = undefined;
        }
      }
      artifacts.push({
        snapshotPath,
        resourceUri: data.resource ?? "",
        resourcePath: decodeFileUri(data.resource),
        timestampMs: timestamp,
        content,
        language: detectLanguage(snapshotPath),
      });
    }
  }
  return artifacts;
}

async function buildCursorContext(root: string): Promise<CursorContext> {
  const [workspaces, artifacts] = await Promise.all([
    collectWorkspaces(root),
    collectArtifacts(root),
  ]);
  return { workspaces, artifacts };
}

function detectLanguage(filePath: string): string | undefined {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".ts":
      return "ts";
    case ".tsx":
      return "tsx";
    case ".js":
      return "js";
    case ".jsx":
      return "jsx";
    case ".py":
      return "py";
    case ".json":
      return "json";
    case ".md":
      return "md";
    case ".sh":
      return "bash";
    case ".go":
      return "go";
    case ".rs":
      return "rust";
    default:
      return undefined;
  }
}

function truncate(text: string, max = 80): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1)}…`;
}

function formatAssistantContent(
  artifact: CursorArtifact,
  relativePath?: string,
): { content: string; attachments: MessageAttachment[] } {
  const snippet =
    artifact.content?.split(/\r?\n/).slice(0, 40).join("\n") ?? "";
  const language = artifact.language ?? "text";
  const header = relativePath
    ? `Cursor generated an update for \`${relativePath}\`.`
    : "Cursor generated an update.";
  const formatted = snippet
    ? `${header}\n\n\`\`\`${language}\n${snippet}\n\`\`\``
    : `${header}\n\n(Preview unavailable — file could not be read)`;
  const attachments: MessageAttachment[] = [];
  if (snippet) {
    attachments.push({
      type: "code",
      name: relativePath ?? path.basename(artifact.snapshotPath),
      language,
      text: snippet,
    });
  }
  return { content: formatted, attachments };
}

function buildUserMessageBlueprint(
  sessionId: string,
  generation: CursorGeneration,
  prompt: ResolvedText | undefined,
): CursorMessageBlueprint {
  const timestamp = new Date(generation.unixMs).toISOString();
  const content =
    prompt?.text ??
    extractTextFromRichContent(generation.textDescription) ??
    "(empty prompt)";
  return {
    id: `${sessionId}:user`,
    role: "user",
    timestamp,
    content,
    metadata: {
      providerMessageType: "cursor.user",
      raw: {
        source: prompt?.source ?? "textDescription",
      },
    },
  };
}

function buildAssistantMessageBlueprint(
  sessionId: string,
  artifact: CursorArtifact,
  workspace: CursorWorkspace,
  assistant: ResolvedText | undefined,
  assistantCandidate: ResolvedText | undefined,
): CursorMessageBlueprint {
  const relativePath =
    artifact.resourcePath && workspace.folderPath
      ? path.relative(workspace.folderPath, artifact.resourcePath)
      : undefined;
  const { content: snippetContent, attachments } = formatAssistantContent(
    artifact,
    relativePath,
  );
  const sections: string[] = [];
  if (assistant?.text) {
    sections.push(assistant.text);
  }
  if (snippetContent) {
    sections.push(snippetContent);
  }
  const content =
    sections.join("\n\n") ||
    "Cursor did not include assistant content for this generation.";
  return {
    id: `${sessionId}:assistant`,
    role: "assistant",
    timestamp: new Date(artifact.timestampMs).toISOString(),
    content,
    metadata: {
      attachments,
      providerMessageType: "cursor.assistant",
      raw: {
        resourceUri: artifact.resourceUri,
        snapshotPath: artifact.snapshotPath,
        source: assistant?.source ?? assistantCandidate?.source ?? "artifact",
      },
    },
  };
}

function messageFromBlueprint(blueprint: CursorMessageBlueprint): ChatMessage {
  return {
    id: blueprint.id,
    role: blueprint.role,
    kind: "content",
    timestamp: blueprint.timestamp,
    content: blueprint.content,
    metadata: blueprint.metadata,
  };
}

function buildCursorSchemaMessages(
  blueprints: CursorMessageBlueprint[],
): ChatMessage[] | null {
  ensureCursorSchemasRegistered();
  const messages: ChatMessage[] = [];
  for (const blueprint of blueprints) {
    const payload = {
      variant: "cursor/chat.message",
      id: blueprint.id,
      role: blueprint.role,
      timestamp: blueprint.timestamp,
      content: blueprint.content,
      providerMessageType: blueprint.metadata.providerMessageType,
      attachments: blueprint.metadata.attachments,
      raw: blueprint.metadata.raw,
    };
    const mappingId = cursorSchema.resolveMappingId(payload);
    if (!mappingId) {
      return null;
    }
    const normalised = normalise(mappingId, payload);
    if (!normalised) {
      return null;
    }
    const mergedMetadata = {
      ...(normalised.message.metadata ?? {}),
      ...blueprint.metadata,
    };
    messages.push({
      ...normalised.message,
      content: blueprint.content,
      metadata: mergedMetadata,
    });
  }
  return messages;
}

function findMatchingComposer(
  composers: CursorComposer[] | undefined,
  unixMs: number,
  text: string,
): CursorComposer | undefined {
  if (!composers) {
    return undefined;
  }
  const normalized = text.trim();
  let best: CursorComposer | undefined;
  let bestDelta = Number.POSITIVE_INFINITY;
  composers.forEach((composer) => {
    const delta =
      typeof composer.lastUpdatedAt === "number"
        ? Math.abs(composer.lastUpdatedAt - unixMs)
        : Number.POSITIVE_INFINITY;
    const nameMatches =
      composer.name && composer.name.trim() === normalized ? 0 : delta;
    const candidateDelta = Math.min(delta, nameMatches);
    if (candidateDelta < bestDelta) {
      best = composer;
      bestDelta = candidateDelta;
    }
  });
  const TEN_MINUTES = 10 * 60 * 1000;
  if (bestDelta > TEN_MINUTES) {
    return undefined;
  }
  return best;
}

function matchArtifactsToWorkspace(
  artifacts: CursorArtifact[],
  workspace: CursorWorkspace,
): CursorArtifact[] {
  const workspacePath = normalizeCursorPath(workspace.folderPath);
  if (!workspacePath) {
    return [];
  }
  const workspacePrefix =
    workspacePath === "/"
      ? "/"
      : workspacePath.endsWith("/")
        ? workspacePath
        : `${workspacePath}/`;
  const workspacePathLower = workspacePath.toLowerCase();
  const workspacePrefixLower = workspacePrefix.toLowerCase();
  return artifacts.filter((artifact) => {
    const candidate =
      normalizeCursorPath(artifact.resourcePath) ??
      normalizeCursorPath(decodeFileUri(artifact.resourceUri));
    if (!candidate) {
      return false;
    }
    if (candidate === workspacePath || candidate.startsWith(workspacePrefix)) {
      return true;
    }
    const candidateLower = candidate.toLowerCase();
    return (
      candidateLower === workspacePathLower ||
      candidateLower.startsWith(workspacePrefixLower)
    );
  });
}

function matchArtifactForGeneration(
  artifacts: CursorArtifact[],
  generation: CursorGeneration,
  usedSnapshots: Set<string>,
): CursorArtifact | undefined {
  const windowMs = 5 * 60 * 1000;
  const sorted = artifacts
    .filter((artifact) => !usedSnapshots.has(artifact.snapshotPath))
    .sort((a, b) => a.timestampMs - b.timestampMs);
  for (const artifact of sorted) {
    if (Math.abs(artifact.timestampMs - generation.unixMs) <= windowMs) {
      usedSnapshots.add(artifact.snapshotPath);
      return artifact;
    }
  }
  return undefined;
}

function createCursorSession(
  workspace: CursorWorkspace,
  generation: CursorGeneration,
  composer: CursorComposer | undefined,
  artifact: CursorArtifact,
): ChatSession {
  const sessionId = encodeSessionId(artifact.snapshotPath);
  const promptCandidate = resolvePromptText(generation);
  const chatPair = resolveChatDataPair(
    workspace.state.chatData,
    promptCandidate?.text ?? generation.textDescription ?? undefined,
  );
  const finalPrompt = promptCandidate ?? chatPair.prompt;
  const assistantCandidate = resolveAssistantText(generation);
  const finalAssistant = assistantCandidate ?? chatPair.assistant;
  const userBlueprint = buildUserMessageBlueprint(
    sessionId,
    generation,
    finalPrompt,
  );
  const assistantBlueprint = buildAssistantMessageBlueprint(
    sessionId,
    artifact,
    workspace,
    finalAssistant,
    assistantCandidate,
  );
  const schemaEnabled = process.env.NEXT_PUBLIC_SCHEMA_NORMALISER === "1";
  const schemaMessages = schemaEnabled
    ? buildCursorSchemaMessages([userBlueprint, assistantBlueprint])
    : null;
  const messages = schemaMessages ?? [
    messageFromBlueprint(userBlueprint),
    messageFromBlueprint(assistantBlueprint),
  ];
  const topic = truncate(
    finalPrompt?.text ??
      composer?.name ??
      generation.textDescription ??
      "Cursor session",
  );
  const participants = ["user", "assistant"];
  const startedAt =
    messages[0]?.timestamp ?? new Date(generation.unixMs).toISOString();
  return {
    id: sessionId,
    source: "cursor",
    topic,
    startedAt,
    participants,
    messages,
    metadata: {
      sourceFile: artifact.snapshotPath,
      sourceDir: path.dirname(artifact.snapshotPath),
      summary: topic,
      project: workspace.folderPath
        ? path.basename(workspace.folderPath)
        : undefined,
      provider: {
        model: "cursor",
      },
      extra: {
        cursor: {
          generationUUID: generation.generationUUID,
          composerId: composer?.composerId,
          resourcePath: artifact.resourcePath,
          promptSource: finalPrompt?.source,
          assistantSource: finalAssistant?.source ?? assistantCandidate?.source,
        },
      },
    },
  };
}

function validGeneration(generation: CursorGeneration): boolean {
  if (generation.type && generation.type !== "composer") {
    return false;
  }
  if (!generation.textDescription || generation.textDescription.trim() === "") {
    return false;
  }
  if (typeof generation.unixMs !== "number") {
    return false;
  }
  return true;
}

async function collectCursorSessions(
  root: string,
  previousSignatures: Record<string, number>,
): Promise<ProviderLoadResult> {
  const context = await buildCursorContext(root);
  const sessions: ChatSession[] = [];
  const signatures: Record<string, number> = {};
  const errors: Array<{ provider: "cursor"; reason: string }> = [];
  if (context.workspaces.length === 0) {
    return { sessions, signatures, errors };
  }
  const usedSnapshots = new Set<string>();
  context.workspaces.forEach((workspace) => {
    const generations = workspace.state.generations ?? [];
    if (generations.length === 0) {
      return;
    }
    const artifacts = matchArtifactsToWorkspace(
      context.artifacts,
      workspace,
    ).sort((a, b) => a.timestampMs - b.timestampMs);
    if (artifacts.length === 0) {
      return;
    }
    generations
      .filter(validGeneration)
      .sort((a, b) => a.unixMs - b.unixMs)
      .forEach((generation) => {
        if (
          previousSignatures[generation.generationUUID] &&
          previousSignatures[generation.generationUUID] === generation.unixMs
        ) {
          return;
        }
        const artifact = matchArtifactForGeneration(
          artifacts,
          generation,
          usedSnapshots,
        );
        if (!artifact) {
          return;
        }
        const composer = findMatchingComposer(
          workspace.state.composers,
          generation.unixMs,
          generation.textDescription ?? "",
        );
        const session = createCursorSession(
          workspace,
          generation,
          composer,
          artifact,
        );
        sessions.push(session);
        signatures[artifact.snapshotPath] = generation.unixMs;
        previousSignatures[generation.generationUUID] = generation.unixMs;
      });
  });
  if (sessions.length === 0) {
    errors.push({
      provider: "cursor",
      reason:
        "No Cursor sessions detected. Ensure Cursor chat data (`state.vscdb`) and history snapshots exist for the selected workspace.",
    });
  }
  return { sessions, signatures, errors };
}

export async function loadCursorSessions(
  root: string,
  previousSignatures: Record<string, number>,
  previousByFile: Map<string, ChatSession>,
): Promise<ProviderLoadResult> {
  void previousByFile;
  try {
    return await collectCursorSessions(root, { ...previousSignatures });
  } catch (error) {
    return {
      sessions: [],
      signatures: {},
      errors: [
        {
          provider: "cursor",
          reason:
            error instanceof Error
              ? error.message
              : "Failed to load Cursor sessions",
        },
      ],
    };
  }
}

function inferCursorRootFromSnapshot(filePath: string): string | undefined {
  const historyDir = path.dirname(path.dirname(path.dirname(filePath)));
  const userDir = path.dirname(historyDir);
  const rootDir = path.dirname(userDir);
  return rootDir;
}

export async function loadCursorSessionFromFile(
  filePath: string,
): Promise<ChatSession | null> {
  const root = inferCursorRootFromSnapshot(filePath);
  if (!root) {
    return null;
  }
  const result = await collectCursorSessions(root, {});
  const match = result.sessions.find(
    (session) => session.metadata?.sourceFile === filePath,
  );
  return match ?? null;
}
