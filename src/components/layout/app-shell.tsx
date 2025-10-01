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
}

export function AppShell({
  sidebar,
  children,
  onConfigureProviders,
}: AppShellProps) {
  const { t } = useTranslation();

  return (
    <div className="flex h-screen min-h-[600px] w-full flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">{t("header.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("header.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
      </header>
      <main className={cn("flex flex-1 overflow-hidden bg-muted/20")}>
        <aside className="hidden w-72 border-r bg-background/95 p-4 lg:flex lg:flex-col">
          {sidebar}
        </aside>
        <div className="flex-1 overflow-hidden">{children}</div>
      </main>
    </div>
  );
}
