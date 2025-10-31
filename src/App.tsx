"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ChatList } from "@/components/chats/chat-list";
import { AppShell } from "@/components/layout/app-shell";
import { ProviderSetupDialog } from "@/components/preferences/provider-setup-dialog";
import { ChatSidebar } from "@/components/sidebar/chat-sidebar";
import { Button } from "@/components/ui/button";
import { fetchSessionSummaries } from "@/lib/session-loader/client";
import { useChatStore } from "@/store/chat-store";
import { useImportStore } from "@/store/import-store";
import { usePreferencesStore } from "@/store/preferences-store";

export function App() {
  const sessionSummaries = useChatStore((state) => state.sessionSummaries);
  const setSessionSummaries = useChatStore(
    (state) => state.setSessionSummaries,
  );
  // Active selection is handled by the list; details open in a separate route
  const providerPaths = usePreferencesStore((state) => state.providerPaths);
  const hydrateProviderPaths = usePreferencesStore(
    (state) => state.hydrateProviderPaths,
  );
  const isSetupComplete = usePreferencesStore((state) => state.isSetupComplete);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Inline detail state removed; details now open on /chats/[id]

  const fileSignatures = useImportStore((state) => state.fileSignatures);
  const setImportResult = useImportStore((state) => state.setImportResult);
  const importErrors = useImportStore((state) => state.errors);
  const clearImportErrors = useImportStore((state) => state.clearErrors);

  const refreshSessions = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await fetchSessionSummaries({
        paths: providerPaths,
        previousSignatures: fileSignatures,
      });
      hydrateProviderPaths(result.resolvedPaths);
      setSessionSummaries(result.sessions);
      setImportResult({
        signatures: result.signatures,
        errors: result.errors,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [
    fileSignatures,
    hydrateProviderPaths,
    providerPaths,
    setImportResult,
    setSessionSummaries,
  ]);

  useEffect(() => {
    if (sessionSummaries.length === 0) {
      void refreshSessions();
    }
  }, [sessionSummaries.length, refreshSessions]);

  const [showSetupDialog, setShowSetupDialog] = useState(!isSetupComplete);

  useEffect(() => {
    setShowSetupDialog(!isSetupComplete);
  }, [isSetupComplete]);

  // No inline detail fetching effect — navigation handles full-page detail view.

  const errorBanner = useMemo(() => {
    if (importErrors.length === 0) {
      return null;
    }

    return (
      <div className="flex items-center justify-between gap-4 border-b border-destructive/30 bg-destructive/10 px-6 py-3 text-sm text-destructive">
        <div className="space-y-1">
          <p className="font-medium">Some transcripts could not be imported.</p>
          <ul className="list-disc pl-5 text-xs">
            {importErrors.slice(0, 3).map((error, idx) => (
              <li key={`${error.provider}-${error.file ?? idx}`}>
                {" "}
                {`${error.provider}: ${error.reason}`}{" "}
              </li>
            ))}
            {importErrors.length > 3 ? (
              <li>{`+${importErrors.length - 3} more`}</li>
            ) : null}
          </ul>
        </div>
        <Button variant="ghost" type="button" onClick={clearImportErrors}>
          Dismiss
        </Button>
      </div>
    );
  }, [clearImportErrors, importErrors]);

  return (
    <>
      {errorBanner}
      <AppShell
        sidebar={<ChatSidebar />}
        onRefresh={() => {
          void refreshSessions();
        }}
        isRefreshing={isRefreshing}
      >
        <div className="flex h-full min-h-0">
          <div className="flex w-[22rem] flex-none flex-col border-r border-border/60 bg-background/70 backdrop-blur">
            <ChatList
              onConfigureProviders={() => {
                if (typeof window !== "undefined") {
                  window.location.href = "/settings";
                }
              }}
              onRefresh={() => {
                void refreshSessions();
              }}
              isRefreshing={isRefreshing}
            />
          </div>
          {/* Intentionally left blank: detail now opens on /chats/[id] */}
        </div>
      </AppShell>
      <ProviderSetupDialog
        open={showSetupDialog}
        onClose={() => {
          setShowSetupDialog(false);
        }}
        onCompleted={() => {
          void refreshSessions();
        }}
      />
    </>
  );
}

export default App;
