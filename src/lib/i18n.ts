import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "@/locales/en/common.json";
import zhCommon from "@/locales/zh-CN/common.json";

export const SUPPORTED_LOCALES = ["en", "zh-CN"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "en";

const resources = {
  en: {
    common: enCommon,
  },
  "zh-CN": {
    common: zhCommon,
  },
};

export function initI18n(): void {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: DEFAULT_LOCALE,
      fallbackLng: DEFAULT_LOCALE,
      defaultNS: "common",
      interpolation: {
        escapeValue: false,
      },
    });
  }
}

export function changeLocale(locale: SupportedLocale): void {
  if (!SUPPORTED_LOCALES.includes(locale)) {
    return;
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem("agents.locale", locale);
    window.document.documentElement.lang = locale;
  }
  void i18n.changeLanguage(locale);
}

export { i18n };

export function syncDocumentLocale(locale: SupportedLocale): void {
  if (typeof window !== "undefined") {
    window.document.documentElement.lang = locale;
  }
}

export function resolveInitialLocale(): SupportedLocale {
  if (typeof window === "undefined") {
    return DEFAULT_LOCALE;
  }

  const stored = window.localStorage.getItem("agents.locale");
  if (stored && SUPPORTED_LOCALES.includes(stored as SupportedLocale)) {
    return stored as SupportedLocale;
  }

  const browser = window.navigator.language;
  if (browser.toLowerCase().startsWith("zh")) {
    return "zh-CN";
  }

  return DEFAULT_LOCALE;
}
