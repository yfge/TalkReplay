"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ProviderKey } from "@/config/providerPaths";
import { usePreferencesStore } from "@/store/preferences-store";

type ProviderDefaults = Partial<Record<ProviderKey, string | undefined>>;
type LocalPaths = Partial<Record<ProviderKey, string | undefined>>;

const providerOrder: ProviderKey[] = ["claude", "codex", "cursor", "gemini"];

const BASE_TOUCHED_STATE: Record<ProviderKey, boolean> = {
  claude: false,
  codex: false,
  cursor: false,
  gemini: false,
};

function createUntouchedState(): Record<ProviderKey, boolean> {
  return { ...BASE_TOUCHED_STATE };
}

function getFallbackSuggestion(provider: ProviderKey): string | undefined {
  if (typeof navigator === "undefined") {
    return undefined;
  }
  const platform = navigator.platform?.toLowerCase() ?? "";
  const userAgent = navigator.userAgent?.toLowerCase() ?? "";
  const isWindows = platform.includes("win") || userAgent.includes("windows");
  const isMac = platform.includes("mac") || userAgent.includes("macintosh");

  switch (provider) {
    case "claude":
      if (isWindows) {
        return "%USERPROFILE%\\.claude\\projects";
      }
      return "~/.claude/projects";
    case "codex":
      if (isWindows) {
        return "%USERPROFILE%\\.codex\\sessions";
      }
      return "~/.codex/sessions";
    case "cursor":
      if (isWindows) {
        return "%APPDATA%\\Cursor";
      }
      if (isMac) {
        return "~/Library/Application Support/Cursor";
      }
      return "~/.config/Cursor";
    case "gemini":
      return "~/.gemini/logs";
    default:
      return undefined;
  }
}

