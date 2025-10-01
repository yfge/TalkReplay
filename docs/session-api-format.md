# Session API Normalisation

This note captures the target shape for the chat ingestion APIs so that Claude and Codex logs (and future providers) expose a consistent contract to the UI.

## Endpoints

- `POST /api/sessions`
  - Request body: `{ paths: ProviderPaths, previousSignatures: Record<string, number> }`
  - Response body: `{ sessions: ChatSessionSummary[], signatures: Record<string, number>, errors: ProviderImportError[] }`
- `POST /api/sessions/detail`
  - Request body: `{ id: string, paths: ProviderPaths }` (where `id` is an opaque Base64URL string produced by `encodeSessionId`)
  - Response body: `{ session?: ChatSession, error?: ProviderImportError }`

Both endpoints must always return JSON encoded in UTF-8. Errors should never throw HTML responses.

## Session Summary

```ts
interface ChatSessionSummary {
  id: string; // base64url encoded provider file identifier
  source: "claude" | "codex" | "gemini";
  topic: string; // short human friendly label, may be elided to 120 chars
  startedAt: string; // ISO 8601 timestamp (UTC)
  participants: string[]; // ordered unique list of speakers observed in the detail feed
  preview?: string; // first textual message (user or assistant) trimmed to 240 chars
  messageCount: number; // total number of messages (all kinds) in the detail feed
  metadata?: SessionMetadata;
}
```

## Session Detail

```ts
interface ChatSession {
  id: string; // same `id` used in summaries
  source: "claude" | "codex" | "gemini";
  topic: string;
  startedAt: string; // ISO 8601 timestamp (UTC)
  participants: string[];
  messages: ChatMessage[];
  metadata?: SessionMetadata;
}
```

### Message Structure

```ts
type ChatMessageKind =
  | "content" // natural language content
  | "reasoning" // model self-talk or summaries of hidden chains of thought
  | "tool-call" // assistant initiated tool usage
  | "tool-result" // tool/effect output
  | "system"; // provider generated system events

type ChatRole = "user" | "assistant" | "system" | "tool";

interface ChatMessage {
  id: string; // stable per provider log (fall back to `${role}-${index}`)
  role: ChatRole;
  kind: ChatMessageKind;
  timestamp: string; // ISO 8601 (UTC). For missing timestamps, fall back to session startedAt.
  content?: string | null; // present for textual messages. Null for tool-call / tool-result unless a provider delivers text.
  metadata?: MessageMetadata;
}
```

### Metadata expectations

```ts
interface MessageMetadata {
  tokens?: TokenUsage; // provider token accounting when reported
  toolCall?: {
    id?: string;
    name?: string;
    arguments?: unknown; // parsed JSON arguments. Fall back to raw string when parsing fails.
  };
  toolResult?: {
    callId?: string;
    output?: unknown; // structured result (object/string) returned by the tool; attach raw when JSON parse fails
  };
  reasoning?: {
    summary?: string; // high level bullet from provider (e.g. `payload.summary` for Codex)
    detail?: string | null; // decrypted/freeform text if available; `null` when provider redacts content
    providerType?: string; // original provider payload type (`reasoning`, `analysis`, ...)
  };
  providerMessageType?: string; // original provider payload discriminator (e.g. `response_item` type)
  raw?: unknown; // final escape hatch, only for debugging or detailed inspection
}
```

### Session metadata

```ts
interface SessionMetadata {
  sourceFile?: string; // absolute file path on disk
  sourceDir?: string; // provider root directory
  importedAt?: string; // ISO timestamp when imported
  tags?: string[];
  summary?: string; // short description extracted from provider instructions/session summaries
  language?: string;
  provider?: {
    model?: string;
    version?: string;
    temperature?: number;
    topP?: number;
    extra?: Record<string, unknown>;
  };
  format?: string; // e.g. `claude-jsonl`, `codex-jsonl`
  extra?: Record<string, unknown>;
}
```

## Provider normalisation rules

### Claude (`~/.claude/projects/**`) JSONL

- `summary` lines become `SessionMetadata.summary`.
- `message.content` entries are iterated per `content` item:
  - `type === "text"` ⇒ `ChatMessage.kind = "content"`, `content = text`.
  - `type === "tool_use"` ⇒ add a `tool-call` message with `metadata.toolCall` populated from `name` + `input`. Keep the original assistant response (if any) as a separate `content` message.
  - `type === "tool_result"` ⇒ emit a `tool-result` message attributed to `role: "tool"`.
- Token usage lives on `message.usage` and should be copied into the associated message metadata.

### Codex (`~/.codex/sessions/**`) JSONL

- `session_meta.payload.instructions` populates `SessionMetadata.summary`. The session topic falls back to the first `content` message.
- `response_item` payloads map as follows:
  - `type: "message"` ⇒ iterate `content` items. `input_text`/`output_text` become `content` messages. Other content types should be preserved in `metadata.providerMessageType` with a readable `content` fallback when possible.
  - `type: "reasoning"` ⇒ `kind: "reasoning"` with `metadata.reasoning.summary` populated from `payload.summary`. Encrypted blobs remain in `metadata.reasoning.detail = null` and the raw payload stored under `metadata.raw`.
  - `type: "function_call"` ⇒ `kind: "tool-call"`, `metadata.toolCall` built from `name` + parsed `arguments`.
  - `type: "function_call_output"` ⇒ `kind: "tool-result"`, `role: "tool"`, `metadata.toolResult.output` derived from the JSON payload (attempt to parse `output` string).
- `event_msg` with `payload.type === "agent_reasoning"` should become a `reasoning` message tied to the assistant.
- Ignore `token_count`/`turn_context` events for now (they are already summarised on the subsequent messages).

### Gemini (future)

- Must follow the same schema: map raw provider events into the standard `ChatMessage` kinds.
- Types extending the schema should first add fields to `MessageMetadata.extra` rather than introducing provider-specific top-level keys.

## UI rendering hints

- Use `ChatMessage.kind` to choose visual treatments (e.g., monospace panels for tool calls/results, subdued styling for reasoning).
- Always show at least one textual element to avoid empty panes – fall back to `SessionMetadata.summary` when no `content` message exists.
- When no assistant messages exist (e.g., Codex session aborted before a reply), keep the user request visible and show any reasoning/tool-call events that were captured.

## Compatibility

- Existing stored sessions must be migrated lazily: every loader should default missing `kind` to `content` and ensure IDs remain identical (encoded file path) so persisted state continues working.
- The client must tolerate unknown `kind` values by rendering them as plain text with a warning badge. Future providers can safely add new kinds provided they extend the enum and update the UI.
