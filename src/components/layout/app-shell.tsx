import type * as React from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

interface AppShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ sidebar, children }: AppShellProps) {
  return (
    <div className="flex h-screen min-h-[600px] w-full flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Agents Chat Viewer</h1>
          <p className="text-sm text-muted-foreground">
            Inspect and compare Claude and Codex conversations.
          </p>
        </div>
        <div className="flex items-center gap-2">
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
