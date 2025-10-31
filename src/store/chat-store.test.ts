import { describe, expect, it } from "vitest";

import type { AgentSource } from "@/types/chat";

import { useChatStore } from "./chat-store";

describe("chat store persistence", () => {
  it("adds cursor source during migration from older versions", () => {
    const migrate = useChatStore.persist.getOptions().migrate;
    expect(migrate).toBeDefined();
    const persistedState = {
      filters: {
        sources: ["claude", "codex"] satisfies AgentSource[],
        query: "",
        showStarredOnly: false,
      },
      activeSessionId: null,
      starred: [],
    };
    const result = migrate?.(persistedState, 5) as {
      filters?: { sources?: AgentSource[] };
    };
    expect(result).toBeDefined();
    expect(result.filters?.sources).toContain("cursor");
  });

  it("respects user-disabled cursor sources after migration threshold", () => {
    const migrate = useChatStore.persist.getOptions().migrate;
    expect(migrate).toBeDefined();
    const persistedState = {
      filters: {
        sources: ["codex"] satisfies AgentSource[],
        query: "",
        showStarredOnly: false,
      },
      activeSessionId: null,
      starred: [],
    };
    const result = migrate?.(persistedState, 6) as {
      filters?: { sources?: AgentSource[] };
    };
    expect(result).toBeDefined();
    expect(result.filters?.sources).not.toContain("cursor");
    expect(result.filters?.sources).toEqual(["codex"]);
  });

  it("sanitises unsupported sources on merge", () => {
    const options = useChatStore.persist.getOptions();
    const merged = options.merge?.(
      {
        filters: {
          sources: ["codex", "unknown-source"],
          query: "",
          showStarredOnly: false,
        },
        activeSessionId: null,
      },
      useChatStore.getState(),
    );
    expect(merged?.filters.sources).not.toContain("unknown-source");
  });
});
