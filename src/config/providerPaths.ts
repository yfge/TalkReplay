export interface ProviderPaths {
  claude?: string;
  codex?: string;
  gemini?: string;
}

function normalise(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

const DEFAULT_CONFIG: ProviderPaths = {
  claude: normalise(process.env.NEXT_PUBLIC_CLAUDE_ROOT),
  codex: normalise(process.env.NEXT_PUBLIC_CODEX_ROOT),
  gemini: normalise(process.env.NEXT_PUBLIC_GEMINI_ROOT),
};

export function getProviderPaths(): ProviderPaths {
  return { ...DEFAULT_CONFIG };
}

export type ProviderKey = keyof ProviderPaths;
