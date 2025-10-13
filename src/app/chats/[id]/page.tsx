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
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-background via-muted/40 to-background text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-10">
        <header className="mb-6 flex items-center justify-between rounded-2xl border border-border/60 bg-card/80 px-6 py-4 shadow-sm backdrop-blur">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">
              {session?.topic ?? "Conversation"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {session
                ? new Date(session.startedAt).toLocaleString()
                : "Full-page detail view"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" type="button">
              <Link href="/">Back to chats</Link>
            </Button>
          </div>
        </header>
        <section className="flex-1 overflow-hidden rounded-3xl border border-border/50 bg-card/80 shadow-lg backdrop-blur">
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
        </section>
      </main>
    </div>
  );
}
