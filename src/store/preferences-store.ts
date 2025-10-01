import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { ProviderKey, ProviderPaths } from "@/config/providerPaths";
import { getProviderPaths } from "@/config/providerPaths";

interface PreferencesState {
  providerPaths: ProviderPaths;
  isSetupComplete: boolean;
  setProviderPath: (provider: ProviderKey, path: string) => void;
  clearProviderPath: (provider: ProviderKey) => void;
  completeSetup: () => void;
}

const initialPaths = getProviderPaths();

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      providerPaths: initialPaths,
      isSetupComplete: Object.values(initialPaths).some(Boolean),
      setProviderPath: (provider, path) =>
        set((state) => ({
          providerPaths: {
            ...state.providerPaths,
            [provider]: path.trim() || undefined,
          },
        })),
      clearProviderPath: (provider) =>
        set((state) => ({
          providerPaths: {
            ...state.providerPaths,
            [provider]: undefined,
          },
        })),
      completeSetup: () =>
        set((state) => ({
          isSetupComplete:
            state.isSetupComplete ||
            Object.values(state.providerPaths).some(Boolean),
        })),
    }),
    {
      name: "agents-preferences",
    },
  ),
);
