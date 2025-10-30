# Cursor Desktop Storage Survey

This note captures where the macOS Cursor app persists data that we can reuse for ingestion and what is **not** written locally by default.

## High-level layout

| Purpose                    | Location (macOS)                                                                        | Notes                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Workspace state (per repo) | `~/Library/Application Support/Cursor/User/workspaceStorage/<workspace-id>/state.vscdb` | SQLite DB following VS Code conventions                                                                    |
| Prompt history             | `state.vscdb` key `aiService.prompts`                                                   | JSON array `[{"text": "...", "commandType": 4}, ...]` where `commandType=4` marks free-form chat prompts   |
| Generation metadata        | `state.vscdb` key `aiService.generations`                                               | Optional array storing prompt UUIDs + timestamps (`type: "composer"`)                                      |
| Composer list              | `state.vscdb` key `composer.composerData`                                               | Tracks tab titles, IDs, and timestamps but **no message bodies**                                           |
| Per-file history snapshots | `~/Library/Application Support/Cursor/User/History/<hash>/`                             | Each directory contains `entries.json` + companion files (`*.py`, `*.ts`, etc.) that mirror generated code |
| Global configuration       | `~/Library/Application Support/Cursor/User/globalStorage/storage.json`                  | Mirrors VS Code `memento` data; no chat transcripts discovered                                             |
| Electron localStorage      | `~/Library/Application Support/Cursor/Local Storage/leveldb/`                           | LevelDB with environment metadata; no reproducible chat payloads observed                                  |

## Findings

1. **User prompts are persisted**. `aiService.prompts` stores the raw text typed into the chat/composer along with a `commandType` discriminator. This is enough to populate the **user** side of the conversation schema.
2. **Assistant responses are _not_ archived** in any obvious SQLite or JSON file. Neither `composer.composerData` nor `aiService.generations` contains the reply content.
3. Cursor does write code artifacts produced by the assistant in `User/History/<hash>/`:
   - `entries.json` lists the files touched in a session with millisecond timestamps.
   - Each `entries[].id` maps to a neighbouring file containing the assistant-authored code snapshot.
   - Example: see `fixtures/cursor/history-entry.json`.
4. Renderer and telemetry logs (`logs/<timestamp>/window*/renderer.log`, `telemetry.log`, etc.) record command palette actions but not the streamed chat payloads.

## Recreating assistant messages

Because Cursor does not persist the free-form assistant text, we need to synthesise a message stream for normalisation. The proposed approach:

1. Read prompts from `aiService.prompts` (or the dated entries in `aiService.generations`) to reconstruct the **user** messages.
2. For each prompt, locate the most recent history snapshot(s) in `User/History/<hash>/entries.json` and read the corresponding files. Treat the diff/code block as the assistant response body.
3. Wrap the code artifact in a fenced block (language inferred from file extension) and attach metadata such as the source file path and timestamp.

```ts
interface CursorConversation {
  composerId: string;
  prompts: Array<{ timestamp: string; text: string }>;
  artifacts: Array<{ path: string; timestamp: string; content: string }>;
}
```

The synthetic fixture `fixtures/cursor/composer-session.json` demonstrates this mapping and can drive schema design until Cursor exposes true chat transcripts.

## Outstanding questions

- Cursor offers a `debug.logComposer` palette command; capturing its output might expose the full transcript. Worth exploring for future tooling.
- LevelDB under `Local Storage/` might cache webview data for the composer. A focused LevelDB extraction could reveal the streamed assistant text.
- We should confirm whether the Windows build stores prompts in the same SQLite keys or diverges.

### Latest investigation (2025-10-30)

- Searched the Electron LevelDB cache at `Local Storage/leveldb` for known prompt strings and composer identifiers; no chat payloads were present.
- Inspected renderer logs around `debug.logComposer` — only registration messages were emitted, with no dump of composer state.
- Conclusion: neither LevelDB nor existing logs contain assistant responses. Capturing real output will likely require invoking `debug.logComposer` manually and recording its console output or instrumenting the renderer bundle.
