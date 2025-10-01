import type { ProviderPaths } from "@/config/providerPaths";
import type { ChatSession } from "@/types/chat";
import type { ProviderImportError } from "@/types/providers";

export interface LoadSessionsPayload {
  paths: ProviderPaths;
  previousSignatures: Record<string, number>;
  previousSessions: ChatSession[];
}

export interface LoadSessionsResult {
  sessions: ChatSession[];
  signatures: Record<string, number>;
  errors: ProviderImportError[];
}
