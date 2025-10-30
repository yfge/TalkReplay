import type { SchemaMapping } from "@/schema";
import { schemaRegistry } from "@/schema";

import chatMessageSchema from "./schemas/chat-message.schema.json" assert { type: "json" };

export const cursorSchemas = [chatMessageSchema] as const;

export const cursorMappings: SchemaMapping[] = [
  {
    provider: "cursor",
    id: "cursor/chat.message",
    kind: "message",
    schemaId: chatMessageSchema.$id,
    rules: [
      { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
      { source: "/id", target: "id" },
      { source: "/role", target: "role" },
      { source: "/content", target: "content", transform: "stringify" },
      {
        source: "/providerMessageType",
        target: "metadata.providerMessageType",
      },
      { source: "/attachments", target: "metadata.attachments" },
      { source: "/raw", target: "metadata.raw" },
    ],
  },
];

let cursorSchemasRegistered = false;

export function registerCursorSchemas(): void {
  if (cursorSchemasRegistered) {
    return;
  }
  cursorSchemas.forEach((schema) => schemaRegistry.addSchema(schema));
  cursorMappings.forEach((mapping) => schemaRegistry.registerMapping(mapping));
  cursorSchemasRegistered = true;
}

export function resolveMappingId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const variant = (payload as { variant?: unknown }).variant;
  if (variant !== "cursor/chat.message") {
    return null;
  }
  return "cursor/chat.message";
}
