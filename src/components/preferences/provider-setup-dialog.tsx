import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import type { ProviderKey } from "@/config/providerPaths";
import { usePreferencesStore } from "@/store/preferences-store";

const providerOrder: ProviderKey[] = ["claude", "codex", "gemini"];

interface ProviderSetupDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ProviderSetupDialog({
  open,
  onClose,
}: ProviderSetupDialogProps) {
  const { t } = useTranslation();
  const providerPaths = usePreferencesStore((state) => state.providerPaths);
  const setProviderPath = usePreferencesStore((state) => state.setProviderPath);
  const clearProviderPath = usePreferencesStore(
    (state) => state.clearProviderPath,
  );
  const completeSetup = usePreferencesStore((state) => state.completeSetup);

  const [localPaths, setLocalPaths] = useState(providerPaths);
  const [errors, setErrors] = useState<Record<ProviderKey, string | undefined>>(
    {
      claude: undefined,
      codex: undefined,
      gemini: undefined,
    },
  );

  useEffect(() => {
    setLocalPaths(providerPaths);
  }, [providerPaths, open]);

  const hasAnyPath = useMemo(
    () =>
      providerOrder.some((provider) => {
        const value = localPaths[provider];
        return typeof value === "string" && value.trim().length > 0;
      }),
    [localPaths],
  );

  const handleChange = (provider: ProviderKey, value: string) => {
    setLocalPaths((prev) => ({
      ...prev,
      [provider]: value,
    }));
    setErrors((prev) => ({
      ...prev,
      [provider]: undefined,
    }));
  };

  const handleSave = () => {
    const nextErrors: Record<ProviderKey, string | undefined> = {
      claude: undefined,
      codex: undefined,
      gemini: undefined,
    };
    providerOrder.forEach((provider) => {
      const value = localPaths[provider];
      if (value && value.trim().length > 0) {
        const trimmed = value.trim();
        if (trimmed.length < 2 || /[<>:"|?*]/.test(trimmed)) {
          nextErrors[provider] = t("providerSetup.validationInvalid");
        } else {
          setProviderPath(provider, trimmed);
        }
      } else if (!value || value.trim().length === 0) {
        clearProviderPath(provider);
      }
    });
    const hasErrors = Object.values(nextErrors).some((message) =>
      Boolean(message),
    );
    if (hasErrors) {
      setErrors(nextErrors);
      return;
    }
    completeSetup();
    onClose();
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-xl rounded-lg border border-border bg-background p-6 shadow-xl">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{t("providerSetup.title")}</h2>
          <p className="text-sm text-muted-foreground">
            {t("providerSetup.description")}
          </p>
        </div>
        <div className="mt-6 space-y-4">
          {providerOrder.map((provider) => (
            <div key={provider} className="space-y-2">
              <label className="text-sm font-medium">
                {t(`providerSetup.providerLabel.${provider}`)}
              </label>
              <input
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={t("providerSetup.placeholder")}
                value={localPaths[provider] ?? ""}
                onChange={(event) => handleChange(provider, event.target.value)}
                aria-invalid={Boolean(errors[provider])}
              />
              {errors[provider] ? (
                <p className="text-xs text-destructive">{errors[provider]}</p>
              ) : null}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            {t("providerSetup.notice")}
          </p>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={onClose}>
            {t("providerSetup.skip")}
          </Button>
          <Button type="button" onClick={handleSave} disabled={!hasAnyPath}>
            {t("providerSetup.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
