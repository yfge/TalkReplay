import type { SchemaMapping } from "@/schema";
import { schemaRegistry } from "@/schema";

import messageContentTextSchema from "./schemas/message-content-text.schema.json" assert { type: "json" };
import messageContentToolResultSchema from "./schemas/message-content-tool-result.schema.json" assert { type: "json" };
import messageContentToolUseSchema from "./schemas/message-content-tool-use.schema.json" assert { type: "json" };
import messageTextSchema from "./schemas/message-text.schema.json" assert { type: "json" };

export const claudeSchemas = [
  messageTextSchema,
  messageContentTextSchema,
  messageContentToolUseSchema,
  messageContentToolResultSchema,
] as const;

export const claudeMappings: SchemaMapping[] = [
  {
    provider: "claude",
    id: "claude/message.text",
    kind: "message",
    schemaId: messageTextSchema.$id,
    rules: [
      { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
      { source: "/id", target: "id" },
      { source: "/role", target: "role" },
      { source: "/content", target: "content", transform: "stringify" },
      {
        source: "",
        target: "metadata.providerMessageType",
        transform: { name: "set-constant", options: { value: "text" } },
      },
    ],
  },
  {
    provider: "claude",
    id: "claude/message.content.text",
    kind: "message",
    schemaId: messageContentTextSchema.$id,
    rules: [
      { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
      { source: "/id", target: "id" },
      { source: "/role", target: "role" },
      {
        source: "/contentItem/text",
        target: "content",
        transform: "stringify",
      },
      {
        source: "",
        target: "metadata.providerMessageType",
        transform: { name: "set-constant", options: { value: "text" } },
      },
    ],
  },
  {
    provider: "claude",
    id: "claude/message.content.tool_use",
    kind: "tool-call",
    schemaId: messageContentToolUseSchema.$id,
    rules: [
      { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
      { source: "/id", target: "id" },
      { source: "/role", target: "role" },
      { source: "/stringContent", target: "content" },
      { source: "/contentItem/id", target: "metadata.toolCallId" },
      { source: "/contentItem/id", target: "metadata.toolCall.id" },
      { source: "/contentItem/name", target: "metadata.toolCall.name" },
      {
        source: "/contentItem/input",
        target: "metadata.toolCall.arguments",
      },
      {
        source: "/toolType",
        target: "metadata.toolCall.toolType",
      },
      {
        source: "",
        target: "metadata.providerMessageType",
        transform: { name: "set-constant", options: { value: "tool_use" } },
      },
    ],
  },
  {
    provider: "claude",
    id: "claude/message.content.tool_result",
    kind: "tool-result",
    schemaId: messageContentToolResultSchema.$id,
    rules: [
      { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
      { source: "/id", target: "id" },
      { source: "/role", target: "role" },
      { source: "/contentString", target: "content" },
      { source: "/contentItem/tool_use_id", target: "metadata.toolCallId" },
      {
        source: "/contentItem/tool_use_id",
        target: "metadata.toolResult.callId",
      },
      { source: "/output", target: "metadata.toolResult.output" },
      {
        source: "/toolUseResult/stdout",
        target: "metadata.toolResult.stdout",
      },
      {
        source: "/toolUseResult/stderr",
        target: "metadata.toolResult.stderr",
      },
      {
        source: "/contentItem/is_error",
        target: "metadata.toolResult.isError",
      },
      {
        source: "",
        target: "metadata.providerMessageType",
        transform: { name: "set-constant", options: { value: "tool_result" } },
      },
    ],
  },
];

let claudeSchemasRegistered = false;

export function registerClaudeSchemas(): void {
  if (claudeSchemasRegistered) {
    return;
  }
  claudeSchemas.forEach((schema) => schemaRegistry.addSchema(schema));
  claudeMappings.forEach((mapping) => schemaRegistry.registerMapping(mapping));
  claudeSchemasRegistered = true;
}

export function resolveMappingId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const variant = (payload as { variant?: unknown }).variant;
  if (typeof variant !== "string") {
    return null;
  }
  switch (variant) {
    case "message.text":
      return "claude/message.text";
    case "message.content.text":
      return "claude/message.content.text";
    case "message.content.tool_use":
      return "claude/message.content.tool_use";
    case "message.content.tool_result":
      return "claude/message.content.tool_result";
    default:
      return null;
  }
}
