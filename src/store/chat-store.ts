import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AgentSource, ChatFilterState, ChatSession } from "@/types/chat";
import { SUPPORTED_SOURCES } from "@/types/chat";

interface ChatState {
  sessions: ChatSession[];
  filters: ChatFilterState;
  activeSessionId: string | null;
  starred: Set<string>;
  setSessions: (sessions: ChatSession[]) => void;
  setActiveSession: (id: string | null) => void;
  toggleSource: (source: AgentSource) => void;
  setQuery: (query: string) => void;
  toggleStarred: (id: string) => void;
  setDateRange: (start?: string, end?: string) => void;
  setShowStarred: (value: boolean) => void;
}

const defaultFilters: ChatFilterState = {
  sources: [...SUPPORTED_SOURCES],
  query: "",
  showStarredOnly: false,
  startDate: undefined,
  endDate: undefined,
};

function pruneStarred(
  starred: Set<string>,
  sessions: ChatSession[],
): Set<string> {
  const existingIds = new Set(sessions.map((session) => session.id));
  const next = new Set<string>();
  starred.forEach((id) => {
    if (existingIds.has(id)) {
      next.add(id);
    }
  });
  return next;
}

type ChatPersistedState = Partial<
  Pick<ChatState, "sessions" | "filters" | "activeSessionId">
> & {
  starred?: string[];
};

export const useChatStore = create<ChatState>()(
  persist<ChatState, ChatPersistedState>(
    (set) => ({
      sessions: [],
      filters: defaultFilters,
      activeSessionId: null,
      starred: new Set<string>(),
      setSessions: (sessions) =>
        set((state) => ({
          sessions,
          activeSessionId: sessions[0]?.id ?? null,
          starred: pruneStarred(state.starred, sessions),
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
      toggleStarred: (id) =>
        set((state) => {
          const next = new Set(state.starred);
          if (next.has(id)) {
            next.delete(id);
          } else {
            next.add(id);
          }
          return { starred: next };
        }),
      setDateRange: (start, end) =>
        set((state) => ({
          filters: {
            ...state.filters,
            startDate: start,
            endDate: end,
          },
        })),
      setShowStarred: (value) =>
        set((state) => ({
          filters: {
            ...state.filters,
            showStarredOnly: value,
          },
        })),
    }),
    {
      name: "agents-chat-state",
      version: 2,
      partialize: (state) => ({
        sessions: state.sessions,
        filters: state.filters,
        activeSessionId: state.activeSessionId,
        starred: Array.from(state.starred),
      }),
      merge: (persisted, current) => {
        const incoming: ChatPersistedState = persisted ?? {};
        const mergedFilters: ChatFilterState = {
          ...current.filters,
          ...(incoming.filters ?? {}),
          showStarredOnly:
            incoming.filters?.showStarredOnly ??
            current.filters.showStarredOnly,
        };

        const sessions = incoming.sessions ?? current.sessions;
        const activeSessionId =
          incoming.activeSessionId ?? current.activeSessionId;
        const starred = new Set<string>(
          incoming.starred ?? Array.from(current.starred),
        );

        return {
          ...current,
          sessions,
          filters: mergedFilters,
          activeSessionId,
          starred,
        };
      },
    },
  ),
);

export function useFilteredSessions(): ChatSession[] {
  return useChatStore((state) => {
    const normalizedQuery = state.filters.query.trim().toLowerCase();
    const start = state.filters.startDate
      ? new Date(state.filters.startDate)
      : null;
    const end = state.filters.endDate ? new Date(state.filters.endDate) : null;

    return state.sessions.filter((session) => {
      const matchesSource = state.filters.sources.includes(session.source);
      if (!matchesSource) {
        return false;
      }

      if (state.filters.showStarredOnly && !state.starred.has(session.id)) {
        return false;
      }

      if (start || end) {
        const startedAt = new Date(session.startedAt);
        if (Number.isNaN(startedAt.getTime())) {
          return false;
        }
        if (start && startedAt < start) {
          return false;
        }
        if (end) {
          const endOfDay = new Date(end);
          endOfDay.setHours(23, 59, 59, 999);
          if (startedAt > endOfDay) {
            return false;
          }
        }
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

export function useIsStarred(id: string): boolean {
  return useChatStore((state) => state.starred.has(id));
}
