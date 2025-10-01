import { useEffect } from "react";

import { ChatDetail } from "@/components/chats/chat-detail";
import { ChatList } from "@/components/chats/chat-list";
import { AppShell } from "@/components/layout/app-shell";
import { ChatSidebar } from "@/components/sidebar/chat-sidebar";
import { sampleSessions } from "@/data/sampleSessions";
import { useActiveSession, useChatStore } from "@/store/chat-store";

export function App() {
  const sessions = useChatStore((state) => state.sessions);
  const setSessions = useChatStore((state) => state.setSessions);
  const activeSession = useActiveSession();

  useEffect(() => {
    if (sessions.length === 0) {
      setSessions(sampleSessions);
    }
  }, [sessions.length, setSessions]);

  return (
    <AppShell sidebar={<ChatSidebar />}>
      <div className="flex h-full flex-col lg:flex-row">
        <div className="w-full border-b lg:w-80 lg:border-b-0 lg:border-r">
          <ChatList />
        </div>
        <div className="flex-1">
          <ChatDetail session={activeSession} />
        </div>
      </div>
    </AppShell>
  );
}

export default App;
