import { Download, FileUp, Info, Star, StarOff } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseFile } from "@/lib/parsers";
import { providerBadgeClass } from "@/lib/provider-info";
import { useChatStore, useIsStarred } from "@/store/chat-store";
import type { ChatSession } from "@/types/chat";

const roleStyles: Record<string, string> = {
  user: "bg-secondary text-secondary-foreground",
  assistant: "bg-primary text-primary-foreground",
  system: "bg-muted text-muted-foreground",
  tool: "bg-muted text-muted-foreground",
};

interface ChatDetailProps {
  session: ChatSession | null;
}

export function ChatDetail({ session }: ChatDetailProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const sessions = useChatStore((state) => state.sessions);
  const setSessions = useChatStore((state) => state.setSessions);
  const toggleStarred = useChatStore((state) => state.toggleStarred);
  const { t } = useTranslation();
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const isStarred = useIsStarred(session?.id ?? "");

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    try {
      const source = file.name.toLowerCase().includes("claude")
        ? "claude"
        : "codex";
      const parsed = await parseFile(file, source);
      setSessions([...parsed, ...sessions]);
    } catch (error) {
      console.error(error);
      window.alert(
        error instanceof Error
          ? `Failed to import: ${error.message}`
          : "Failed to import transcript.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const copyMessage = React.useCallback(async (message: string, id: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(message);
        setCopiedMessageId(id);
        setTimeout(
          () =>
            setCopiedMessageId((current) => (current === id ? null : current)),
          2000,
        );
      }
    } catch (error) {
      console.error("Copy failed", error);
    }
  }, []);

  const metadataSummary = useMemo(() => {
    if (!session) {
      return null;
    }
    const providerLabel = t(`providers.${session.source}`);
    const model = session.metadata?.provider?.model ?? "-";
    return (
      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Badge className={providerBadgeClass[session.source]}>
            {providerLabel}
          </Badge>
          <span>{t("detail.source")}</span>
        </div>
        <div>
          <span className="font-medium text-foreground">
            {t("detail.model")}:
          </span>{" "}
          {model}
        </div>
        {session.metadata?.summary ? (
          <div>
            <span className="font-medium text-foreground">
              {t("detail.sessionInfo")}:
            </span>{" "}
            {session.metadata.summary}
          </div>
        ) : null}
      </div>
    );
  }, [session, t]);

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <Info className="size-5" />
        <p>{"Select a conversation to view its messages."}</p>
        <Button
          type="button"
          variant="default"
          onClick={() => fileInputRef.current?.click()}
          className="mt-2"
        >
          <FileUp className="mr-2 size-4" /> Import Transcript
        </Button>
        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept=".json,.txt,.md"
          onChange={(event) => {
            void handleImport(event);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-background/80 px-6 py-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{session.topic}</h2>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {new Date(session.startedAt).toLocaleString()}
          </p>
          {metadataSummary}
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={isStarred ? "default" : "ghost"}
            onClick={() => toggleStarred(session.id)}
            aria-label={isStarred ? t("detail.unstar") : t("detail.star")}
            className="px-2"
          >
            {isStarred ? (
              <Star className="size-4" />
            ) : (
              <StarOff className="size-4" />
            )}
          </Button>
          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept=".json,.txt,.md"
            onChange={(event) => {
              void handleImport(event);
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileUp className="mr-2 size-4" /> Import Transcript
          </Button>
          <Button type="button" variant="ghost">
            <Download className="mr-2 size-4" /> Export (soon)
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 bg-background px-6 py-4">
        <ol className="space-y-4">
          {session.messages.map((message, index) => {
            const tokenInfo = message.metadata?.tokens;
            const toolCall = message.metadata?.toolCallId;
            const metadataLine = [
              tokenInfo?.total
                ? `${t("detail.metadata.tokens")}: ${tokenInfo.total}`
                : null,
              toolCall ? `${t("detail.metadata.toolCall")}: ${toolCall}` : null,
            ].filter(Boolean);

            const messageKey = `${session.id}:${message.id ?? index}`;

            const isCopied = copiedMessageId === messageKey;

            return (
              <li key={messageKey} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <span>{message.role}</span>
                  <span>•</span>
                  <time dateTime={message.timestamp}>
                    {new Date(message.timestamp).toLocaleString()}
                  </time>
                  <Button
                    variant="ghost"
                    className="ml-auto h-6 px-2 text-xs"
                    onClick={() => {
                      void copyMessage(message.content, messageKey);
                    }}
                  >
                    {isCopied ? t("detail.copied") : t("detail.copy")}
                  </Button>
                </div>
                {metadataLine.length > 0 ? (
                  <div className="text-xs text-muted-foreground">
                    {metadataLine.join(" • ")}
                  </div>
                ) : null}
                <div
                  className={`rounded-lg px-4 py-3 text-sm leading-relaxed shadow-sm ${roleStyles[message.role] ?? "bg-muted text-foreground"}`}
                >
                  <pre className="whitespace-pre-wrap break-words font-sans text-sm">
                    {message.content}
                  </pre>
                </div>
              </li>
            );
          })}
        </ol>
      </ScrollArea>
    </div>
  );
}
