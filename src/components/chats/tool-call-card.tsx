"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
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
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Result
            </p>
            {bodyText ? (
              <pre className="whitespace-pre-wrap break-all font-mono text-xs">
                {bodyText}
              </pre>
            ) : (
              <p className="text-xs text-muted-foreground">No output</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
