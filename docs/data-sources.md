# Data Sources & Mappings

This document captures the normalisation rules mapping provider-native logs to the unified schema.

- Timestamps → ISO 8601
- Roles → `user|assistant|system|tool`
- Message kinds → `content|reasoning|tool-call|tool-result|system`
- Preserve raw event in `message.metadata.raw`

## Codex CLI

- `response_item.type=reasoning` → `kind=reasoning`, `metadata.reasoning.summary`
- `function_call` → `kind=tool-call`, `toolCall.{id,name,arguments,toolType}`
- `function_call_output` → `kind=tool-result`, `toolResult.{callId,stdout,exitCode,durationMs,output}`
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
