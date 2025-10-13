"use client";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import type { DiffFile } from "@/lib/diff";
import type { ChatMessage } from "@/types/chat";

function formatJson(value: unknown): string | null {
  if (value == null) return null;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "[unserialisable]";
  }
}

export interface ToolCallCardProps {
  call: ChatMessage;
  result?: ChatMessage;
}

export function ToolCallCard({ call, result }: ToolCallCardProps) {
  const [open, setOpen] = React.useState(false);
  const [tab, setTab] = React.useState<"stdout" | "stderr" | "diff" | null>(
    null,
  );
  const { t } = useTranslation();

  const toolId = call.metadata?.toolCallId ?? call.metadata?.toolCall?.id;
  const toolName =
    call.metadata?.toolCall?.name ??
    call.metadata?.toolCall?.toolType ??
    "tool";
  const argsText =
    call.content ?? formatJson(call.metadata?.toolCall?.arguments) ?? "";

  const exitCode = result?.metadata?.toolResult?.exitCode;
  const durationMs = result?.metadata?.toolResult?.durationMs;
  const stdout =
    typeof result?.metadata?.toolResult?.stdout === "string"
      ? result?.metadata?.toolResult?.stdout
      : undefined;
  const stderr =
    typeof result?.metadata?.toolResult?.stderr === "string"
      ? result?.metadata?.toolResult?.stderr
      : undefined;
  const diff =
    typeof result?.metadata?.toolResult?.diff === "string"
      ? result?.metadata?.toolResult?.diff
      : undefined;
  const diffFiles = (result?.metadata?.toolResult?.diffFiles ?? undefined) as
    | DiffFile[]
    | undefined;
  const bodyText =
    result?.content ??
    stdout ??
    formatJson(result?.metadata?.toolResult?.output) ??
    undefined;

  const previewSource =
    bodyText ??
    stdout ??
    stderr ??
    diff ??
    (diffFiles && diffFiles.length > 0
      ? diffFiles
          .map((file) => file.newPath ?? file.oldPath ?? "")
          .filter((p): p is string => Boolean(p))
          .join(", ")
      : "");
  const previewFlat =
    typeof previewSource === "string"
      ? previewSource.replace(/\s+/g, " ").trim()
      : "";
  const collapsedPreview =
    previewFlat.length > 0
      ? `${previewFlat.slice(0, 160)}${previewFlat.length > 160 ? "…" : ""}`
      : null;

  const statusLabel =
    typeof exitCode === "number"
      ? exitCode === 0
        ? "success"
        : `exit ${exitCode}`
      : undefined;

  const hasDiff = Boolean(diff || (diffFiles && diffFiles.length > 0));

  return (
    <div
      className="w-full overflow-hidden rounded-xl border border-primary/15 bg-background/80 text-foreground shadow-sm backdrop-blur transition"
      data-has-diff={hasDiff ? "1" : undefined}
    >
      <div className="flex flex-wrap items-center gap-2 bg-gradient-to-r from-primary/10 via-background to-secondary/10 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
        <span>{toolName}</span>
        {toolId ? (
          <>
            <span>•</span>
            <span>{toolId}</span>
          </>
        ) : null}
        {typeof durationMs === "number" || statusLabel ? (
          <>
            <span>•</span>
            <span>
              {statusLabel}
              {typeof durationMs === "number"
                ? ` • ${Math.round(durationMs)} ms`
                : ""}
            </span>
          </>
        ) : null}
        {!open && collapsedPreview ? (
          <>
            <span>•</span>
            <span
              className="hidden max-w-[320px] truncate text-muted-foreground/80 md:inline"
              title={previewFlat}
            >
              {collapsedPreview}
            </span>
          </>
        ) : null}
        <Button
          variant="ghost"
          className="ml-auto h-6 px-2 text-xs"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={
            open ? t("detail.toggleCard.hide") : t("detail.toggleCard.show")
          }
          title={
            open ? t("detail.toggleCard.hide") : t("detail.toggleCard.show")
          }
        >
          {open ? "Hide" : "Show"}
        </Button>
      </div>
      {open ? (
        <div className="space-y-3 px-4 py-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("detail.arguments")}
            </p>
            {argsText ? (
              <pre className="whitespace-pre-wrap break-all font-mono text-xs">
                {argsText}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("detail.noOutput")}
              </p>
            )}
          </div>
          <ResultTabs
            tab={tab}
            setTab={setTab}
            stdout={stdout}
            stderr={stderr}
            diff={diff}
            diffFiles={diffFiles}
            fallback={bodyText}
            t={t}
          />
        </div>
      ) : null}
    </div>
  );
}

