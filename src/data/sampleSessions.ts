import type { ChatSession } from "@/types/chat";

export const sampleSessions: ChatSession[] = [
  {
    id: "claude-20240401-001",
    source: "claude",
    topic: "Build timeline component",
    startedAt: "2024-04-01T09:30:00.000Z",
    participants: ["user", "claude"],
    messages: [
      {
        id: "msg-1",
        role: "user",
        timestamp: "2024-04-01T09:30:00.000Z",
        content: "Help me create a responsive timeline component in React.",
      },
      {
        id: "msg-2",
        role: "assistant",
        timestamp: "2024-04-01T09:30:05.000Z",
        content: "Here is a timeline component using Tailwind CSS...",
      },
    ],
  },
  {
    id: "codex-20240328-002",
    source: "codex",
    topic: "Fix lint errors",
    startedAt: "2024-03-28T14:10:00.000Z",
    participants: ["user", "codex"],
    messages: [
      {
        id: "msg-3",
        role: "user",
        timestamp: "2024-03-28T14:10:00.000Z",
        content: "The build fails with ESLint errors, what should I do?",
      },
      {
        id: "msg-4",
        role: "assistant",
        timestamp: "2024-03-28T14:10:04.000Z",
        content:
          "Try updating the ESLint configuration to extend the recommended rules...",
      },
    ],
  },
];
