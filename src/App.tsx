"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ChatDetail } from "@/components/chats/chat-detail";
import { ChatList } from "@/components/chats/chat-list";
import { AppShell } from "@/components/layout/app-shell";
import { ProviderSetupDialog } from "@/components/preferences/provider-setup-dialog";
import { ChatSidebar } from "@/components/sidebar/chat-sidebar";
import { Button } from "@/components/ui/button";
import { loadSessionsFromProviders } from "@/lib/session-loader/client";
import { useActiveSession, useChatStore } from "@/store/chat-store";
import { useImportStore } from "@/store/import-store";
import { usePreferencesStore } from "@/store/preferences-store";

export function App() {
  const sessions = useChatStore((state) => state.sessions);
  const setSessions = useChatStore((state) => state.setSessions);
  const activeSession = useActiveSession();
  const isSetupComplete = usePreferencesStore((state) => state.isSetupComplete);
  const providerPaths = usePreferencesStore((state) => state.providerPaths);
  const [setupOpen, setSetupOpen] = useState(!isSetupComplete);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fileSignatures = useImportStore((state) => state.fileSignatures);
  const setImportResult = useImportStore((state) => state.setImportResult);
  const importErrors = useImportStore((state) => state.errors);
  const clearImportErrors = useImportStore((state) => state.clearErrors);

  const refreshSessions = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await loadSessionsFromProviders(
        providerPaths,
        fileSignatures,
        sessions,
      );
      setSessions(result.sessions);
      setImportResult(result);
    } finally {
      setIsRefreshing(false);
    }
  }, [fileSignatures, providerPaths, sessions, setImportResult, setSessions]);

  useEffect(() => {
    if (sessions.length === 0) {
      void refreshSessions();
    }
  }, [sessions.length, refreshSessions]);

  useEffect(() => {
    if (!isSetupComplete) {
      setSetupOpen(true);
    }
  }, [isSetupComplete]);

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
        onConfigureProviders={() => setSetupOpen(true)}
        onRefresh={() => {
          void refreshSessions();
        }}
        isRefreshing={isRefreshing}
      >
        <div className="flex h-full flex-col lg:flex-row">
          <div className="w-full border-b lg:w-80 lg:border-b-0 lg:border-r">
            <ChatList
              onConfigureProviders={() => setSetupOpen(true)}
              onRefresh={() => {
                void refreshSessions();
              }}
              isRefreshing={isRefreshing}
            />
          </div>
          <div className="flex-1">
            <ChatDetail session={activeSession} />
          </div>
        </div>
      </AppShell>
      <ProviderSetupDialog
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
      />
    </>
  );
}

export default App;
