"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ChatDetail } from "@/components/chats/chat-detail";
import { Button } from "@/components/ui/button";
import { fetchSessionDetail } from "@/lib/session-loader/client";
import { usePreferencesStore } from "@/store/preferences-store";
import type { ChatSession } from "@/types/chat";

export default function ChatDetailPage() {
  const pathname = usePathname();
  const id = useMemo(() => {
    const parts = (pathname ?? "").split("/");
    return parts[parts.length - 1] ?? "";
  }, [pathname]);
  const providerPaths = usePreferencesStore((state) => state.providerPaths);

  const [session, setSession] = useState<ChatSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    setIsLoading(true);
    setError(null);
    fetchSessionDetail({ id, paths: providerPaths })
      .then((detail) => {
        if (!cancelled) setSession(detail);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load session");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, providerPaths]);

  return (
    <div className="flex h-screen min-h-[600px] w-full flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Conversation</h1>
          <p className="text-sm text-muted-foreground">Full-page detail view</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" type="button">
            <Link href="/">Back to chats</Link>
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        <ChatDetail
          session={session}
          isLoading={isLoading}
          error={error}
          onRetry={() => {
            if (!id) return;
            setIsLoading(true);
            setError(null);
            fetchSessionDetail({ id, paths: providerPaths })
              .then((detail) => setSession(detail))
              .catch((e: unknown) =>
                setError(
                  e instanceof Error ? e.message : "Failed to load session",
                ),
              )
              .finally(() => setIsLoading(false));
          }}
        />
      </main>
    </div>
  );
}
