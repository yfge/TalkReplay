import { nanoid } from "nanoid";

import type { ChatMessage, ChatMessageKind, ChatRole } from "@/types/chat";

import { schemaRegistry } from "./registry";
import { applyTransform, getByPointer, setDeepValue } from "./transforms";
import type {
  MappingCondition,
  MappingRule,
  NormalisedKind,
  SchemaMapping,
} from "./types";

export interface NormaliseResult {
  message: ChatMessage;
  mapping: SchemaMapping;
}

function evaluateConditions(
  conditions: MappingCondition[] | undefined,
  payload: unknown,
): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }
  return conditions.every((condition) => {
    const value = getByPointer(payload, condition.path);
    return value === condition.equals;
  });
}

function applyRules(
  rules: MappingRule[],
  payload: unknown,
  target: Record<string, unknown>,
): void {
  for (const rule of rules) {
    if (!evaluateConditions(rule.when, payload)) {
      continue;
    }
    const rawValue = getByPointer(payload, rule.source);
    const transformed = applyTransform(rule.transform, rawValue, {
      root: payload,
      target,
    });
    setDeepValue(target, rule.target, transformed);
  }
}

function defaultRoleForKind(kind: NormalisedKind): ChatRole {
  switch (kind) {
    case "tool-call":
      return "assistant";
    case "tool-result":
    case "system-as-tool":
      return "tool";
    case "reasoning":
      return "assistant";
    case "message":
      return "assistant";
    default:
      return "assistant";
  }
}

function mapKind(kind: NormalisedKind): ChatMessageKind {
  switch (kind) {
    case "tool-call":
      return "tool-call";
    case "tool-result":
    case "system-as-tool":
      return "tool-result";
    case "reasoning":
      return "reasoning";
    case "message":
      return "content";
    default:
      return "content";
  }
}

function serialiseContent(value: unknown): string | null | undefined {
  if (value == null) {
    return value === null ? null : undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserialisable]";
  }
}

function finaliseMessage(partial: Record<string, unknown>): ChatMessage {
  const id =
    typeof partial.id === "string" && partial.id.length > 0
      ? partial.id
      : nanoid();
  const timestamp =
    typeof partial.timestamp === "string" && partial.timestamp.length > 0
      ? partial.timestamp
      : new Date().toISOString();
  const role = (partial.role as ChatRole) ?? "assistant";
  const kind = (partial.kind as ChatMessageKind) ?? "content";
  const content = serialiseContent(partial.content);
  const metadata =
    partial.metadata && typeof partial.metadata === "object"
      ? (partial.metadata as ChatMessage["metadata"])
      : undefined;

  const message: ChatMessage = {
    id,
    role,
    kind,
    timestamp,
  };

  if (content !== undefined) {
    message.content = content;
  }
  if (metadata !== undefined) {
    message.metadata = metadata;
  }

  return message;
}

export function normalise(
  mappingId: string,
  payload: unknown,
): NormaliseResult | null {
  const mapping = schemaRegistry.getMapping(mappingId);
  if (!mapping) {
    return null;
  }
  const validator = schemaRegistry.getValidator(mapping.schemaId);
  if (!validator) {
    return null;
  }
  const valid = validator(payload);
  if (!valid) {
    return null;
  }

  const partial: Record<string, unknown> = {
    kind: mapKind(mapping.kind),
    role: defaultRoleForKind(mapping.kind),
  };

  applyRules(mapping.rules, payload, partial);

  const message = finaliseMessage(partial);
  return { message, mapping };
}
