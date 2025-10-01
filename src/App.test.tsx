import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";

import App from "@/App";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { changeLocale, i18n, initI18n } from "@/lib/i18n";

describe("App", () => {
  beforeAll(() => {
    initI18n();
    changeLocale("en");
  });

  it("renders application header", async () => {
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

    expect(await screen.findByText(/Agents Chat Viewer/i)).toBeInTheDocument();
  });
});
