import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { safeStateStorage } from "@/lib/safe-storage";
import type { ProviderImportError } from "@/types/providers";

interface ImportResult {
  signatures: Record<string, number>;
  errors: ProviderImportError[];
}

interface ImportState {
  fileSignatures: Record<string, number>;
  lastImportedAt?: string;
  errors: ProviderImportError[];
  setImportResult: (result: ImportResult) => void;
  clearErrors: () => void;
}

export const useImportStore = create<ImportState>()(
  persist<ImportState>(
    (set) => ({
      fileSignatures: {},
      lastImportedAt: undefined,
      errors: [],
      setImportResult: ({ signatures, errors }) =>
        set((state) => ({
          fileSignatures: {
            ...Object.fromEntries(
              Object.entries(state.fileSignatures).filter(([key]) => {
                const separatorIndex = key.indexOf(":");
                if (separatorIndex === -1) {
                  return true;
                }
                const raw = key.slice(separatorIndex + 1);
                if (raw.startsWith("/")) {
                  return false;
                }
                if (/^[A-Za-z]:[\\/]/.test(raw)) {
                  return false;
                }
                return true;
              }),
            ),
            ...signatures,
          },
          lastImportedAt: new Date().toISOString(),
          errors,
        })),
      clearErrors: () => set(() => ({ errors: [] })),
    }),
    {
      name: "agents-import-state",
      storage: createJSONStorage(() => safeStateStorage),
    },
  ),
);
