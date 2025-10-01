import { Clock } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useChatStore, useFilteredSessions } from "@/store/chat-store";
import type { ChatSession } from "@/types/chat";

interface ChatListProps {
  onSelect?: (session: ChatSession) => void;
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

export function ChatList({ onSelect }: ChatListProps) {
  const sessions = useFilteredSessions();
  const activeSessionId = useChatStore((state) => state.activeSessionId);
  const setActiveSession = useChatStore((state) => state.setActiveSession);

  if (sessions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <Clock className="size-5" />
        <p>No conversations match your filters yet.</p>
        <p className="text-xs">Import a transcript to get started.</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col divide-y">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          return (
            <button
              key={session.id}
              className="flex flex-col items-start gap-1 p-4 text-left transition hover:bg-accent data-[state=active]:bg-accent"
              type="button"
              onClick={() => {
                setActiveSession(session.id);
                onSelect?.(session);
              }}
              data-state={isActive ? "active" : undefined}
            >
              <span className="text-sm font-semibold text-foreground">
                {session.topic || "Untitled conversation"}
              </span>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {session.source} • {formatTimestamp(session.startedAt)}
              </span>
              <span className="line-clamp-2 text-xs text-muted-foreground">
                {session.messages[0]?.content ?? "No preview available."}
              </span>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
