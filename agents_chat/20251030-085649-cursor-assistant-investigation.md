## Summary

- Searched Cursor's LevelDB cache and renderer logs to locate assistant transcript data but found only command registration events; updated `docs/cursor-storage.md` with the findings and remaining gaps.

## Code Highlights

```text
docs/cursor-storage.md:55
```

## Self-Tests

- Tests not run (documentation update only).

## Risks & Follow-Up

- Need a reliable way to trigger `debug.logComposer` or hook the renderer to capture streamed assistant responses.
- Investigate whether Windows/Linux builds store richer data or if Cursor's cloud logs are required.
