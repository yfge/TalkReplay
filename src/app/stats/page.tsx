"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePreferencesStore } from "@/store/preferences-store";
import { useChatStore } from "@/store/chat-store";
import type {
  LoadProjectsPayload,
  LoadProjectsResult,
  ProjectEntry,
} from "@/lib/session-loader/types";

export default function StatsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const providerPaths = usePreferencesStore((s) => s.providerPaths);
  const setProject = useChatStore((s) => s.setProject);
  const [query, setQuery] = useState("");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["projects", providerPaths],
    queryFn: async (): Promise<LoadProjectsResult> => {
      const payload: LoadProjectsPayload = {
        paths: providerPaths,
      };
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error(`Failed to load projects: ${res.status}`);
      }
      return (await res.json()) as LoadProjectsResult;
    },
  });

  const projects: ProjectEntry[] = data?.projects ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, query]);

  const totals = useMemo(() => {
    const totalProjects = projects.length;
    const totalSessions = projects.reduce((acc, p) => acc + p.count, 0);
    return { totalProjects, totalSessions };
  }, [projects]);

  const viewProject = (name: string) => {
    setProject(name);
    router.push("/");
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-background via-muted/40 to-background text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-10">
        <header className="mb-6 flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/80 px-6 py-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">
              {t("stats.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("stats.subtitle")}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="text-xs text-muted-foreground">
              {t("stats.totals", {
                projects: totals.totalProjects,
                sessions: totals.totalSessions,
              })}
            </div>
            <div className="flex items-center gap-2">
              <input
                className="w-64 rounded-lg border border-input bg-background/80 px-3 py-2 text-sm shadow-sm backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={t("stats.searchPlaceholder")}
                value={query}
                aria-label={t("stats.search")}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  void refetch();
                }}
              >
                {t("header.refresh")}
              </Button>
              <Button asChild variant="outline" type="button">
                <Link href="/">{t("stats.backToChats")}</Link>
              </Button>
            </div>
          </div>
        </header>

        <section className="flex-1 overflow-hidden rounded-3xl border border-border/50 bg-card/80 shadow-lg backdrop-blur">
          {isLoading ? (
            <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
              {t("stats.loading")}
            </div>
          ) : isError ? (
            <div className="flex h-60 flex-col items-center justify-center gap-2 text-sm text-destructive">
              <p>{t("stats.error")}</p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  void refetch();
                }}
              >
                {t("stats.retry")}
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-60 items-center justify-center text-sm text-muted-foreground">
              {t("stats.empty")}
            </div>
          ) : (
            <ScrollArea className="h-full">
              <ul className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p) => (
                  <li
                    key={p.name}
                    className="group flex flex-col justify-between rounded-xl border border-border/60 bg-background/80 p-4 shadow-sm backdrop-blur transition hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div>
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {p.name}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t("stats.sessions", { count: p.count })}
                      </p>
                    </div>
                    <div className="mt-3 flex items-center justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => viewProject(p.name)}
                      >
                        {t("stats.viewProject")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </section>
      </main>
    </div>
  );
}
