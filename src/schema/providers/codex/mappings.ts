import type { SchemaMapping } from "@/schema";
import { schemaRegistry } from "@/schema";

import agentMessageCompletedSchema from "./schemas/item-agent-message-completed.schema.json" assert { type: "json" };
import commandExecutionCompletedSchema from "./schemas/item-command-execution-completed.schema.json" assert { type: "json" };
import commandExecutionStartedSchema from "./schemas/item-command-execution-started.schema.json" assert { type: "json" };
import fileChangeCompletedSchema from "./schemas/item-file-change-completed.schema.json" assert { type: "json" };
import fileChangeStartedSchema from "./schemas/item-file-change-started.schema.json" assert { type: "json" };
import mcpToolCallCompletedSchema from "./schemas/item-mcp-tool-call-completed.schema.json" assert { type: "json" };
import mcpToolCallStartedSchema from "./schemas/item-mcp-tool-call-started.schema.json" assert { type: "json" };
import reasoningCompletedSchema from "./schemas/item-reasoning-completed.schema.json" assert { type: "json" };
import webSearchCompletedSchema from "./schemas/item-web-search-completed.schema.json" assert { type: "json" };
import webSearchStartedSchema from "./schemas/item-web-search-started.schema.json" assert { type: "json" };
import functionCallOutputSchema from "./schemas/response-item-function-call-output.schema.json" assert { type: "json" };
import functionCallSchema from "./schemas/response-item-function-call.schema.json" assert { type: "json" };
import reasoningResponseSchema from "./schemas/response-item-reasoning.schema.json" assert { type: "json" };

export const codexSchemas = [
  commandExecutionStartedSchema,
  commandExecutionCompletedSchema,
  fileChangeStartedSchema,
  fileChangeCompletedSchema,
  agentMessageCompletedSchema,
  reasoningCompletedSchema,
  mcpToolCallStartedSchema,
  mcpToolCallCompletedSchema,
  webSearchStartedSchema,
  webSearchCompletedSchema,
  functionCallSchema,
  reasoningResponseSchema,
  functionCallOutputSchema,
] as const;

