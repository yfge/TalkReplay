import type { ProviderPaths } from "@/config/providerPaths";
import type { ChatSession, ChatSessionSummary } from "@/types/chat";
import type { ProviderImportError } from "@/types/providers";

export interface LoadSessionSummariesPayload {
  paths: ProviderPaths;
  previousSignatures: Record<string, number>;
}

export interface LoadSessionSummariesResult {
  sessions: ChatSessionSummary[];
  signatures: Record<string, number>;
  errors: ProviderImportError[];
}

export interface LoadSessionDetailPayload {
  id: string;
  paths: ProviderPaths;
}

export interface LoadSessionDetailResult {
  session?: ChatSession;
  error?: ProviderImportError;
}
