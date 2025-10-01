import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  persist(
    (set) => ({
      fileSignatures: {},
      lastImportedAt: undefined,
      errors: [],
      setImportResult: ({ signatures, errors }) =>
        set((state) => ({
          fileSignatures: { ...state.fileSignatures, ...signatures },
          lastImportedAt: new Date().toISOString(),
          errors,
        })),
      clearErrors: () => set(() => ({ errors: [] })),
    }),
    {
      name: "agents-import-state",
    },
  ),
);
