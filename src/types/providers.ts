export type ProviderId = "claude" | "codex" | "gemini";

export interface ProviderImportError {
  provider: ProviderId;
  file?: string;
  reason: string;
}
