"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ChatDetail } from "@/components/chats/chat-detail";
import { ChatList } from "@/components/chats/chat-list";
import { AppShell } from "@/components/layout/app-shell";
import { ProviderSetupDialog } from "@/components/preferences/provider-setup-dialog";
import { ChatSidebar } from "@/components/sidebar/chat-sidebar";
import { Button } from "@/components/ui/button";
import {
  fetchSessionDetail,
  fetchSessionSummaries,
} from "@/lib/session-loader/client";
import { useActiveSession, useChatStore } from "@/store/chat-store";
import { useImportStore } from "@/store/import-store";
import { usePreferencesStore } from "@/store/preferences-store";

export function App() {
  const sessionSummaries = useChatStore((state) => state.sessionSummaries);
  const setSessionSummaries = useChatStore(
    (state) => state.setSessionSummaries,
  );
  const setSessionDetail = useChatStore((state) => state.setSessionDetail);
  const activeSessionId = useChatStore((state) => state.activeSessionId);
  const activeSession = useActiveSession();
  const isSetupComplete = usePreferencesStore((state) => state.isSetupComplete);
  const providerPaths = usePreferencesStore((state) => state.providerPaths);
  const [setupOpen, setSetupOpen] = useState(!isSetupComplete);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fileSignatures = useImportStore((state) => state.fileSignatures);
  const setImportResult = useImportStore((state) => state.setImportResult);
  const importErrors = useImportStore((state) => state.errors);
  const clearImportErrors = useImportStore((state) => state.clearErrors);

  const refreshSessions = useCallback(async () => {
    setIsRefreshing(true);
    setDetailError(null);
    try {
      const result = await fetchSessionSummaries({
        paths: providerPaths,
        previousSignatures: fileSignatures,
      });
      setSessionSummaries(result.sessions);
      setImportResult({
        signatures: result.signatures,
        errors: result.errors,
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [fileSignatures, providerPaths, setImportResult, setSessionSummaries]);

  useEffect(() => {
    if (isSetupComplete && sessionSummaries.length === 0) {
      void refreshSessions();
    }
  }, [isSetupComplete, sessionSummaries.length, refreshSessions]);

  useEffect(() => {
    if (!isSetupComplete) {
      setSetupOpen(true);
    }
  }, [isSetupComplete]);

  useEffect(() => {
    if (!isSetupComplete || !activeSessionId) {
      return;
    }
    if (activeSession) {
      return;
    }

    let cancelled = false;
    setDetailLoadingId(activeSessionId);
    setDetailError(null);

    void fetchSessionDetail({ id: activeSessionId, paths: providerPaths })
      .then((detail) => {
        if (!cancelled && detail) {
          setSessionDetail(detail);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDetailError(
            error instanceof Error ? error.message : "Unknown error",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoadingId(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeSession,
    activeSessionId,
    isSetupComplete,
    providerPaths,
    setSessionDetail,
  ]);

  useEffect(() => {
    if (activeSession) {
      setDetailError(null);
    }
  }, [activeSession]);

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
        <div className="flex h-full min-h-0">
          <div className="flex w-[22rem] flex-none flex-col border-r">
            <ChatList
              onConfigureProviders={() => setSetupOpen(true)}
              onRefresh={() => {
                void refreshSessions();
              }}
              isRefreshing={isRefreshing}
            />
          </div>
          <div className="flex min-h-0 flex-1">
            <ChatDetail
              session={activeSession}
              isLoading={
                detailLoadingId !== null && detailLoadingId === activeSessionId
              }
              error={detailError}
              onRetry={() => {
                if (activeSessionId) {
                  setDetailLoadingId(activeSessionId);
                  setDetailError(null);
                  void fetchSessionDetail({
                    id: activeSessionId,
                    paths: providerPaths,
                  })
                    .then((detail) => {
                      if (detail) {
                        setSessionDetail(detail);
                      }
                    })
                    .catch((error: unknown) => {
                      setDetailError(
                        error instanceof Error
                          ? error.message
                          : "Unknown error",
                      );
                    })
                    .finally(() => {
                      setDetailLoadingId(null);
                    });
                }
              }}
            />
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
