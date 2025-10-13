import {
  Bot,
  Download,
  FileText,
  FileUp,
  Filter,
  Info,
  Share2,
  Shield,
  Star,
  StarOff,
  User,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";

import { ToolCallCard } from "@/components/chats/tool-call-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseFile } from "@/lib/parsers";
import { providerBadgeClass } from "@/lib/provider-info";
import {
  sessionToFilename,
  sessionToJson,
  sessionToMarkdown,
} from "@/lib/share/session-export";
import { useChatStore, useIsStarred } from "@/store/chat-store";
import type {
  ChatMessage,
  ChatSession,
  ChatSessionSummary,
} from "@/types/chat";

const roleStyles: Record<string, string> = {
  user: "bg-sky-500/10 dark:bg-sky-500/20 border border-sky-500/40 text-sky-950 dark:text-sky-50 shadow-sm ring-1 ring-sky-500/30",
  assistant:
    "bg-primary/10 border border-primary/30 text-foreground shadow-sm ring-1 ring-primary/25",
  system:
    "bg-muted/60 border border-muted-foreground/30 text-muted-foreground shadow-sm ring-1 ring-muted-foreground/20",
  tool: "bg-muted/80 border border-muted-foreground/20 text-muted-foreground shadow-sm ring-1 ring-muted-foreground/20",
};

const mdComponents = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="my-3 text-2xl font-semibold" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="my-3 text-xl font-semibold" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="my-3 text-lg font-semibold" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="my-2 whitespace-pre-wrap break-all" {...props} />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      className="my-3 max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs"
      {...props}
    />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code className="whitespace-pre-wrap break-all font-mono" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="my-2 list-disc space-y-1 pl-6" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="my-2 list-decimal space-y-1 pl-6" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="break-all" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className="break-all underline" {...props} />
  ),
  img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="my-2 max-h-[28rem] max-w-full rounded border object-contain"
      loading="lazy"
      {...props}
    />
  ),
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

type MessageFilterKey = "human" | "assistant" | "tool" | "system";

const ALL_MESSAGE_FILTERS: MessageFilterKey[] = [
  "human",
  "assistant",
  "tool",
  "system",
];

const TOOL_LIKE_PROVIDER_TYPES = new Set([
  "command_execution",
  "file_change",
  "mcp_tool_call",
  "web_search",
  "tool_use",
]);

const MESSAGE_FILTER_CONFIG: Array<{
  key: MessageFilterKey;
  icon: LucideIcon;
  labelKey: string;
}> = [
  { key: "human", icon: User, labelKey: "detail.messageFilters.human" },
  { key: "assistant", icon: Bot, labelKey: "detail.messageFilters.assistant" },
  { key: "tool", icon: Wrench, labelKey: "detail.messageFilters.tool" },
  { key: "system", icon: Shield, labelKey: "detail.messageFilters.system" },
];

