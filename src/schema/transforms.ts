import { parseUnifiedDiff } from "@/lib/diff";
import type { ChatMessage } from "@/types/chat";

import type { TransformDefinition, TransformName } from "./types";

interface TransformContext {
  root: unknown;
  target: Partial<ChatMessage>;
}

type TransformFn = (
  value: unknown,
  options: Record<string, unknown> | undefined,
  context: TransformContext,
) => unknown;

function toIsoTimestamp(value: unknown): string {
  if (typeof value === "string") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  return new Date().toISOString();
}

const maybeNumber = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

const transforms: Record<TransformName, TransformFn> = {
  "iso-timestamp": (value) => toIsoTimestamp(value),
  "exit-code": (value) => maybeNumber(value),
  "duration-ms": (value) => maybeNumber(value),
  "seconds-to-ms": (value) => {
    const num = maybeNumber(value);
    return typeof num === "number" ? Math.round(num * 1000) : undefined;
  },
  stringify: (value) => {
    if (value == null) return null;
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return "[unserialisable]";
    }
  },
  "parse-json": (value) => {
    if (typeof value !== "string") return value;
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed;
    } catch {
      return value;
    }
  },
  "parse-diff": (value) => {
    if (typeof value !== "string") return value;
    try {
      return parseUnifiedDiff(value);
    } catch {
      return value;
    }
  },
  identity: (value) => value,
  "set-constant": (_value, options) => options?.value,
  coalesce: (_value, options, context) => {
    const paths = Array.isArray(options?.paths)
      ? (options?.paths as string[])
      : [];
    for (const pointer of paths) {
      const candidate: unknown = getByPointer(context.root, pointer);
      if (typeof candidate === "string") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return candidate;
      }
      if (typeof candidate === "number") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return candidate;
      }
      if (typeof candidate === "boolean") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return candidate;
      }
      if (Array.isArray(candidate)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return candidate;
      }
      if (candidate && typeof candidate === "object") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return candidate;
      }
    }
    return undefined;
  },
  "command-tool-type": (value) => {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim().startsWith("bash") ? "bash" : "command_execution";
    }
    return value ?? "command_execution";
  },
  "map-tool-name": (value, _options, context) => {
    const root = context.root as Record<string, unknown> | undefined;
    const item =
      root && typeof root === "object"
        ? (root.item as Record<string, unknown> | undefined)
        : undefined;
    const tool = typeof item?.tool === "string" ? item.tool : undefined;
    const server = typeof value === "string" ? value : undefined;
    if (server && tool) return `${server}.${tool}`;
    if (tool) return tool;
    return server ?? value;
  },
  "collect-file-change-paths": (value) => {
    if (!Array.isArray(value)) return undefined;
    const paths: string[] = [];
    for (const entry of value) {
      if (entry && typeof entry === "object") {
        const pathVal = (entry as { path?: unknown }).path;
        if (typeof pathVal === "string") paths.push(pathVal);
      }
    }
    return paths.length > 0 ? paths : undefined;
  },
  "extract-json-property": (value, options) => {
    if (!options?.property || typeof options.property !== "string") {
      return undefined;
    }
    if (value && typeof value === "object") {
      return (value as Record<string, unknown>)[options.property];
    }
    return undefined;
  },
  "append-suffix": (value, options) => {
    const suffix = typeof options?.suffix === "string" ? options.suffix : "";
    if (typeof value === "string") {
      return `${value}${suffix}`;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return `${value}${suffix}`;
    }
    if (value == null) {
      return suffix || null;
    }
    try {
      return `${JSON.stringify(value)}${suffix}`;
    } catch {
      return suffix || null;
    }
  },
};

export function applyTransform(
  transform: TransformName | TransformDefinition | undefined,
  value: unknown,
  context: TransformContext,
): unknown {
  if (!transform) {
    return value;
  }
  const def: TransformDefinition =
    typeof transform === "string" ? { name: transform } : transform;
  const fn = transforms[def.name];
  if (!fn) {
    return value;
  }
  return fn(value, def.options, context);
}

function unescapePointerToken(token: string): string {
  return token.replace(/~1/g, "/").replace(/~0/g, "~");
}

export function getByPointer(source: unknown, pointer: string): unknown {
  if (!pointer) return source;
  const segments = pointer.split("/");
  let current: unknown = source;
  for (const segment of segments) {
    if (segment === "") {
      continue;
    }
    if (current == null || typeof current !== "object") {
      return undefined;
    }
    const key = unescapePointerToken(segment);
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

export function setDeepValue(
  target: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const segments = path.split(".");
  let current: Record<string, unknown> = target;
  for (let i = 0; i < segments.length; i++) {
    const key = segments[i];
    if (i === segments.length - 1) {
      current[key] = value;
      return;
    }
    if (current[key] == null || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
}
