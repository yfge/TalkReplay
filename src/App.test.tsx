import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";

import App from "@/App";
import { ThemeProvider } from "@/components/theme/theme-provider";

describe("App", () => {
  it("renders application header", () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText(/Agents Chat Viewer/i)).toBeInTheDocument();
  });
});
