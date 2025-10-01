export interface ProviderPaths {
  claudeRoot?: string;
  codexRoot?: string;
  geminiRoot?: string;
}

function normalise(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

const env = import.meta.env;

const DEFAULT_CONFIG: ProviderPaths = {
  claudeRoot: normalise(env.VITE_CLAUDE_ROOT),
  codexRoot: normalise(env.VITE_CODEX_ROOT),
  geminiRoot: normalise(env.VITE_GEMINI_ROOT),
};

export function getProviderPaths(): ProviderPaths {
  return { ...DEFAULT_CONFIG };
}

export type ProviderKey = keyof ProviderPaths;
