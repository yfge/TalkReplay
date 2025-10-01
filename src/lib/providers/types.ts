import type { ChatSession } from "@/types/chat";
import type { ProviderImportError } from "@/types/providers";

export interface ProviderLoadResult {
  sessions: ChatSession[];
  signatures: Record<string, number>;
  errors: ProviderImportError[];
}
