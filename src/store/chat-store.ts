import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type PersistOptions,
} from "zustand/middleware";

import { safeStateStorage } from "@/lib/safe-storage";
import type {
  AgentSource,
  ChatFilterState,
  ChatSession,
  ChatSessionSummary,
} from "@/types/chat";
import { SUPPORTED_SOURCES } from "@/types/chat";

interface ChatState {
  sessionSummaries: ChatSessionSummary[];
  sessionDetails: Record<string, ChatSession>;
  filters: ChatFilterState;
  activeSessionId: string | null;
  starred: Set<string>;
  setSessionSummaries: (sessions: ChatSessionSummary[]) => void;
  appendSessionSummaries: (sessions: ChatSessionSummary[]) => void;
  setSessionDetail: (session: ChatSession) => void;
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
  summaries: ChatSessionSummary[],
): Set<string> {
  const existingIds = new Set(summaries.map((session) => session.id));
  const next = new Set<string>();
  starred.forEach((id) => {
    if (existingIds.has(id)) {
      next.add(id);
    }
  });
  return next;
}

type ChatPersistedState = Partial<
  Pick<ChatState, "filters" | "activeSessionId">
> & {
  starred?: string[];
};

function normalizeSessionSummaries(
  state: Pick<ChatState, "sessionDetails" | "activeSessionId" | "starred">,
  sessions: ChatSessionSummary[],
): Pick<
  ChatState,
  "sessionSummaries" | "sessionDetails" | "activeSessionId" | "starred"
> {
  const deduped = Array.from(
    new Map(sessions.map((session) => [session.id, session])).values(),
  );

  const sorted = deduped.slice().sort((a, b) => {
    const aTime = Date.parse(a.startedAt);
    const bTime = Date.parse(b.startedAt);
    if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
      return 0;
    }
    if (Number.isNaN(aTime)) {
      return 1;
    }
    if (Number.isNaN(bTime)) {
      return -1;
    }
    return bTime - aTime;
  });

  const summaryIds = new Set(sorted.map((item) => item.id));
  const activeSessionId =
    state.activeSessionId && summaryIds.has(state.activeSessionId)
      ? state.activeSessionId
      : (sorted[0]?.id ?? null);

  const prunedDetails = Object.fromEntries(
    Object.entries(state.sessionDetails).filter(([id]) => summaryIds.has(id)),
  );

  return {
    sessionSummaries: sorted,
    sessionDetails: prunedDetails,
    activeSessionId,
    starred: pruneStarred(state.starred, sorted),
  };
}

const chatStorePersistOptions: PersistOptions<ChatState, ChatPersistedState> = {
  name: "agents-chat-state",
  version: 3,
  storage: createJSONStorage(() => safeStateStorage),
  partialize: (state) => ({
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
        incoming.filters?.showStarredOnly ?? current.filters.showStarredOnly,
    };

    const activeSessionId = incoming.activeSessionId ?? current.activeSessionId;
    const starred = new Set<string>(
      incoming.starred ?? Array.from(current.starred),
    );

    return {
      ...current,
      filters: mergedFilters,
      activeSessionId,
      starred,
    };
  },
};

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      sessionSummaries: [],
      sessionDetails: {},
      filters: defaultFilters,
      activeSessionId: null,
      starred: new Set<string>(),
      setSessionSummaries: (sessions) =>
        set((state) => normalizeSessionSummaries(state, sessions)),
      appendSessionSummaries: (sessions) =>
        set((state) => {
          if (sessions.length === 0) {
            return {};
          }
          const merged = [...state.sessionSummaries, ...sessions];
          return normalizeSessionSummaries(state, merged);
        }),
      setSessionDetail: (session) =>
        set((state) => ({
          sessionDetails: {
            ...state.sessionDetails,
            [session.id]: session,
          },
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
    chatStorePersistOptions,
  ),
);

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (
    window as typeof window & { __CHAT_STORE__?: typeof useChatStore }
  ).__CHAT_STORE__ = useChatStore;
}

export function useFilteredSessionSummaries(): ChatSessionSummary[] {
  return useChatStore((state) => {
    const normalizedQuery = state.filters.query.trim().toLowerCase();
    const start = state.filters.startDate
      ? new Date(state.filters.startDate)
      : null;
    const end = state.filters.endDate ? new Date(state.filters.endDate) : null;

    return state.sessionSummaries.filter((session) => {
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
      const summaryMatch = session.metadata?.summary
        ?.toLowerCase()
        .includes(normalizedQuery);
      const previewMatch = session.preview
        ?.toLowerCase()
        .includes(normalizedQuery);

      return topicMatch || summaryMatch || previewMatch;
    });
  });
}

export function useActiveSession(): ChatSession | null {
  return useChatStore((state) => {
    if (!state.activeSessionId) {
      return null;
    }
    return state.sessionDetails[state.activeSessionId] ?? null;
  });
}

export function useIsStarred(id: string): boolean {
  return useChatStore((state) => state.starred.has(id));
}
