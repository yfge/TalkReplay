import { useEffect, useState } from "react";

import { ChatDetail } from "@/components/chats/chat-detail";
import { ChatList } from "@/components/chats/chat-list";
import { AppShell } from "@/components/layout/app-shell";
import { ProviderSetupDialog } from "@/components/preferences/provider-setup-dialog";
import { ChatSidebar } from "@/components/sidebar/chat-sidebar";
import { sampleSessions } from "@/data/sampleSessions";
import { useActiveSession, useChatStore } from "@/store/chat-store";
import { usePreferencesStore } from "@/store/preferences-store";

export function App() {
  const sessions = useChatStore((state) => state.sessions);
  const setSessions = useChatStore((state) => state.setSessions);
  const activeSession = useActiveSession();
  const isSetupComplete = usePreferencesStore((state) => state.isSetupComplete);
  const [setupOpen, setSetupOpen] = useState(!isSetupComplete);

  useEffect(() => {
    if (sessions.length === 0) {
      setSessions(sampleSessions);
    }
  }, [sessions.length, setSessions]);

  useEffect(() => {
    if (!isSetupComplete) {
      setSetupOpen(true);
    }
  }, [isSetupComplete]);

  return (
    <>
      <AppShell
        sidebar={<ChatSidebar />}
        onConfigureProviders={() => setSetupOpen(true)}
      >
        <div className="flex h-full flex-col lg:flex-row">
          <div className="w-full border-b lg:w-80 lg:border-b-0 lg:border-r">
            <ChatList onConfigureProviders={() => setSetupOpen(true)} />
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
