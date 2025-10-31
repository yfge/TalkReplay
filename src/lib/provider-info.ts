import type { AgentSource } from "@/types/chat";

export const providerBadgeClass: Record<AgentSource, string> = {
  claude:
    "bg-primary/15 text-primary dark:bg-primary/25 dark:text-primary-foreground",
  codex:
    "bg-secondary/20 text-secondary dark:bg-secondary/25 dark:text-secondary-foreground",
  cursor:
    "bg-muted/20 text-muted-foreground dark:bg-muted/30 dark:text-muted-foreground",
  gemini:
    "bg-accent/20 text-accent dark:bg-accent/30 dark:text-accent-foreground",
};
