# Data Sources & Mappings

This document captures the normalisation rules mapping provider-native logs to the unified schema. For authoring guidelines, versioning rules, and testing expectations see [schema-contribution.md](./schema-contribution.md).

- Timestamps → ISO 8601
- Roles → `user|assistant|system|tool`
- Message kinds → `content|reasoning|tool-call|tool-result|system`
- Preserve raw event in `message.metadata.raw`

## Codex CLI

- `response_item.type=reasoning` → `kind=reasoning`, `metadata.reasoning.summary`
- `function_call` → `kind=tool-call`, `toolCall.{id,name,arguments,toolType}`
- `function_call_output` → `kind=tool-result`, `toolResult.{callId,stdout,exitCode,durationMs,output}`
- `response_item.message.*` → schema splits into `input_text`/`output_text` content and `tool_use`/`tool_result` events so normaliser emits the same chunks as the legacy adapter.
- Exec JSON `item.*`:
  - `command_execution` → tool-call/result pair; aggregated stdout; `exitCode`
  - `file_change` → tool-call/result pair; `toolResult.filesChanged`
  - `mcp_tool_call` → tool-call/result; `toolType=mcp`

## Claude Code

- Schema mappings (`claude/message.*`) cover:
  - `message.text` → `kind=content` for plain string payloads.
  - `text` → `kind=content`
  - `tool_use` → `kind=tool-call`, `toolCall.{id,name,arguments,toolType}` (Bash→bash)
  - `tool_result` → `kind=tool-result`, `toolResult.{callId,output,stdout,stderr}`
- When `NEXT_PUBLIC_SCHEMA_NORMALISER=1`, the Claude adapter normalises via these mappings before falling back to legacy parsing.

## Schema extensions (v1)

- `toolCall.toolType?: string`
- `toolResult` optional fields: `exitCode`, `durationMs`, `stdout`, `stderr`, `filesChanged`, `diff`

## Cursor (Desktop app)

- Local assets live under `~/Library/Application Support/Cursor/` on macOS (or `%APPDATA%\Cursor` on Windows, `~/.config/Cursor` on Linux). Workspaces appear as hashed directories in `User/workspaceStorage/<workspace-id>/`.
- Chat prompts are stored in the workspace SQLite store (`state.vscdb`) under the key `aiService.prompts`. Values serialise to a JSON array of `{ "text": string, "commandType": number }`, where `commandType=4` marks free-form chat requests.
- Editor history is captured in `User/History/<session-hash>/entries.json`, mapping `resource` URIs to `entries` that list snapshot IDs with millisecond timestamps. Each snapshot lives beside the manifest as a plain-text file (`*.py`, `*.ts`, etc.).
- Cursor responses are not captured alongside `aiService.prompts`; further research must correlate prompts with streamed output logs before the adapter can emit assistant messages.
- Default auto-detected paths now include `/app/data/cursor` for Docker images so containers mirror desktop directory layout.
- See [cursor-storage.md](./cursor-storage.md) for a deep dive and a plan to reconstruct messages from prompts + history artifacts.
