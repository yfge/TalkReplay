import { Download, FileUp, Info } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { parseFile } from "@/lib/parsers";
import { useChatStore } from "@/store/chat-store";
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

  const importTranscript = React.useCallback(
    async (file: File) => {
      const source = file.name.toLowerCase().includes("claude")
        ? "claude"
        : "codex";
      const parsed = await parseFile(file, source);
      setSessions([...parsed, ...sessions]);
    },
    [sessions, setSessions],
  );

  const handleFileChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      void importTranscript(file).catch((error) => {
        console.error(error);
        window.alert(
          error instanceof Error
            ? `Failed to import: ${error.message}`
            : "Failed to import transcript.",
        );
      });
      event.target.value = "";
    },
    [importTranscript],
  );

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
        <Info className="size-5" />
        <p>Select a conversation to view its messages.</p>
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
          onChange={handleFileChange}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-background/80 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">{session.topic}</h2>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {session.source} • {new Date(session.startedAt).toLocaleString()} •{" "}
            {session.participants.join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            className="hidden"
            type="file"
            accept=".json,.txt,.md"
            onChange={handleFileChange}
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
          {session.messages.map((message) => (
            <li key={message.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                <span>{message.role}</span>
                <span>•</span>
                <time dateTime={message.timestamp}>
                  {new Date(message.timestamp).toLocaleString()}
                </time>
              </div>
              <div
                className={`rounded-lg px-4 py-3 text-sm leading-relaxed shadow-sm ${roleStyles[message.role] ?? "bg-muted text-foreground"}`}
              >
                <pre className="whitespace-pre-wrap break-words font-sans text-sm">
                  {message.content}
                </pre>
              </div>
            </li>
          ))}
        </ol>
      </ScrollArea>
    </div>
  );
}
