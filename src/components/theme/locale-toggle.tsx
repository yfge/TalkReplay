import { Globe } from "lucide-react";
import * as React from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  changeLocale,
  type SupportedLocale,
} from "@/lib/i18n";

const localeLabels: Record<SupportedLocale, string> = {
  en: "English",
  "zh-CN": "中文",
};

export function LocaleToggle(): JSX.Element {
  const { i18n, t } = useTranslation();

  const currentLocale: SupportedLocale = React.useMemo(() => {
    const active = i18n.language as SupportedLocale;
    return SUPPORTED_LOCALES.includes(active) ? active : DEFAULT_LOCALE;
  }, [i18n.language]);

  const handleToggle = React.useCallback(() => {
    const currentIndex = SUPPORTED_LOCALES.indexOf(currentLocale);
    const next =
      SUPPORTED_LOCALES[(currentIndex + 1) % SUPPORTED_LOCALES.length];
    changeLocale(next);
  }, [currentLocale]);

  return (
    <Button
      aria-label={t("localeToggle.label")}
      variant="ghost"
      className="gap-2 px-3"
      type="button"
      onClick={handleToggle}
    >
      <Globe className="size-4" />
      <span>{localeLabels[currentLocale]}</span>
    </Button>
  );
}
