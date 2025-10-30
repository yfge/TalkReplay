export interface ProviderPaths {
  claude?: string;
  codex?: string;
  gemini?: string;
  cursor?: string;
}

function normalise(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

const runtimeClaudeRoot =
  typeof process !== "undefined" ? process.env.CLAUDE_ROOT : undefined;
const runtimeCodexRoot =
  typeof process !== "undefined" ? process.env.CODEX_ROOT : undefined;
const runtimeGeminiRoot =
  typeof process !== "undefined" ? process.env.GEMINI_ROOT : undefined;
const runtimeCursorRoot =
  typeof process !== "undefined" ? process.env.CURSOR_ROOT : undefined;

const DEFAULT_CONFIG: ProviderPaths = {
  claude: normalise(process.env.NEXT_PUBLIC_CLAUDE_ROOT ?? runtimeClaudeRoot),
  codex: normalise(process.env.NEXT_PUBLIC_CODEX_ROOT ?? runtimeCodexRoot),
  gemini: normalise(process.env.NEXT_PUBLIC_GEMINI_ROOT ?? runtimeGeminiRoot),
  cursor: normalise(process.env.NEXT_PUBLIC_CURSOR_ROOT ?? runtimeCursorRoot),
};

export function getProviderPaths(): ProviderPaths {
  return { ...DEFAULT_CONFIG };
}

export type ProviderKey = keyof ProviderPaths;
