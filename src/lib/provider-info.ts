import type { AgentSource } from "@/types/chat";

export const providerBadgeClass: Record<AgentSource, string> = {
  claude: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
  codex:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  gemini:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
};
