"use client";
import * as React from "react";
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
  const [open, setOpen] = React.useState(true);
  const [tab, setTab] = React.useState<"stdout" | "stderr" | "diff" | null>(
    null,
  );

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

  const statusLabel =
    typeof exitCode === "number"
      ? exitCode === 0
        ? "success"
        : `exit ${exitCode}`
      : undefined;

  return (
    <div className="w-full overflow-hidden rounded-lg border bg-muted/50 text-foreground shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
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
        <Button
          variant="ghost"
          className="ml-auto h-6 px-2 text-xs"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Hide" : "Show"}
        </Button>
      </div>
      {open ? (
        <div className="space-y-3 px-4 py-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Arguments
            </p>
            {argsText ? (
              <pre className="whitespace-pre-wrap break-all font-mono text-xs">
                {argsText}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground">No arguments</p>
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
}) {
  const { tab, setTab, stdout, stderr, diff, diffFiles, fallback } = props;
  const available: Array<"stdout" | "stderr" | "diff"> = [];
  if (stdout) available.push("stdout");
  if (stderr) available.push("stderr");
  if (diff || (diffFiles && diffFiles.length > 0)) available.push("diff");

  const active = tab && available.includes(tab) ? tab : (available[0] ?? null);
  const [hunkIndex, setHunkIndex] = React.useState(0);
  const hunkRefs = React.useRef<Array<HTMLDivElement | null>>([]);
  React.useEffect(() => {
    hunkRefs.current = [];
  }, [diffFiles, diff]);

  const nextHunk = () => {
    const total = hunkRefs.current.length;
    if (total === 0) return;
    const next = (hunkIndex + 1) % total;
    setHunkIndex(next);
    const el = hunkRefs.current[next];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {available.map((k) => (
          <Button
            key={k}
            variant={active === k ? "default" : "outline"}
            className="h-6 px-2 text-xs"
            onClick={() => setTab(k)}
          >
            {k}
          </Button>
        ))}
        {active === "diff" && (diff || (diffFiles && diffFiles.length > 0)) ? (
          <Button
            type="button"
            variant="ghost"
            className="ml-auto h-6 px-2 text-xs"
            onClick={nextHunk}
          >
            Next Hunk
          </Button>
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
            <p className="text-xs text-muted-foreground">No output</p>
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
