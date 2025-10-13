export type AgentSource = "claude" | "codex" | "gemini";

export const SUPPORTED_SOURCES = ["claude", "codex"] as const;

export type ChatRole = "user" | "assistant" | "system" | "tool";

export type ChatMessageKind =
  | "content"
  | "reasoning"
  | "tool-call"
  | "tool-result"
  | "system";

export interface TokenUsage {
  prompt?: number;
  completion?: number;
  total?: number;
}

export interface MessageAttachment {
  type: "code" | "file" | "image" | "link";
  name?: string;
  uri?: string;
  language?: string;
  mimeType?: string;
  text?: string;
}

export interface MessageMetadata {
  attachments?: MessageAttachment[];
  toolCallId?: string;
  latencyMs?: number;
  tokens?: TokenUsage;
  toolCall?: {
    id?: string;
    name?: string;
    arguments?: unknown;
    // Suggested values: "bash" | "apply_patch" | "mcp" | "web_search" | "file_change" | ...
    toolType?: string;
  };
  toolResult?: {
    callId?: string;
    output?: unknown;
    exitCode?: number;
    durationMs?: number;
    stdout?: string;
    stderr?: string;
    filesChanged?: string[];
    diff?: string;
  };
  reasoning?: {
    summary?: string;
    detail?: string | null;
    providerType?: string;
  };
  providerMessageType?: string;
  raw?: unknown;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  kind: ChatMessageKind;
  timestamp: string;
  content?: string | null;
  metadata?: MessageMetadata;
}

export interface ProviderDetails {
  model?: string;
  version?: string;
  temperature?: number;
  topP?: number;
  extra?: Record<string, unknown>;
}

export interface SessionMetadata {
  sourceFile?: string;
  sourceDir?: string;
  importedAt?: string;
  tags?: string[];
  summary?: string;
  language?: string;
  project?: string;
  provider?: ProviderDetails;
  format?: string;
  extra?: Record<string, unknown>;
}

export interface ChatSession {
  id: string;
  source: AgentSource;
  topic: string;
  startedAt: string;
  participants: string[];
  messages: ChatMessage[];
  metadata?: SessionMetadata;
}

export interface ChatSessionSummary {
  id: string;
  source: AgentSource;
  topic: string;
  startedAt: string;
  participants: string[];
  metadata?: SessionMetadata;
  preview?: string;
  messageCount: number;
}

export interface ChatFilterState {
  sources: AgentSource[];
  query: string;
  showStarredOnly: boolean;
  startDate?: string;
  endDate?: string;
  project?: string;
}
