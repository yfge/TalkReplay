import Image from "next/image";
import type * as React from "react";
import { useTranslation } from "react-i18next";

import { LocaleToggle } from "@/components/theme/locale-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  onConfigureProviders: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AppShell({
  sidebar,
  children,
  onConfigureProviders,
  onRefresh,
  isRefreshing = false,
}: AppShellProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-screen min-h-[600px] w-full flex-col bg-background text-foreground">
      <header className="relative overflow-hidden border-b bg-gradient-to-r from-primary/10 via-background to-secondary/10 px-6 py-4">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 -top-16 size-48 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute -bottom-24 -right-16 size-56 rounded-full bg-secondary/30 blur-3xl" />
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-background/80 shadow-sm ring-1 ring-primary/30 backdrop-blur">
              <Image
                src="/brand/icon-gradient.svg"
                alt="TalkReplay icon"
                width={36}
                height={36}
                priority
              />
            </div>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-semibold text-foreground sm:text-2xl sm:font-bold sm:tracking-tight">
                <span className="sm:bg-gradient-to-r sm:from-[hsl(var(--primary))] sm:to-[hsl(var(--secondary))] sm:bg-clip-text sm:text-transparent">
                  {t("header.title")}
                </span>
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("header.subtitle")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh ? (
              <Button
                variant="secondary"
                type="button"
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                {isRefreshing ? t("header.refreshing") : t("header.refresh")}
              </Button>
            ) : null}
            <Button
              variant="outline"
              type="button"
              onClick={onConfigureProviders}
            >
              {t("header.configureProviders")}
            </Button>
            <LocaleToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main
        className={cn(
          "flex flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))]",
          "from-muted/40 via-background to-background",
        )}
      >
        <aside className="hidden w-72 border-r bg-background/80 p-4 backdrop-blur lg:flex lg:flex-col">
          {sidebar}
        </aside>
        <div className="flex-1 overflow-hidden">{children}</div>
      </main>
    </div>
  );
}
