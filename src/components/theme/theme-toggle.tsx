import { MoonStar, Sun } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";

import { useTheme } from "./theme-provider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const toggle = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  return (
    <Button
      aria-label="Toggle theme"
      variant="ghost"
      className="px-2"
      type="button"
      onClick={toggle}
    >
      {theme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <MoonStar className="size-4" />
      )}
    </Button>
  );
}
