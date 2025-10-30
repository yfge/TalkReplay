## Summary

- Surveyed Cursor workspace storage to confirm prompt retention but absence of assistant transcript data; documented findings in `docs/cursor-storage.md`.
- Added synthetic Cursor fixtures (composer session, prompt history, history entries) and flagged the reconstruction strategy in `docs/data-sources.md` and READMEs.

## Code Highlights

```text
docs/cursor-storage.md:1
fixtures/cursor/composer-session.json:1
docs/data-sources.md:35
README.md:266
README.zh.md:264
```

## Self-Tests

- Tests not run (documentation + fixtures update).

## Risks & Follow-Up

- Need to capture real assistant text, potentially via `debug.logComposer` or LevelDB extraction.
- Adapter implementation must map history artifacts back to prompts without duplicating large file bodies in memory.