export const codexMappings: SchemaMapping[] = [
  {
    provider: "codex",
    id: "codex/item.command_execution.started",
    kind: "tool-call",
    schemaId: commandExecutionStartedSchema.$id,
    rules: [
      { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
      { source: "/item/id", target: "id" },
      { source: "/item/id", target: "metadata.toolCallId" },
      { source: "/item/id", target: "metadata.toolCall.id" },
      {
        source: "/item/command",
        target: "metadata.toolCall.arguments.command",
      },
      { source: "/item/command", target: "content" },
      {
        source: "/item/command",
        target: "metadata.toolCall.toolType",
        transform: "command-tool-type",
      },
      { source: "/type", target: "metadata.providerMessageType" },
      {
        source: "",
        target: "role",
        transform: { name: "set-constant", options: { value: "assistant" } },
      },
    ],
  },
  {
    provider: "codex",
    id: "codex/item.command_execution.completed",
    kind: "tool-result",
    schemaId: commandExecutionCompletedSchema.$id,
    rules: [
      { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
      {
        source: "/item/id",
        target: "id",
        transform: { name: "append-suffix", options: { suffix: ":result" } },
      },
      { source: "/item/id", target: "metadata.toolCallId" },
      {
        source: "/item/aggregated_output",
        target: "metadata.toolResult.output",
      },
      {
        source: "/item/aggregated_output",
        target: "content",
        transform: "stringify",
      },
      {
        source: "/item/exit_code",
        target: "metadata.toolResult.exitCode",
        transform: "exit-code",
      },
      { source: "/item/status", target: "metadata.toolResult.status" },
      { source: "/type", target: "metadata.providerMessageType" },
      {
        source: "",
        target: "role",
        transform: { name: "set-constant", options: { value: "tool" } },
      },
    ],
  },
  {
    provider: "codex",
    id: "codex/item.file_change.started",
    kind: "tool-call",
    schemaId: fileChangeStartedSchema.$id,
    rules: [
      { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
      { source: "/item/id", target: "id" },
      { source: "/item/id", target: "metadata.toolCallId" },
      { source: "/item/id", target: "metadata.toolCall.id" },
      {
        source: "/item/changes",
        target: "metadata.toolCall.arguments.changes",
      },
      {
        source: "/item/changes",
        target: "content",
        transform: "stringify",
      },
      {
        source: "",
        target: "metadata.toolCall.toolType",
        transform: { name: "set-constant", options: { value: "file_change" } },
      },
      { source: "/type", target: "metadata.providerMessageType" },
      {
        source: "",
        target: "role",
        transform: { name: "set-constant", options: { value: "assistant" } },
      },
    ],
  },
  {
    provider: "codex",
    id: "codex/item.file_change.completed",
    kind: "tool-result",
    schemaId: fileChangeCompletedSchema.$id,
    rules: [
      { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
      {
        source: "/item/id",
        target: "id",
        transform: { name: "append-suffix", options: { suffix: ":result" } },
      },
      { source: "/item/id", target: "metadata.toolCallId" },
      { source: "/item/status", target: "metadata.toolResult.status" },
      { source: "/item/changes", target: "metadata.toolResult.output" },
      {
        source: "/item/changes",
        target: "metadata.toolResult.filesChanged",
        transform: "collect-file-change-paths",
      },
      {
        source: "/item/changes",
        target: "content",
        transform: "stringify",
      },
      { source: "/type", target: "metadata.providerMessageType" },
      {
        source: "",
        target: "role",
        transform: { name: "set-constant", options: { value: "tool" } },
      },
    ],
  },
  {
    provider: "codex",
    id: "codex/item.mcp_tool_call.started",
    kind: "tool-call",
    schemaId: mcpToolCallStartedSchema.$id,
    rules: [
      { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
      { source: "/item/id", target: "id" },
      { source: "/item/id", target: "metadata.toolCallId" },
      { source: "/item/id", target: "metadata.toolCall.id" },
      { source: "/item/server", target: "metadata.toolCall.arguments.server" },
      { source: "/item/tool", target: "metadata.toolCall.arguments.tool" },
      { source: "/item/tool", target: "metadata.toolCall.toolType" },
      {
        source: "/item/server",
        target: "metadata.toolCall.name",
        transform: "map-tool-name",
      },
      { source: "/type", target: "metadata.providerMessageType" },
      {
        source: "",
        target: "role",
        transform: { name: "set-constant", options: { value: "assistant" } },
      },
    ],
  },
  {
    provider: "codex",
    id: "codex/item.mcp_tool_call.completed",
    kind: "tool-result",
    schemaId: mcpToolCallCompletedSchema.$id,
    rules: [
      { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
      {
        source: "/item/id",
        target: "id",
        transform: { name: "append-suffix", options: { suffix: ":result" } },
      },
      { source: "/item/id", target: "metadata.toolCallId" },
      { source: "/item/status", target: "metadata.toolResult.status" },
      {
        source: "",
        target: "metadata.toolResult.exitCode",
        transform: { name: "set-constant", options: { value: 0 } },
      },
      { source: "/type", target: "metadata.providerMessageType" },
      {
        source: "",
        target: "role",
        transform: { name: "set-constant", options: { value: "tool" } },
      },
    ],
  },
  {
    provider: "codex",
    id: "codex/item.web_search.started",
    kind: "tool-call",
    schemaId: webSearchStartedSchema.$id,
    rules: [
      { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
      { source: "/item/id", target: "id" },
      { source: "/item/id", target: "metadata.toolCallId" },
      { source: "/item/id", target: "metadata.toolCall.id" },
      { source: "/item/query", target: "metadata.toolCall.arguments.query" },
      { source: "/item/query", target: "content" },
      {
        source: "",
        target: "metadata.toolCall.toolType",
        transform: { name: "set-constant", options: { value: "web_search" } },
      },
      { source: "/type", target: "metadata.providerMessageType" },
      {
        source: "",
        target: "role",
        transform: { name: "set-constant", options: { value: "assistant" } },
      },
    ],
  },
  {
    provider: "codex",
    id: "codex/item.web_search.completed",
    kind: "tool-result",
    schemaId: webSearchCompletedSchema.$id,
    rules: [
      { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
      {
        source: "/item/id",
        target: "id",
        transform: { name: "append-suffix", options: { suffix: ":result" } },
      },
      { source: "/item/id", target: "metadata.toolCallId" },
      { source: "/item/query", target: "metadata.toolResult.query" },
      { source: "/item/results", target: "metadata.toolResult.output" },
      { source: "/item/results", target: "content", transform: "stringify" },
      {
        source: "",
        target: "metadata.toolResult.exitCode",
        transform: { name: "set-constant", options: { value: 0 } },
      },
      { source: "/type", target: "metadata.providerMessageType" },
      {
        source: "",
        target: "role",
        transform: { name: "set-constant", options: { value: "tool" } },
      },
    ],
  },
  {
    provider: "codex",
    id: "codex/response_item.function_call",
    kind: "tool-call",
    schemaId: functionCallSchema.$id,
    rules: [
      { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
      { source: "/payload/id", target: "id" },
      { source: "/payload/id", target: "metadata.toolCallId" },
      { source: "/payload/id", target: "metadata.toolCall.id" },
      { source: "/payload/name", target: "metadata.toolCall.name" },
      {
        source: "/payload/arguments",
        target: "metadata.toolCall.arguments",
        transform: "parse-json",
      },
      { source: "/payload/arguments", target: "content" },
      {
        source: "/payload/name",
        target: "metadata.toolCall.toolType",
        transform: "map-tool-name",
      },
      {
        source: "",
        target: "role",
        transform: { name: "set-constant", options: { value: "assistant" } },
      },
    ],
  },
  {
    provider: "codex",
    id: "codex/response_item.reasoning",
    kind: "reasoning",
    schemaId: reasoningResponseSchema.$id,
    rules: [
      { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
      { source: "/payload/id", target: "id" },
      { source: "/payload/type", target: "metadata.providerMessageType" },
      {
        source: "/payload/summary",
        target: "metadata.reasoning.summary",
        transform: "join-text-array",
      },
      {
        source: "/payload/summary",
        target: "content",
        transform: "join-text-array",
      },
      {
        source: "/payload/detail",
        target: "metadata.reasoning.detail",
        transform: "stringify",
      },
      {
        source: "",
        target: "metadata.reasoning.providerType",
        transform: { name: "set-constant", options: { value: "codex" } },
      },
      {
        source: "",
        target: "role",
        transform: { name: "set-constant", options: { value: "assistant" } },
      },
    ],
  },
  {
    provider: "codex",
    id: "codex/response_item.function_call_output",
    kind: "tool-result",
    schemaId: functionCallOutputSchema.$id,
    rules: [
      { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
      {
        source: "/payload/call_id",
        target: "id",
        transform: { name: "append-suffix", options: { suffix: ":result" } },
      },
      { source: "/payload/call_id", target: "metadata.toolCallId" },
      {
        source: "/payload/output",
        target: "metadata.toolResult.output",
        transform: "parse-json",
      },
      {
        source: "/payload/output",
        target: "content",
        transform: "stringify",
      },
      {
        source: "/payload/output",
        target: "metadata.toolResult.exitCode",
        transform: {
          name: "extract-json-property",
          options: {
            pointer: "/metadata/exit_code",
            transform: "exit-code",
          },
        },
      },
      {
        source: "/payload/output",
        target: "metadata.toolResult.durationMs",
        transform: {
          name: "extract-json-property",
          options: {
            pointer: "/metadata/duration_seconds",
            transform: "seconds-to-ms",
          },
        },
      },
      {
        source: "/payload/output",
        target: "metadata.toolResult.stdout",
        transform: {
          name: "extract-json-property",
          options: { pointer: "/output", transform: "stringify" },
        },
      },
      {
        source: "",
        target: "role",
        transform: { name: "set-constant", options: { value: "tool" } },
      },
    ],
  },
  {
    provider: "codex",
    id: "codex/item.agent_message.completed",
    kind: "message",
    schemaId: agentMessageCompletedSchema.$id,
    rules: [
      { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
      { source: "/item/id", target: "id" },
      { source: "/item/text", target: "content", transform: "stringify" },
      { source: "/item/type", target: "metadata.providerMessageType" },
      {
        source: "",
        target: "role",
        transform: { name: "set-constant", options: { value: "assistant" } },
      },
    ],
  },
  {
    provider: "codex",
    id: "codex/item.reasoning.completed",
    kind: "reasoning",
    schemaId: reasoningCompletedSchema.$id,
    rules: [
      { source: "/timestamp", target: "timestamp", transform: "iso-timestamp" },
      { source: "/item/id", target: "id" },
      { source: "/item/text", target: "content", transform: "stringify" },
      { source: "/item/type", target: "metadata.providerMessageType" },
      {
        source: "/item/text",
        target: "metadata.reasoning.summary",
        transform: "stringify",
      },
      {
        source: "",
        target: "metadata.reasoning.providerType",
        transform: { name: "set-constant", options: { value: "codex" } },
      },
      {
        source: "",
        target: "role",
        transform: { name: "set-constant", options: { value: "assistant" } },
      },
    ],
  },
];

export function registerCodexSchemas() {
  codexSchemas.forEach((schema) => schemaRegistry.addSchema(schema));
  codexMappings.forEach((mapping) => schemaRegistry.registerMapping(mapping));
}

export function resolveMappingId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const anyPayload = payload as Record<string, unknown>;
  const type = anyPayload.type;
  if (typeof type === "string" && type.startsWith("item.")) {
    const item = anyPayload.item as Record<string, unknown> | undefined;
    const itemType = typeof item?.type === "string" ? item?.type : undefined;
    if (itemType) {
      return `codex/item.${itemType}.${type.split(".")[1] ?? "started"}`;
    }
    return `codex/${type}`;
  }
  if (type === "response_item") {
    const payloadInner = anyPayload.payload as
      | Record<string, unknown>
      | undefined;
    const innerType =
      typeof payloadInner?.type === "string" ? payloadInner.type : undefined;
    if (innerType) {
      return `codex/response_item.${innerType}`;
    }
  }
  return null;
}
