import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";

import App from "@/App";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { i18n, initI18n, changeLocale } from "@/lib/i18n";

describe("App", () => {
  beforeAll(() => {
    initI18n();
    changeLocale("en");
  });

  it("renders application header", () => {
    const queryClient = new QueryClient();
    render(
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </QueryClientProvider>
      </I18nextProvider>,
    );

    expect(screen.getByText(/Agents Chat Viewer/i)).toBeInTheDocument();
  });
});
