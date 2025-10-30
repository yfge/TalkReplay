import type { ProviderLoadResult } from "@/lib/providers/types";
import type { ChatSession } from "@/types/chat";

/**
 * Placeholder Cursor provider to wire up path detection and API plumbing.
 * Actual parsing logic will land alongside schema-backed fixtures.
 */
export function loadCursorSessions(
  root: string,
  previousSignatures: Record<string, number>,
  previousByFile: Map<string, ChatSession>,
): Promise<ProviderLoadResult> {
  void root;
  void previousSignatures;
  void previousByFile;
  return Promise.resolve({ sessions: [], signatures: {}, errors: [] });
}

export function loadCursorSessionFromFile(
  filePath: string,
): Promise<ChatSession | null> {
  void filePath;
  return Promise.resolve(null);
}
