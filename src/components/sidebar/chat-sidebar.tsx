import { CalendarDays, Filter, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useChatStore } from "@/store/chat-store";
import { SUPPORTED_SOURCES } from "@/types/chat";
import type { AgentSource } from "@/types/chat";

const sourceLabels: Record<AgentSource, string> = {
  claude: "Claude",
  codex: "Codex",
  cursor: "Cursor",
  gemini: "Gemini",
};

export function ChatSidebar() {
  const filters = useChatStore((state) => state.filters);
  const toggleSource = useChatStore((state) => state.toggleSource);
  const setQuery = useChatStore((state) => state.setQuery);
  const setShowStarred = useChatStore((state) => state.setShowStarred);
  const setDateRange = useChatStore((state) => state.setDateRange);
  const setProject = useChatStore((state) => state.setProject);
  const sessionSummaries = useChatStore((state) => state.sessionSummaries);
  const { t } = useTranslation();

  const projectOptions = Array.from(
    new Set(
      sessionSummaries
        .map((s) => s.metadata?.project)
        .filter((p): p is string => typeof p === "string" && p.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Filter className="size-4 text-accent" />
          {t("sidebar.filters")}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("sidebar.filtersDescription")}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {SUPPORTED_SOURCES.map((source) => {
          const active = filters.sources.includes(source);
          return (
            <Button
              key={source}
              variant={active ? "default" : "ghost"}
              className="justify-start rounded-lg px-3 py-2 text-sm"
              type="button"
              onClick={() => toggleSource(source)}
            >
              {sourceLabels[source]}
            </Button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-gradient-to-r from-secondary/15 to-accent/15 px-3 py-2 text-sm text-foreground">
        <Star className="size-4 text-secondary" />
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.showStarredOnly}
            onChange={(event) => setShowStarred(event.target.checked)}
          />
          {t("sidebar.starredOnly")}
        </label>
      </div>
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("sidebar.search")}
        <input
          className="mt-1 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm shadow-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={t("sidebar.searchPlaceholder")}
          value={filters.query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("sidebar.project")}
        <select
          className="mt-1 w-full rounded-lg border border-input bg-background/80 px-3 py-2 text-sm shadow-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={filters.project ?? ""}
          onChange={(e) => setProject(e.target.value || undefined)}
        >
          <option value="">{t("sidebar.allProjects")}</option>
          {projectOptions.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <div className="space-y-2 rounded-xl border border-input bg-background/80 p-3 text-xs text-muted-foreground shadow-sm backdrop-blur">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="size-4 text-primary" />
          {t("sidebar.dateRange")}
        </div>
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span>{t("sidebar.startDate")}</span>
            <input
              type="date"
              value={filters.startDate ?? ""}
              onChange={(event) =>
                setDateRange(event.target.value || undefined, filters.endDate)
              }
              className="rounded-lg border border-input bg-background/80 px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>{t("sidebar.endDate")}</span>
            <input
              type="date"
              value={filters.endDate ?? ""}
              onChange={(event) =>
                setDateRange(filters.startDate, event.target.value || undefined)
              }
              className="rounded-lg border border-input bg-background/80 px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          {(filters.startDate || filters.endDate) && (
            <Button
              variant="ghost"
              type="button"
              className="self-start text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setDateRange(undefined, undefined)}
            >
              {t("sidebar.clearDates")}
            </Button>
          )}
        </div>
      </div>
      <div className="mt-auto text-xs text-muted-foreground">
        {t("sidebar.tip")}
      </div>
    </div>
  );
}
