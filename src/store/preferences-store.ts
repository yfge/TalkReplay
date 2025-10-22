import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { ProviderKey, ProviderPaths } from "@/config/providerPaths";
import { getProviderPaths } from "@/config/providerPaths";
import { safeStateStorage } from "@/lib/safe-storage";

interface PreferencesState {
  providerPaths: ProviderPaths;
  isSetupComplete: boolean;
  setProviderPath: (provider: ProviderKey, path: string) => void;
  clearProviderPath: (provider: ProviderKey) => void;
  completeSetup: () => void;
  hydrateProviderPaths: (paths?: ProviderPaths) => void;
}

const initialPaths = getProviderPaths();

export const usePreferencesStore = create<PreferencesState>()(
  persist<PreferencesState>(
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
      hydrateProviderPaths: (paths) =>
        set((state) => {
          if (!paths) {
            return state;
          }
          const next: ProviderPaths = { ...state.providerPaths };
          let didUpdate = false;
          (
            Object.entries(paths) as [ProviderKey, string | undefined][]
          ).forEach(([provider, value]) => {
            if (!value) {
              return;
            }
            const current = next[provider];
            if (typeof current === "string" && current.trim().length > 0) {
              return;
            }
            next[provider] = value;
            didUpdate = true;
          });
          if (!didUpdate) {
            return state;
          }
          return {
            providerPaths: next,
            isSetupComplete:
              state.isSetupComplete || Object.values(next).some(Boolean),
          };
        }),
    }),
    {
      name: "agents-preferences",
      storage: createJSONStorage(() => safeStateStorage),
    },
  ),
);
