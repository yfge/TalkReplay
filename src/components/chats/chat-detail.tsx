import { Download, FileUp, Info, Star, StarOff } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseFile } from "@/lib/parsers";
import { providerBadgeClass } from "@/lib/provider-info";
import { useChatStore, useIsStarred } from "@/store/chat-store";
import type { ChatSession, ChatSessionSummary } from "@/types/chat";

const roleStyles: Record<string, string> = {
  user: "bg-secondary text-secondary-foreground",
  assistant: "bg-primary text-primary-foreground",
  system: "bg-muted text-muted-foreground",
  tool: "bg-muted text-muted-foreground",
};

function formatJson(value: unknown): string | null {
  if (value === null || typeof value === "undefined") {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    console.error("Failed to serialise value", error);
    return "[unserialisable]";
  }
}

interface ChatDetailProps {
  session: ChatSession | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

export function ChatDetail({
  session,
  isLoading,
  error,
  onRetry,
}: ChatDetailProps) {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const appendSessionSummaries = useChatStore(
    (state) => state.appendSessionSummaries,
  );
  const setSessionDetail = useChatStore((state) => state.setSessionDetail);
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
      parsed.forEach((parsedSession) => {
        setSessionDetail(parsedSession);
      });

      const summaries: ChatSessionSummary[] = parsed.map((parsedSession) => ({
        id: parsedSession.id,
        source: parsedSession.source,
        topic: parsedSession.topic,
        startedAt: parsedSession.startedAt,
        participants: parsedSession.participants,
        metadata: parsedSession.metadata,
        preview:
          parsedSession.messages.find(
            (message) => message.kind === "content" && message.content,
          )?.content ??
          parsedSession.metadata?.summary ??
          parsedSession.topic,
        messageCount: parsedSession.messages.length,
      }));

      appendSessionSummaries(summaries);
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
      <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-sm text-muted-foreground">
        {isLoading ? (
          <>
            <Info className="size-5 animate-pulse" />
            <p>{"Loading conversation..."}</p>
          </>
        ) : error ? (
          <>
            <Info className="size-5 text-destructive" />
            <p className="text-destructive">{error}</p>
            {onRetry ? (
              <Button type="button" variant="outline" onClick={onRetry}>
                {"Retry"}
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <Info className="size-5" />
            <p>{"Select a conversation to view its messages."}</p>
          </>
        )}
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
            const toolCallId =
              message.metadata?.toolCallId ?? message.metadata?.toolCall?.id;
            const toolCallArgs = message.metadata?.toolCall?.arguments;
            const toolResultOutput = message.metadata?.toolResult?.output;
            const reasoningSummary = message.metadata?.reasoning?.summary;

            const resolvedContent =
              message.kind === "tool-call"
                ? (message.content ?? formatJson(toolCallArgs))
                : message.kind === "tool-result"
                  ? (message.content ?? formatJson(toolResultOutput))
                  : message.kind === "reasoning"
                    ? (message.content ?? reasoningSummary ?? null)
                    : message.kind === "system"
                      ? (message.content ?? null)
                      : (message.content ?? "");

            const copyPayload = resolvedContent ?? "";

            const metadataLine = [
              message.kind !== "content"
                ? message.kind.replaceAll("-", " ")
                : null,
              tokenInfo?.total
                ? `${t("detail.metadata.tokens")}: ${tokenInfo.total}`
                : null,
              toolCallId
                ? `${t("detail.metadata.toolCall")}: ${toolCallId}`
                : null,
            ].filter(Boolean);

            const messageKey = `${session.id}:${message.id ?? "message"}:${index}`;

            const isCopied = copiedMessageId === messageKey;

            const renderBody = () => {
              switch (message.kind) {
                case "tool-call": {
                  const label =
                    message.metadata?.toolCall?.name ??
                    toolCallId ??
                    t("detail.unknown");
                  return (
                    <div className="space-y-2 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("detail.toolCall")}: {label}
                      </p>
                      {toolCallArgs ? (
                        <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                          {formatJson(toolCallArgs)}
                        </pre>
                      ) : null}
                      {message.content && !toolCallArgs ? (
                        <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                          {message.content}
                        </pre>
                      ) : null}
                    </div>
                  );
                }
                case "tool-result": {
                  return (
                    <div className="space-y-2 text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("detail.toolResult")}:{" "}
                        {toolCallId ?? t("detail.unknown")}
                      </p>
                      {resolvedContent ? (
                        <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                          {resolvedContent}
                        </pre>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {t("detail.noToolOutput")}
                        </p>
                      )}
                    </div>
                  );
                }
                case "reasoning": {
                  return (
                    <div className="text-sm">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t("detail.reasoning")}
                      </p>
                      <p className="whitespace-pre-wrap break-words">
                        {resolvedContent ?? t("detail.reasoningRedacted")}
                      </p>
                    </div>
                  );
                }
                case "system": {
                  return resolvedContent ? (
                    <pre className="whitespace-pre-wrap break-words font-mono text-xs">
                      {resolvedContent}
                    </pre>
                  ) : null;
                }
                default: {
                  return resolvedContent ? (
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm">
                      {resolvedContent}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {t("detail.emptyMessage")}
                    </p>
                  );
                }
              }
            };

            return (
              <li key={messageKey} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                  <span>{message.role}</span>
                  {message.kind !== "content" ? (
                    <>
                      <span>•</span>
                      <span>{message.kind.replaceAll("-", " ")}</span>
                    </>
                  ) : null}
                  <span>•</span>
                  <time dateTime={message.timestamp}>
                    {new Date(message.timestamp).toLocaleString()}
                  </time>
                  <Button
                    variant="ghost"
                    className="ml-auto h-6 px-2 text-xs"
                    disabled={!copyPayload}
                    onClick={() => {
                      if (!copyPayload) {
                        return;
                      }
                      void copyMessage(copyPayload, messageKey);
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
                  className={`rounded-lg px-4 py-3 leading-relaxed shadow-sm ${roleStyles[message.role] ?? "bg-muted text-foreground"}`}
                >
                  {renderBody()}
                </div>
              </li>
            );
          })}
        </ol>
      </ScrollArea>
    </div>
  );
}
