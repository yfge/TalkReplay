import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AgentSource, ChatFilterState, ChatSession } from "@/types/chat";

interface ChatState {
  sessions: ChatSession[];
  filters: ChatFilterState;
  activeSessionId: string | null;
  setSessions: (sessions: ChatSession[]) => void;
  setActiveSession: (id: string | null) => void;
  toggleSource: (source: AgentSource) => void;
  setQuery: (query: string) => void;
}

const defaultFilters: ChatFilterState = {
  sources: ["claude", "codex"],
  query: "",
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      sessions: [],
      filters: defaultFilters,
      activeSessionId: null,
      setSessions: (sessions) =>
        set(() => ({
          sessions,
          activeSessionId: sessions[0]?.id ?? null,
        })),
      setActiveSession: (id) => set(() => ({ activeSessionId: id })),
      toggleSource: (source) =>
        set((state) => {
          const isActive = state.filters.sources.includes(source);
          const nextSources = isActive
            ? state.filters.sources.filter((item) => item !== source)
            : [...state.filters.sources, source];
          return {
            filters: {
              ...state.filters,
              sources: nextSources.length > 0 ? nextSources : [source],
            },
          };
        }),
      setQuery: (query) =>
        set((state) => ({
          filters: {
            ...state.filters,
            query,
          },
        })),
    }),
    {
      name: "agents-chat-state",
    },
  ),
);

export function useFilteredSessions(): ChatSession[] {
  return useChatStore((state) => {
    const normalizedQuery = state.filters.query.trim().toLowerCase();
    return state.sessions.filter((session) => {
      const matchesSource = state.filters.sources.includes(session.source);
      if (!matchesSource) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const topicMatch = session.topic.toLowerCase().includes(normalizedQuery);
      const messageMatch = session.messages.some((message) =>
        message.content.toLowerCase().includes(normalizedQuery),
      );
      return topicMatch || messageMatch;
    });
  });
}

export function useActiveSession(): ChatSession | null {
  const { sessions, activeSessionId } = useChatStore((state) => ({
    sessions: state.sessions,
    activeSessionId: state.activeSessionId,
  }));
  return sessions.find((session) => session.id === activeSessionId) ?? null;
}
