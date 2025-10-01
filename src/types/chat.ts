export type AgentSource = "claude" | "codex";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  timestamp: string;
  content: string;
}

export interface ChatSession {
  id: string;
  source: AgentSource;
  topic: string;
  startedAt: string;
  participants: string[];
  messages: ChatMessage[];
  metadata?: Record<string, unknown>;
}

export interface ChatFilterState {
  sources: AgentSource[];
  query: string;
}
