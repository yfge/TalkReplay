const isBrowser = typeof window !== "undefined";
const globalBuffer: typeof Buffer | undefined =
  typeof globalThis !== "undefined" &&
  typeof (globalThis as { Buffer?: typeof Buffer }).Buffer !== "undefined"
    ? (globalThis as { Buffer: typeof Buffer }).Buffer
    : undefined;

function toBase64Url(value: string): string {
  return value.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0 ? 0 : 4 - (normalized.length % 4);
  return normalized.padEnd(normalized.length + padding, "=");
}

function encodeWithBrowser(value: string): string {
  const utf8 = encodeURIComponent(value).replace(
    /%([0-9A-F]{2})/g,
    (_: string, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)),
  );
  const base64 = window.btoa(utf8);
  return toBase64Url(base64);
}

function decodeWithBrowser(value: string): string {
  const base64 = fromBase64Url(value);
  const binary = window.atob(base64);
  const percentEncoded = Array.from(binary)
    .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
    .join("");
  return decodeURIComponent(percentEncoded);
}

export function encodeSessionId(value: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Session id value must be a non-empty string");
  }

  if (!isBrowser && globalBuffer) {
    return globalBuffer.from(value, "utf8").toString("base64url");
  }

  if (isBrowser) {
    return encodeWithBrowser(value);
  }

  throw new Error("encodeSessionId is not supported in this environment");
}

export function decodeSessionId(value: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error("Session id value must be a non-empty string");
  }

  if (!isBrowser && globalBuffer) {
    return globalBuffer.from(value, "base64url").toString("utf8");
  }

  if (isBrowser) {
    return decodeWithBrowser(value);
  }

  throw new Error("decodeSessionId is not supported in this environment");
}

export function ensureSessionId(
  sessionId: string,
  sourceFile?: string,
): string {
  if (!sourceFile) {
    return encodeSessionId(sessionId);
  }
  try {
    const decoded = decodeSessionId(sessionId);
    if (decoded === sourceFile) {
      return sessionId;
    }
  } catch {
    // Ignore decode failures, we will re-encode below.
  }
  return encodeSessionId(sourceFile);
}
