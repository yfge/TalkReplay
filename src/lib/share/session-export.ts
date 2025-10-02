import type { ChatMessage, ChatSession } from "@/types/chat";

function wrapCodeBlock(value: string): string {
  if (!value.trim()) {
    return "(empty message)";
  }
  return ["```", value, "```"].join("\n");
}

function formatMessageContent(message: ChatMessage): string {
  const content = message.content ?? "";
  switch (message.kind) {
    case "tool-call":
      return [
        `Tool call (${message.metadata?.toolCall?.name ?? "unknown"})`,
        wrapCodeBlock(content || "(no input)"),
      ].join("\n\n");
    case "tool-result":
      return [
        `Tool result (${message.metadata?.toolResult?.callId ?? "unknown"})`,
        wrapCodeBlock(content || "(no output)"),
      ].join("\n\n");
    case "reasoning":
      return [
        "Reasoning",
        wrapCodeBlock(
          content || message.metadata?.reasoning?.summary || "(redacted)",
        ),
      ].join("\n\n");
    case "system":
      return wrapCodeBlock(content);
    default:
      return wrapCodeBlock(content);
  }
}

export function sessionToMarkdown(session: ChatSession): string {
  const lines: string[] = [];
  lines.push(`# ${session.topic || "Conversation"}`);
  lines.push(
    `*Started:* ${new Date(session.startedAt).toISOString()}  ` +
      `*Source:* ${session.source}`,
  );
  if (session.metadata?.summary) {
    lines.push("");
    lines.push(session.metadata.summary.trim());
  }
  lines.push("");
  lines.push("---");

  for (const message of session.messages) {
    lines.push("");
    lines.push(
      `## ${message.role} — ${new Date(message.timestamp).toISOString()}`,
    );
    lines.push("");
    lines.push(formatMessageContent(message));
  }

  if (session.metadata?.sourceFile) {
    lines.push("");
    lines.push("---");
    lines.push(`Source file: ${session.metadata.sourceFile}`);
  }

  return lines.join("\n");
}

export function sessionToJson(session: ChatSession): string {
  return JSON.stringify(session, null, 2);
}

export function sessionToFilename(
  session: ChatSession,
  extension: string,
): string {
  const safeTopic = session.topic
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const base = safeTopic || "conversation";
  return `${base}.${extension}`;
}
