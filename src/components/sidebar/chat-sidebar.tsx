import { CalendarDays, Filter, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { useChatStore } from "@/store/chat-store";
import { SUPPORTED_SOURCES } from "@/types/chat";
import type { AgentSource } from "@/types/chat";

const sourceLabels: Record<AgentSource, string> = {
  claude: "Claude",
  codex: "Codex",
  gemini: "Gemini",
};

export function ChatSidebar() {
  const filters = useChatStore((state) => state.filters);
  const toggleSource = useChatStore((state) => state.toggleSource);
  const setQuery = useChatStore((state) => state.setQuery);
  const setShowStarred = useChatStore((state) => state.setShowStarred);
  const setDateRange = useChatStore((state) => state.setDateRange);
  const { t } = useTranslation();

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Filter className="size-4" />
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
              variant={active ? "default" : "outline"}
              className="justify-start"
              type="button"
              onClick={() => toggleSource(source)}
            >
              {sourceLabels[source]}
            </Button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
        <Star className="size-4" />
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
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder={t("sidebar.searchPlaceholder")}
          value={filters.query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="space-y-2 rounded-md border border-input bg-background px-3 py-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="size-4" />
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
              className="rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              className="rounded-md border border-input bg-background px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          {(filters.startDate || filters.endDate) && (
            <Button
              variant="ghost"
              type="button"
              className="self-start"
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
