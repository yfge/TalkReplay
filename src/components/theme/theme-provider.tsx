import * as React from "react";

type Theme = "light" | "dark";

type ThemeProviderProps = {
  defaultTheme?: Theme;
  storageKey?: string;
  children: React.ReactNode;
};

const ThemeProviderContext = React.createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
} | null>(null);

const prefersDark = () =>
  window.matchMedia &&
  window.matchMedia("(prefers-color-scheme: dark)").matches;

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "ui-theme",
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);

  React.useEffect(() => {
    const stored = window.localStorage.getItem(storageKey) as Theme | null;
    if (stored) {
      setThemeState(stored);
      return;
    }
    setThemeState(prefersDark() ? "dark" : defaultTheme);
  }, [defaultTheme, storageKey]);

  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(storageKey, theme);
  }, [storageKey, theme]);

  const setTheme = React.useCallback((value: Theme) => {
    setThemeState(value);
  }, []);

  return (
    <ThemeProviderContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeProviderContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