function ResultTabs(props: {
  tab: "stdout" | "stderr" | "diff" | null;
  setTab: (t: "stdout" | "stderr" | "diff") => void;
  stdout?: string;
  stderr?: string;
  diff?: string;
  diffFiles?: DiffFile[];
  fallback?: string;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) {
  const { tab, setTab, stdout, stderr, diff, diffFiles, fallback, t } = props;
  const available: Array<"stdout" | "stderr" | "diff"> = [];
  if (stdout) available.push("stdout");
  if (stderr) available.push("stderr");
  if (diff || (diffFiles && diffFiles.length > 0)) available.push("diff");

  const active = tab && available.includes(tab) ? tab : (available[0] ?? null);
  const [, setHunkIndex] = React.useState(0);
  const hunkRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  React.useEffect(() => {
    hunkRefs.current = [];
  }, [diffFiles, diff]);

  const nextHunk = React.useCallback(() => {
    const total = hunkRefs.current.length;
    if (total === 0) return;
    setHunkIndex((current) => {
      const next = (current + 1) % total;
      const el = hunkRefs.current[next];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return next;
    });
  }, []);
  const prevHunk = React.useCallback(() => {
    const total = hunkRefs.current.length;
    if (total === 0) return;
    setHunkIndex((current) => {
      const prev = (current - 1 + total) % total;
      const el = hunkRefs.current[prev];
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return prev;
    });
  }, []);

  React.useEffect(() => {
    if (active !== "diff") return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const editable = (e.target as HTMLElement | null)?.getAttribute?.(
        "contenteditable",
      );
      if (tag === "input" || tag === "textarea" || editable === "true") return;
      if (e.key === "n" || e.key === "N") {
        nextHunk();
      } else if (e.key === "p" || e.key === "P") {
        prevHunk();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [active, nextHunk, prevHunk]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {available.map((k) => (
          <Button
            key={k}
            variant={active === k ? "default" : "outline"}
            className="h-6 px-2 text-xs"
            onClick={() => setTab(k)}
            aria-pressed={active === k}
            aria-label={
              k === "stdout"
                ? t("detail.tabsAria.stdout")
                : k === "stderr"
                  ? t("detail.tabsAria.stderr")
                  : t("detail.tabsAria.diff")
            }
            title={
              k === "stdout"
                ? t("detail.tabs.stdout")
                : k === "stderr"
                  ? t("detail.tabs.stderr")
                  : t("detail.tabs.diff")
            }
          >
            {k === "stdout"
              ? t("detail.tabs.stdout")
              : k === "stderr"
                ? t("detail.tabs.stderr")
                : t("detail.tabs.diff")}
          </Button>
        ))}
        {active === "diff" && (diff || (diffFiles && diffFiles.length > 0)) ? (
          <div className="ml-auto flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={prevHunk}
              aria-label={t("detail.prevHunk")}
              title={t("detail.prevHunk")}
            >
              {t("detail.prevHunk")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-6 px-2 text-xs"
              onClick={nextHunk}
              aria-label={t("detail.nextHunk")}
              title={t("detail.nextHunk")}
            >
              {t("detail.nextHunk")}
            </Button>
          </div>
        ) : null}
      </div>
      <div>
        {active === "stdout" && stdout ? (
          <pre className="whitespace-pre-wrap break-all font-mono text-xs">
            {stdout}
          </pre>
        ) : null}
        {active === "stderr" && stderr ? (
          <pre className="whitespace-pre-wrap break-all font-mono text-xs">
            {stderr}
          </pre>
        ) : null}
        {active === "diff" ? (
          diffFiles && diffFiles.length > 0 ? (
            <div className="space-y-3">
              {diffFiles.map((f, fi) => (
                <div key={`f-${fi}`} className="rounded border bg-background">
                  <div className="border-b px-2 py-1 text-xs text-muted-foreground">
                    {(f.oldPath ?? "").toString()} →{" "}
                    {(f.newPath ?? "").toString()}
                  </div>
                  <div className="max-h-[28rem] overflow-auto p-2">
                    {f.hunks.map((h, hi) => (
                      <div
                        key={`h-${fi}-${hi}`}
                        ref={(el) => {
                          hunkRefs.current.push(el);
                        }}
                        className="mb-3"
                      >
                        <div className="mb-1 bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                          @@ -{h.oldStart}
                          {h.oldLines ? "," + h.oldLines : ""} +{h.newStart}
                          {h.newLines ? "," + h.newLines : ""} @@
                        </div>
                        <pre className="whitespace-pre-wrap break-all font-mono text-[11px] leading-snug">
                          {h.lines.map((ln, li) => (
                            <div
                              key={`l-${fi}-${hi}-${li}`}
                              className={
                                ln.type === "add"
                                  ? "bg-emerald-950/30 text-emerald-400"
                                  : ln.type === "del"
                                    ? "bg-rose-950/30 text-rose-400"
                                    : "text-foreground"
                              }
                            >
                              {(ln.type === "add"
                                ? "+"
                                : ln.type === "del"
                                  ? "-"
                                  : " ") + ln.text}
                            </div>
                          ))}
                        </pre>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : diff ? (
            <pre className="whitespace-pre-wrap break-all font-mono text-xs">
              {diff}
            </pre>
          ) : fallback ? (
            <pre className="whitespace-pre-wrap break-all font-mono text-xs">
              {fallback}
            </pre>
          ) : (
            <p className="text-xs text-muted-foreground">
              {t("detail.noOutput")}
            </p>
          )
        ) : null}
        {!active && fallback ? (
          <pre className="whitespace-pre-wrap break-all font-mono text-xs">
            {fallback}
          </pre>
        ) : null}
      </div>
    </div>
  );
}
