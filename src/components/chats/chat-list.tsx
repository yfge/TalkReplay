import { Clock, Star } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { providerBadgeClass } from "@/lib/provider-info";
import { useChatStore, useFilteredSessions } from "@/store/chat-store";
import type { ChatSession } from "@/types/chat";
import type { AgentSource } from "@/types/chat";

interface ChatListProps {
  onSelect?: (session: ChatSession) => void;
  onConfigureProviders?: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

function ProviderBadge({ source }: { source: AgentSource }) {
  const { t } = useTranslation();
  const label = t(`providers.${source}`);
  return <Badge className={providerBadgeClass[source]}>{label}</Badge>;
}

export function ChatList({
  onSelect,
  onConfigureProviders,
  onRefresh,
  isRefreshing = false,
}: ChatListProps) {
  const sessions = useFilteredSessions();
  const activeSessionId = useChatStore((state) => state.activeSessionId);
  const setActiveSession = useChatStore((state) => state.setActiveSession);
  const starred = useChatStore((state) => state.starred);
  const { t } = useTranslation();

  if (sessions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted-foreground">
        <Clock className="size-5" />
        <div>
          <p className="font-medium text-foreground">{t("chats.emptyTitle")}</p>
          <p className="text-xs text-muted-foreground">
            {t("chats.emptyDescription")}
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {onConfigureProviders ? (
            <Button
              type="button"
              variant="outline"
              onClick={onConfigureProviders}
            >
              {t("chats.configureButton")}
            </Button>
          ) : null}
          {onRefresh ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              {isRefreshing ? t("header.refreshing") : t("header.refresh")}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col divide-y">
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          return (
            <button
              key={session.id}
              className="flex flex-col items-start gap-2 p-4 text-left transition hover:bg-accent data-[state=active]:bg-accent"
              type="button"
              onClick={() => {
                setActiveSession(session.id);
                onSelect?.(session);
              }}
              data-state={isActive ? "active" : undefined}
            >
              <div className="flex items-center gap-2">
                <ProviderBadge source={session.source} />
                <span className="text-sm font-semibold text-foreground">
                  {session.topic || t("chats.untitled")}
                </span>
                {starred.has(session.id) ? (
                  <Star
                    className="size-4 fill-yellow-400 text-yellow-500"
                    aria-hidden
                  />
                ) : null}
              </div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                {formatTimestamp(session.startedAt)}
              </span>
              <span className="line-clamp-2 text-xs text-muted-foreground">
                {session.messages[0]?.content ?? t("chats.noPreview")}
              </span>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
