"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type PropsWithChildren } from "react";
import { I18nextProvider } from "react-i18next";

import { ThemeProvider } from "@/components/theme/theme-provider";
import { i18n, initI18n } from "@/lib/i18n";

initI18n();

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>{children}</ThemeProvider>
      </QueryClientProvider>
    </I18nextProvider>
  );
}