function resolveMessageFilterKey(message: ChatMessage): MessageFilterKey {
  if (message.role === "user") {
    return "human";
  }
  if (message.role === "system") {
    return "system";
  }
  if (message.role === "tool") {
    return "tool";
  }
  if (message.kind === "tool-call" || message.kind === "tool-result") {
    return "tool";
  }
  const providerType = message.metadata?.providerMessageType;
  if (typeof providerType === "string") {
    const normalised = providerType.toLowerCase();
    if (TOOL_LIKE_PROVIDER_TYPES.has(normalised)) {
      return "tool";
    }
  }
  return "assistant";
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
  const [shareStatus, setShareStatus] = useState<"markdown" | null>(null);
  const [activeMessageFilters, setActiveMessageFilters] =
    useState<MessageFilterKey[]>(ALL_MESSAGE_FILTERS);
  const activeFilterSet = useMemo(
    () => new Set<MessageFilterKey>(activeMessageFilters),
    [activeMessageFilters],
  );
  const [collapsedMessages, setCollapsedMessages] = useState<
    Record<string, boolean>
  >({});
  React.useEffect(() => {
    setCollapsedMessages({});
  }, [session?.id]);
  const isStarred = useIsStarred(session?.id ?? "");
  const toggleMessageFilter = React.useCallback((key: MessageFilterKey) => {
    setActiveMessageFilters((current) => {
      const has = current.includes(key);
      if (has) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((item) => item !== key);
      }
      return [...current, key];
    });
  }, []);
  const nextDiffCard = React.useCallback(() => {
    const cards = Array.from(
      document.querySelectorAll<HTMLElement>('[data-has-diff="1"]'),
    );
    if (cards.length === 0) return;
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    const next = cards.find(
      (el) => el.getBoundingClientRect().top + y > y + 10,
    );
    const target = next ?? cards[0];
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

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
    const project = session.metadata?.project;
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-muted-foreground/20 bg-muted/40 p-3 text-sm text-muted-foreground shadow-sm">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground/80">
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
        {project ? (
          <div>
            <span className="font-medium text-foreground">
              {t("detail.project", { defaultValue: "Project" })}:
            </span>{" "}
            {project}
          </div>
        ) : null}
        {session.metadata?.summary ? (
          <details className="mt-1">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("detail.sessionInfo")}
            </summary>
            <div className="mt-2 text-sm">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={mdComponents as never}
              >
                {session.metadata.summary ?? ""}
              </ReactMarkdown>
            </div>
          </details>
        ) : null}
      </div>
    );
  }, [session, t]);

  const copyMarkdown = React.useCallback(async () => {
    if (!session) {
      return;
    }
    try {
      const markdown = sessionToMarkdown(session);
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(markdown);
        setShareStatus("markdown");
        setTimeout(() => setShareStatus(null), 2000);
      } else {
        const blob = new Blob([markdown], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = sessionToFilename(session, "md");
        link.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Failed to copy markdown", error);
    }
  }, [session]);

  const downloadFile = React.useCallback(
    (content: string, mime: string, extension: string) => {
      if (!session) {
        return;
      }
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = sessionToFilename(session, extension);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [session],
  );

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
      <div className="border-b bg-background/80 px-6 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{session.topic}</h2>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {new Date(session.startedAt).toLocaleString()}
            </p>
            {metadataSummary}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
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
            <Button
              type="button"
              variant={shareStatus === "markdown" ? "default" : "ghost"}
              onClick={() => {
                void copyMarkdown();
              }}
              className="flex items-center gap-2"
            >
              <Share2 className="size-4" />
              {shareStatus === "markdown"
                ? t("detail.shareCopied")
                : t("detail.copyMarkdown")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                downloadFile(sessionToMarkdown(session), "text/markdown", "md")
              }
            >
              <FileText className="mr-2 size-4" />
              {t("detail.downloadMarkdown")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                downloadFile(sessionToJson(session), "application/json", "json")
              }
            >
              <Download className="mr-2 size-4" />
              {t("detail.downloadJson")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={nextDiffCard}
              title={t("detail.jump.nextDiffCard")}
              aria-label={t("detail.jump.nextDiffCard")}
            >
              <span className="mr-2">⤵︎</span>
              {t("detail.jump.nextDiffCard")}
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Filter className="size-3" />
            {t("detail.messageFilters.label")}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {MESSAGE_FILTER_CONFIG.map(({ key, icon: Icon, labelKey }) => {
              const isActive = activeFilterSet.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleMessageFilter(key)}
                  aria-pressed={isActive}
                  className={`flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    isActive
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" />
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <ScrollArea className="flex-1 overflow-x-hidden bg-background p-6">
        <ol className="max-w-full space-y-5 overflow-x-hidden">
          {(() => {
            // Pre-group tool-call with matching tool-result by toolCallId
            const resultByCallId = new Map<string, number>();
            session.messages.forEach((m, i) => {
              const callId = m.metadata?.toolResult?.callId;
              if (m.kind === "tool-result" && typeof callId === "string") {
                resultByCallId.set(callId, i);
              }
            });
            const usedResult = new Set<number>();
            const items: Array<
              | {
                  type: "group";
                  call: (typeof session.messages)[number];
                  result?: (typeof session.messages)[number];
                }
              | { type: "single"; message: (typeof session.messages)[number] }
            > = [];
            for (let i = 0; i < session.messages.length; i++) {
              const m = session.messages[i];
              if (m.kind === "tool-call") {
                const id = m.metadata?.toolCallId ?? m.metadata?.toolCall?.id;
                if (typeof id === "string") {
                  const resultIdx = resultByCallId.get(id);
                  if (
                    typeof resultIdx === "number" &&
                    resultIdx > i &&
                    !usedResult.has(resultIdx)
                  ) {
                    items.push({
                      type: "group",
                      call: m,
                      result: session.messages[resultIdx],
                    });
                    usedResult.add(resultIdx);
                    continue;
                  }
                }
                items.push({ type: "group", call: m });
                continue;
              }
              if (m.kind === "tool-result") {
                // skip if already grouped
                if (usedResult.has(i)) continue;
              }
              items.push({ type: "single", message: m });
            }

            const filteredItems = items.filter((item) => {
              if (item.type === "group") {
                return activeFilterSet.has("tool");
              }
              return activeFilterSet.has(resolveMessageFilterKey(item.message));
            });

            return filteredItems.map((item, index) => {
              if (item.type === "group") {
                const call = item.call;
                const result = item.result;
                const messageKey = `${session.id}:${call.id ?? "tool-call"}:${index}`;
                return (
                  <li
                    key={messageKey}
                    className="flex w-full max-w-full flex-col gap-2 overflow-hidden"
                  >
                    <ToolCallCard call={call} result={result} />
                  </li>
                );
              }

              const message = item.message;
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

              let copyPayload = resolvedContent ?? "";

              // Extract image URIs from attachments and common tool payload shapes
              const extractImageUris = (): string[] => {
                const results: string[] = [];
                const atts = message.metadata?.attachments ?? [];
                for (const att of atts) {
                  if (att?.type === "image" && typeof att.uri === "string") {
                    results.push(att.uri);
                  }
                }

                const candidates: unknown[] = [];
                if (typeof message.content === "string")
                  candidates.push(message.content);
                if (typeof toolResultOutput !== "undefined")
                  candidates.push(toolResultOutput);

                const pushIfImageLike = (obj: unknown) => {
                  if (!obj || typeof obj !== "object") return;
                  const anyObj = obj as Record<string, unknown>;
                  const type =
                    typeof anyObj.type === "string" ? anyObj.type : undefined;
                  const url =
                    typeof anyObj.image_url === "string"
                      ? anyObj.image_url
                      : typeof anyObj.url === "string"
                        ? anyObj.url
                        : typeof anyObj.uri === "string"
                          ? anyObj.uri
                          : typeof anyObj.path === "string"
                            ? anyObj.path
                            : undefined;
                  const isImageFlag =
                    anyObj.isImage === true ||
                    type === "image" ||
                    type === "input_image";
                  if (
                    url &&
                    (isImageFlag ||
                      /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url) ||
                      url.startsWith("data:image/"))
                  ) {
                    results.push(url);
                  }
                  const stdout =
                    typeof anyObj.stdout === "string"
                      ? anyObj.stdout
                      : undefined;
                  if (
                    stdout &&
                    (stdout.startsWith("data:image/") ||
                      /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(stdout))
                  ) {
                    results.push(stdout);
                  }
                };

                const tryParseJson = (text: string): unknown => {
                  try {
                    return JSON.parse(text) as unknown;
                  } catch {
                    return null;
                  }
                };

                for (const cand of candidates) {
                  if (typeof cand === "string") {
                    const trimmed = cand.trim();
                    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
                      const parsed = tryParseJson(trimmed);
                      if (Array.isArray(parsed)) {
                        for (const it of parsed) pushIfImageLike(it);
                      } else if (parsed && typeof parsed === "object") {
                        pushIfImageLike(parsed);
                        const anyParsed = parsed as Record<string, unknown>;
                        const maybeArrs = [anyParsed.content, anyParsed.data];
                        for (const arr of maybeArrs) {
                          if (Array.isArray(arr)) {
                            for (const it of arr) pushIfImageLike(it);
                          }
                        }
                      } else if (/^data:image\//.test(trimmed)) {
                        results.push(trimmed);
                      }
                    } else if (
                      /^https?:\/\//i.test(trimmed) ||
                      trimmed.startsWith("data:image/")
                    ) {
                      results.push(trimmed);
                    }
                  } else if (cand && typeof cand === "object") {
                    pushIfImageLike(cand);
                  }
                }

                return Array.from(new Set(results));
              };

              const imageUris = extractImageUris();
              if (imageUris.length > 0) {
                copyPayload = imageUris.join("\n");
              }

              const category = resolveMessageFilterKey(message);
              const shouldOfferCollapseToggle =
                category === "tool" && copyPayload.length > 0;

              const toFileServerUrl = (raw: string): string => {
                if (/^https?:\/\//i.test(raw) || raw.startsWith("data:"))
                  return raw;
                try {
                  const enc = (str: string) => {
                    const utf8 = encodeURIComponent(str).replace(
                      /%([0-9A-F]{2})/g,
                      (_: string, h: string) =>
                        String.fromCharCode(Number.parseInt(h, 16)),
                    );
                    const b64 = btoa(utf8)
                      .replace(/\+/g, "-")
                      .replace(/\//g, "_")
                      .replace(/=+$/g, "");
                    return b64;
                  };
                  return `/api/file?p=${enc(raw)}`;
                } catch {
                  return `/api/file?p=${raw}`;
                }
              };

              const exitCode = message.metadata?.toolResult?.exitCode;
              const durationMs = message.metadata?.toolResult?.durationMs;
              const statusLabel =
                message.kind === "tool-result" && typeof exitCode === "number"
                  ? exitCode === 0
                    ? "success"
                    : `exit ${exitCode}`
                  : null;

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
                statusLabel,
                typeof durationMs === "number"
                  ? `${Math.round(durationMs)} ms`
                  : null,
              ].filter(Boolean);

              const messageKey = `${session.id}:${message.id ?? "message"}:${index}`;
              const shouldDefaultCollapse =
                shouldOfferCollapseToggle && Boolean(copyPayload);
              const isCollapsed =
                collapsedMessages[messageKey] ?? shouldDefaultCollapse;
              const handleToggleCollapse = () => {
                setCollapsedMessages((prev) => {
                  const current = prev[messageKey];
                  const nextValue =
                    typeof current === "boolean"
                      ? !current
                      : !shouldDefaultCollapse;
                  if (nextValue === shouldDefaultCollapse) {
                    const next = { ...prev };
                    delete next[messageKey];
                    return next;
                  }
                  return { ...prev, [messageKey]: nextValue };
                });
              };
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
                        {imageUris.length > 0 ? (
                          <div className="flex flex-wrap gap-3">
                            {imageUris.map((u, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={`${messageKey}:img-call:${i}`}
                                src={toFileServerUrl(u)}
                                alt={label}
                                className="max-h-[28rem] max-w-full rounded border object-contain"
                                loading="lazy"
                              />
                            ))}
                          </div>
                        ) : null}
                        {toolCallArgs ? (
                          <pre className="whitespace-pre-wrap break-all font-mono text-xs">
                            {formatJson(toolCallArgs)}
                          </pre>
                        ) : null}
                        {message.content &&
                        !toolCallArgs &&
                        imageUris.length === 0 ? (
                          <pre className="whitespace-pre-wrap break-all font-mono text-xs">
                            {message.content}
                          </pre>
                        ) : null}
                      </div>
                    );
                  }
                  case "content": {
                    if (imageUris.length > 0) {
                      return (
                        <div className="flex flex-wrap gap-3">
                          {imageUris.map((u, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={`${messageKey}:img-content:${i}`}
                              src={toFileServerUrl(u)}
                              alt={message.role}
                              className="max-h-[28rem] max-w-full rounded border object-contain"
                              loading="lazy"
                            />
                          ))}
                        </div>
                      );
                    }
                    return resolvedContent ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={mdComponents as never}
                      >
                        {resolvedContent}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {t("detail.emptyMessage")}
                      </p>
                    );
                  }
                  case "tool-result": {
                    return (
                      <div className="space-y-2 text-sm">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {t("detail.toolResult")}:{" "}
                          {toolCallId ?? t("detail.unknown")}
                        </p>
                        {imageUris.length > 0 ? (
                          <div className="flex flex-wrap gap-3">
                            {imageUris.map((u, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                key={`${messageKey}:img:${i}`}
                                src={toFileServerUrl(u)}
                                alt={
                                  message.metadata?.toolResult?.callId ??
                                  "image"
                                }
                                className="max-h-[28rem] max-w-full rounded border object-contain"
                                loading="lazy"
                              />
                            ))}
                          </div>
                        ) : resolvedContent ? (
                          <pre className="whitespace-pre-wrap break-all font-mono text-xs">
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
                        <p className="whitespace-pre-wrap break-all">
                          {resolvedContent ?? t("detail.reasoningRedacted")}
                        </p>
                      </div>
                    );
                  }
                  case "system": {
                    return resolvedContent ? (
                      <pre className="whitespace-pre-wrap break-all font-mono text-xs">
                        {resolvedContent}
                      </pre>
                    ) : null;
                  }
                  default: {
                    return resolvedContent ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={mdComponents as never}
                      >
                        {resolvedContent}
                      </ReactMarkdown>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {t("detail.emptyMessage")}
                      </p>
                    );
                  }
                }
              };

              const previewSource =
                imageUris.length > 0
                  ? imageUris.join(", ")
                  : typeof resolvedContent === "string"
                    ? resolvedContent
                    : "";
              const previewFlat = previewSource.replace(/\s+/g, " ").trim();
              const collapsedPreview =
                previewFlat.length > 0
                  ? `${previewFlat.slice(0, 200)}${
                      previewFlat.length > 200 ? "…" : ""
                    }`
                  : t("detail.noOutput");
              const headerTone =
                category === "human"
                  ? "text-sky-600 dark:text-sky-300"
                  : category === "assistant"
                    ? "text-primary"
                    : "text-muted-foreground";
              const metadataText = metadataLine.join(" • ");

              return (
                <li
                  key={messageKey}
                  data-category={category}
                  className="flex w-full max-w-full flex-col gap-3 overflow-hidden rounded-lg"
                >
                  <div
                    className={`flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide ${headerTone}`}
                  >
                    <span className="font-semibold">{message.role}</span>
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
                    <div className="ml-auto flex items-center gap-1">
                      {shouldOfferCollapseToggle ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="h-6 px-2 text-xs"
                          onClick={handleToggleCollapse}
                        >
                          {isCollapsed
                            ? t("detail.toggleMessage.show")
                            : t("detail.toggleMessage.hide")}
                        </Button>
                      ) : null}
                      <Button
                        variant="ghost"
                        className="h-6 px-2 text-xs"
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
                  </div>
                  {metadataText ? (
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground/80">
                      {metadataText}
                    </div>
                  ) : null}
                  <div
                    className={`relative w-full max-w-full overflow-hidden break-words rounded-xl px-4 py-3 leading-relaxed transition ${
                      roleStyles[message.role] ??
                      "border border-muted bg-muted text-foreground"
                    } ${isCollapsed ? "opacity-90" : ""}`}
                  >
                    {isCollapsed ? (
                      <p className="text-sm text-muted-foreground">
                        {collapsedPreview}
                      </p>
                    ) : (
                      renderBody()
                    )}
                  </div>
                </li>
              );
            });
          })()}
        </ol>
      </ScrollArea>
    </div>
  );
}
