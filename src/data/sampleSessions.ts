import type { ChatSession } from "@/types/chat";

export const sampleSessions: ChatSession[] = [
  {
    id: "claude-20240401-001",
    source: "claude",
    topic: "Build timeline component",
    startedAt: "2024-04-01T09:30:00.000Z",
    participants: ["user", "claude"],
    metadata: {
      sourceFile: "claude/2024/04/01/build-timeline.json",
      provider: {
        model: "claude-3-opus",
        temperature: 0.4,
      },
      tags: ["frontend", "ui"],
    },
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
        metadata: {
          attachments: [
            {
              type: "code",
              name: "Timeline.tsx",
              language: "tsx",
            },
          ],
        },
      },
    ],
  },
  {
    id: "codex-20240328-002",
    source: "codex",
    topic: "Fix lint errors",
    startedAt: "2024-03-28T14:10:00.000Z",
    participants: ["user", "codex"],
    metadata: {
      sourceFile: "codex/2024/03/28/linting.md",
      provider: {
        model: "gpt-4-codex",
        temperature: 0,
      },
    },
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
  {
    id: "gemini-20240512-003",
    source: "gemini",
    topic: "Summarise user feedback",
    startedAt: "2024-05-12T07:42:12.000Z",
    participants: ["user", "gemini"],
    metadata: {
      sourceFile: "gemini/feedback/summary.json",
      provider: {
        model: "gemini-1.5-pro",
        temperature: 0.2,
        topP: 0.95,
      },
      tags: ["analysis", "summary"],
      summary: "Condensed feedback items for Q2 roadmap planning.",
    },
    messages: [
      {
        id: "msg-5",
        role: "user",
        timestamp: "2024-05-12T07:42:12.000Z",
        content: "Please summarise the key themes from this feedback dataset.",
      },
      {
        id: "msg-6",
        role: "assistant",
        timestamp: "2024-05-12T07:42:20.000Z",
        content:
          "Top requests include better onboarding, clearer analytics, and expanded export options.",
        metadata: {
          tokens: {
            prompt: 1280,
            completion: 210,
            total: 1490,
          },
        },
      },
    ],
  },
];
