import type { StateStorage } from "zustand/middleware";

const isBrowser = typeof window !== "undefined";

const memoryStore = new Map<string, string>();

function readFromMemory(name: string): string | null {
  return memoryStore.has(name) ? memoryStore.get(name)! : null;
}

export const safeStateStorage: StateStorage = {
  getItem: (name) => {
    if (!isBrowser) {
      return readFromMemory(name);
    }
    try {
      const value = window.localStorage.getItem(name);
      if (value !== null) {
        return value;
      }
      return readFromMemory(name);
    } catch (error) {
      console.warn("agents-chat: failed to read persisted state", error);
      return readFromMemory(name);
    }
  },
  setItem: (name, value) => {
    if (!isBrowser) {
      memoryStore.set(name, value);
      return;
    }
    try {
      window.localStorage.setItem(name, value);
      memoryStore.delete(name);
    } catch (error) {
      console.warn(
        "agents-chat: localStorage quota hit, falling back to in-memory store",
        error,
      );
      memoryStore.set(name, value);
    }
  },
  removeItem: (name) => {
    if (isBrowser) {
      try {
        window.localStorage.removeItem(name);
      } catch (error) {
        console.warn("agents-chat: failed to remove persisted state", error);
      }
    }
    memoryStore.delete(name);
  },
};