interface ProviderSetupDialogProps {
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

export function ProviderSetupDialog({
  open,
  onClose,
  onCompleted,
}: ProviderSetupDialogProps) {
  const { t } = useTranslation();
  const providerPaths = usePreferencesStore((state) => state.providerPaths);
  const setProviderPath = usePreferencesStore((state) => state.setProviderPath);
  const clearProviderPath = usePreferencesStore(
    (state) => state.clearProviderPath,
  );
  const completeSetup = usePreferencesStore((state) => state.completeSetup);

  const [localPaths, setLocalPaths] = useState<LocalPaths>({});
  const [touched, setTouchedState] =
    useState<Record<ProviderKey, boolean>>(createUntouchedState);
  const touchedRef = useRef<Record<ProviderKey, boolean>>(touched);
  const [defaults, setDefaults] = useState<ProviderDefaults>({});
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasAnyPath = useMemo(
    () =>
      providerOrder.some((provider) => {
        const value = localPaths[provider];
        return typeof value === "string" && value.trim().length > 0;
      }),
    [localPaths],
  );

  useEffect(() => {
    if (!open) {
      setTouchedState(() => {
        const next = createUntouchedState();
        touchedRef.current = next;
        return next;
      });
      setDefaults({});
      setHasError(false);
      setIsLoading(false);
      setLocalPaths({});
      return;
    }

    setLocalPaths((prev) => {
      let changed = false;
      const next: LocalPaths = { ...prev };
      providerOrder.forEach((provider) => {
        const storeValue = providerPaths[provider];
        if (storeValue && !touchedRef.current[provider]) {
          if (next[provider] !== storeValue) {
            next[provider] = storeValue;
            changed = true;
          }
        }
      });
      return changed ? next : prev;
    });
  }, [open, providerPaths]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isActive = true;
    const controller = new AbortController();
    const fetchDefaults = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const response = await fetch("/api/providers/defaults", {
          method: "GET",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }
        const result = (await response.json()) as {
          defaults?: Record<ProviderKey, string | undefined>;
        };
        if (!isActive) {
          return;
        }
        setDefaults(result.defaults ?? {});
        setIsLoading(false);
      } catch (error) {
        if (!isActive && controller.signal.aborted) {
          return;
        }
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        const fallback: ProviderDefaults = {};
        providerOrder.forEach((provider) => {
          const suggestion = getFallbackSuggestion(provider);
          if (suggestion) {
            fallback[provider] = suggestion;
          }
        });
        setDefaults(fallback);
        setIsLoading(false);
        setHasError(true);
      }
    };

    fetchDefaults().catch(() => {
      // Errors handled above; this is defensive to avoid unhandled rejection.
    });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setLocalPaths((prev) => {
      let changed = false;
      const next: LocalPaths = { ...prev };
      providerOrder.forEach((provider) => {
        if (touchedRef.current[provider]) {
          return;
        }
        const suggestion = defaults[provider];
        if (!suggestion) {
          return;
        }
        const current = next[provider];
        if (!current || current.trim().length === 0) {
          next[provider] = suggestion;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [defaults, open]);

  const handleChange = useCallback((provider: ProviderKey, value: string) => {
    setLocalPaths((prev) => ({ ...prev, [provider]: value }));
    setTouchedState((prev) => {
      if (prev[provider]) {
        return prev;
      }
      const next = { ...prev, [provider]: true };
      touchedRef.current = next;
      return next;
    });
  }, []);

  const handleUseSuggestion = useCallback(
    (provider: ProviderKey) => {
      const suggestion = defaults[provider];
      if (!suggestion) {
        return;
      }
      setLocalPaths((prev) => ({ ...prev, [provider]: suggestion }));
      setTouchedState((prev) => {
        if (prev[provider]) {
          return prev;
        }
        const next = { ...prev, [provider]: true };
        touchedRef.current = next;
        return next;
      });
    },
    [defaults],
  );

  const handleAction = useCallback(
    (options: {
      applyPaths: boolean;
      complete: boolean;
      redirectToSettings?: boolean;
    }) => {
      const { applyPaths, complete, redirectToSettings } = options;
      setIsSubmitting(true);
      if (applyPaths) {
        providerOrder.forEach((provider) => {
          const value = localPaths[provider]?.trim();
          if (value) {
            setProviderPath(provider, value);
          } else {
            clearProviderPath(provider);
          }
        });
      }
      if (complete) {
        completeSetup();
      }
      setIsSubmitting(false);
      if (applyPaths) {
        onCompleted();
      }
      if (redirectToSettings && typeof window !== "undefined") {
        window.location.href = "/settings";
        return;
      }
      onClose();
    },
    [
      clearProviderPath,
      completeSetup,
      localPaths,
      onClose,
      onCompleted,
      setProviderPath,
    ],
  );

  const statusMessage = useMemo(() => {
    if (isLoading) {
      return t("providerSetup.firstRun.loading");
    }
    if (hasError) {
      return t("providerSetup.firstRun.error");
    }
    return undefined;
  }, [hasError, isLoading, t]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader className="space-y-3">
          <DialogTitle>{t("providerSetup.firstRun.title")}</DialogTitle>
          <DialogDescription>
            {t("providerSetup.firstRun.description")}
          </DialogDescription>
          {statusMessage ? (
            <p className="text-sm text-muted-foreground">{statusMessage}</p>
          ) : null}
        </DialogHeader>
        <div className="space-y-6 py-2">
          {providerOrder.map((provider) => {
            const label = t(`providerSetup.providerLabel.${provider}`);
            const suggestion = defaults[provider];
            const value = localPaths[provider] ?? "";
            return (
              <div key={provider} className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium" htmlFor={provider}>
                    {label}
                  </label>
                  {suggestion ? (
                    <button
                      type="button"
                      className="text-xs font-medium text-primary hover:underline"
                      onClick={() => handleUseSuggestion(provider)}
                    >
                      {t("providerSetup.firstRun.useSuggestion")}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t("providerSetup.firstRun.notDetected")}
                    </span>
                  )}
                </div>
                <Input
                  id={provider}
                  value={value}
                  onChange={(event) =>
                    handleChange(provider, event.target.value)
                  }
                  placeholder={t("providerSetup.placeholder")}
                  autoComplete="off"
                  spellCheck={false}
                />
                {suggestion ? (
                  <p className="text-xs text-muted-foreground">
                    {t("providerSetup.firstRun.detected", {
                      path: suggestion,
                    })}
                  </p>
                ) : null}
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">
            {t("providerSetup.notice")}
          </p>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              handleAction({
                applyPaths: false,
                complete: true,
              })
            }
            disabled={isSubmitting}
          >
            {t("providerSetup.skip")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              handleAction({
                applyPaths: true,
                complete: true,
                redirectToSettings: true,
              });
            }}
            disabled={isSubmitting}
          >
            {t("providerSetup.firstRun.openSettings")}
          </Button>
          <Button
            type="button"
            onClick={() =>
              handleAction({
                applyPaths: true,
                complete: true,
              })
            }
            disabled={isSubmitting || !hasAnyPath}
          >
            {t("providerSetup.firstRun.continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
