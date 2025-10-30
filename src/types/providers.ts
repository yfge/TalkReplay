export type ProviderId = "claude" | "codex" | "gemini" | "cursor";

export interface ProviderImportError {
  provider: ProviderId;
  file?: string;
  reason: string;
}
