import { sampleSessions } from "@/data/sampleSessions";
import { SUPPORTED_SOURCES, type ChatSession } from "@/types/chat";

export function getSampleSessions(): ChatSession[] {
  const allowed = new Set<string>(SUPPORTED_SOURCES);
  const filtered = sampleSessions.filter((session) =>
    allowed.has(session.source),
  );
  return filtered.length > 0 ? filtered : sampleSessions;
}
