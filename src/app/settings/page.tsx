"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { LocaleToggle } from "@/components/theme/locale-toggle";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import type { ProviderKey } from "@/config/providerPaths";
import { usePreferencesStore } from "@/store/preferences-store";

const providerOrder: ProviderKey[] = ["claude", "codex", "cursor", "gemini"];
const windowsDrivePattern = /^[A-Za-z]:/;

function hasInvalidPathCharacters(value: string): boolean {
  if (windowsDrivePattern.test(value)) {
    const rest = value.slice(2);
    if (rest.includes(":")) {
      return true;
    }
    return /[<>"|?*]/.test(rest);
  }
  return /[<>:"|?*]/.test(value);
}

export default function SettingsPage() {
  const { t } = useTranslation();
  const providerPaths = usePreferencesStore((s) => s.providerPaths);
  const setProviderPath = usePreferencesStore((s) => s.setProviderPath);
  const clearProviderPath = usePreferencesStore((s) => s.clearProviderPath);
  const completeSetup = usePreferencesStore((s) => s.completeSetup);

  const [localPaths, setLocalPaths] = useState(providerPaths);
  const [errors, setErrors] = useState<Record<ProviderKey, string | undefined>>(
    {
      claude: undefined,
      codex: undefined,
      cursor: undefined,
      gemini: undefined,
    },
  );
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    setLocalPaths(providerPaths);
  }, [providerPaths]);

  const hasAnyPath = useMemo(
    () =>
      providerOrder.some((provider) => {
        const value = localPaths[provider];
        return typeof value === "string" && value.trim().length > 0;
      }),
    [localPaths],
  );

  const handleChange = (provider: ProviderKey, value: string) => {
    setSaved(null);
    setLocalPaths((prev) => ({ ...prev, [provider]: value }));
    setErrors((prev) => ({ ...prev, [provider]: undefined }));
  };

  const handleClear = (provider: ProviderKey) => {
    setSaved(null);
    setLocalPaths((prev) => ({ ...prev, [provider]: "" }));
    setErrors((prev) => ({ ...prev, [provider]: undefined }));
  };

  const handleSave = () => {
    const nextErrors: Record<ProviderKey, string | undefined> = {
      claude: undefined,
      codex: undefined,
      cursor: undefined,
      gemini: undefined,
    };
    providerOrder.forEach((provider) => {
      const value = localPaths[provider];
      if (value && value.trim().length > 0) {
        const trimmed = value.trim();
        if (trimmed.length < 2 || hasInvalidPathCharacters(trimmed)) {
          nextErrors[provider] = t("providerSetup.validationInvalid");
        } else {
          setProviderPath(provider, trimmed);
        }
      } else {
        clearProviderPath(provider);
      }
    });
    const hasErrors = Object.values(nextErrors).some(Boolean);
    if (hasErrors) {
      setErrors(nextErrors);
      setSaved(null);
      return;
    }
    completeSetup();
    setSaved(t("settings.saved"));
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-gradient-to-br from-background via-muted/40 to-background text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-10">
        <header className="mb-6 flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/80 px-6 py-4 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold sm:text-2xl">
              {t("settings.title")}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("settings.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LocaleToggle />
            <ThemeToggle />
            <Button asChild variant="outline" type="button">
              <Link href="/">{t("settings.backToChats")}</Link>
            </Button>
          </div>
        </header>

        <section className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur">
          <h2 className="text-lg font-semibold">
            {t("settings.providers.title")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("settings.providers.description")}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {providerOrder.map((provider) => (
              <div key={provider} className="space-y-2">
                <label className="text-sm font-medium">
                  {t(`providerSetup.providerLabel.${provider}`)}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    className="w-full rounded-lg border border-input bg-background/85 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder={t("providerSetup.placeholder")}
                    value={localPaths[provider] ?? ""}
                    onChange={(e) => handleChange(provider, e.target.value)}
                    aria-invalid={Boolean(errors[provider])}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-xs"
                    onClick={() => handleClear(provider)}
                  >
                    {t("settings.clear")}
                  </Button>
                </div>
                {errors[provider] ? (
                  <p className="text-xs text-destructive">{errors[provider]}</p>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button type="button" onClick={handleSave} disabled={!hasAnyPath}>
              {t("settings.save")}
            </Button>
            {saved ? (
              <span className="text-sm text-muted-foreground">{saved}</span>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
