# Cursor Desktop Storage Survey

This note captures where the macOS Cursor app persists data that we can reuse for ingestion and what is **not** written locally by default.

## High-level layout

| Purpose                    | Location (macOS)                                                                        | Notes                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Workspace state (per repo) | `~/Library/Application Support/Cursor/User/workspaceStorage/<workspace-id>/state.vscdb` | SQLite DB following VS Code conventions                                                                    |
| Prompt history             | `state.vscdb` key `aiService.prompts`                                                   | JSON array `[{"text": "...", "commandType": 4}, ...]` where `commandType=4` marks free-form chat prompts   |
| Generation metadata        | `state.vscdb` key `aiService.generations`                                               | Maps prompt UUIDs to assistant payloads (`content`, `rawMessage`) and timestamps                           |
| Chat view state            | `state.vscdb` key `workbench.panel.aichat.view.aichat.chatdata`                         | Canonical chat threads with `messages[]` (user + assistant), used for the UI conversation timeline         |
| Composer list              | `state.vscdb` key `composer.composerData`                                               | Tracks tab titles, IDs, and timestamps but **no message bodies**                                           |
| Per-file history snapshots | `~/Library/Application Support/Cursor/User/History/<hash>/`                             | Each directory contains `entries.json` + companion files (`*.py`, `*.ts`, etc.) that mirror generated code |
| Global configuration       | `~/Library/Application Support/Cursor/User/globalStorage/storage.json`                  | Mirrors VS Code `memento` data; no chat transcripts discovered                                             |
| Electron localStorage      | `~/Library/Application Support/Cursor/Local Storage/leveldb/`                           | LevelDB with environment metadata; no reproducible chat payloads observed                                  |

## Findings

1. **User prompts are persisted**. `aiService.prompts` stores the raw text typed into the chat/composer along with a `commandType` discriminator. This is enough to populate the **user** side of the conversation schema.
2. **Assistant responses _are now present_** in the `workbench.panel.aichat.*.chatdata` tree and mirrored in `aiService.generations`. Each composer/chat thread keeps a `messages` array combining user prompts and assistant completions (with markdown payloads). `aiService.generations` links the prompt UUIDs to richer metadata (timestamps, truncation flags, streamed chunks).
3. Cursor still writes code artifacts produced by the assistant in `User/History/<hash>/`:
   - `entries.json` lists the files touched in a session with millisecond timestamps.
   - Each `entries[].id` maps to a neighbouring file containing the assistant-authored code snapshot.
   - Example: see `fixtures/cursor/history-entry.json`.
4. Renderer and telemetry logs (`logs/<timestamp>/window*/renderer.log`, `telemetry.log`, etc.) record command palette actions but remain unnecessary for transcript reconstruction.

## Recreating assistant messages

Cursor's desktop build now keeps both sides of the conversation. Our loader stitches the following sources:

1. Read prompts from `aiService.prompts` to capture the raw text and composer IDs.
2. Fetch the associated chat thread from `workbench.panel.aichat.view.aichat.chatdata`. Messages already arrive in chronological order with roles (`"user" | "assistant"`), markdown content, and ISO timestamps.
3. Use `aiService.generations` as a secondary index keyed by `promptUuid` to add timing metadata and recover any assistant messages the chatdata snapshot missed (e.g. partial streams).
4. When a generation references code artifacts, cross-check `User/History/<hash>/entries.json` to embed relevant files as attachments in our unified schema.

```ts
interface CursorConversation {
  composerId: string;
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    timestamp: string;
    content: string;
    metadata?: Record<string, unknown>;
  }>;
  artifacts: Array<{ path: string; timestamp: string; content: string }>;
}
```

The fixture `fixtures/cursor/composer-session.json` mirrors the shape emitted by the loader. `aiService.generations` contributes timing plus streaming metadata, while `chatdata` offers the rendered markdown used by the UI.

### Verification checklist

Run the following queries against `state.vscdb` to ensure the expected Cursor structures exist before importing a workspace:

```bash
sqlite3 state.vscdb "
SELECT rowid, key, length(value)
FROM ItemTable
WHERE key IN (
  'aiService.prompts',
  'aiService.generations',
  'workbench.panel.aichat.view.aichat.chatdata'
);
"
```

Inspect the chat payload with:

```bash
sqlite3 state.vscdb "
.param set :composer 'workbench.panel.aichat.view.aichat.chatdata'
SELECT json_tree.key, json_tree.value
FROM ItemTable, json_tree(ItemTable.value)
WHERE ItemTable.key = :composer
  AND json_tree.path LIKE '%$.threads[%]%'
LIMIT 10;
"
```

If `chatdata` is absent (older Cursor build), fall back to `aiService.generations` and the history snapshots:

```bash
sqlite3 state.vscdb "
SELECT rowid, key, json_extract(value, '$[0].rawMessage.content') AS firstAssistantReply
FROM ItemTable
WHERE key = 'aiService.generations'
LIMIT 5;
"
```

## Outstanding questions

- Confirm whether Windows/Linux builds mirror the same `chatdata` keys or squash multiple composers into a single blob.
- Determine how far back `chatdata` retains history before compaction and whether `aiService.generations` ever diverges.
- Evaluate whether LevelDB still contains supplemental context (e.g. inline images) not exposed in the chat arrays.

### Latest investigation (2025-10-30)

- Dumped `state.vscdb` via `sqlite3` and verified `workbench.panel.aichat.view.aichat.chatdata` contains both user prompts and assistant markdown.
- Cross-referenced `aiService.generations` entries with loader output to ensure UUID/timestamp alignment.
- Confirmed code artifacts in `User/History/<hash>/` are supplemental; primary assistant replies now reside in the chatdata structure.
