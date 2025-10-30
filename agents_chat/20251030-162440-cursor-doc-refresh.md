## Summary

- Updated Cursor storage notes to reflect chatdata + generations transcript availability and cross-reference verification steps.
- Marked corresponding task complete in `tasks.md` to keep the plan in sync.

## Code Highlights

```markdown
docs/cursor-storage.md

- Documented `workbench.panel.aichat.view.aichat.chatdata` as the primary transcript source.
- Described loader flow that merges prompts, chat threads, generations metadata, and history artifacts.
- Added sqlite queries to verify Cursor conversation data exists before import.

tasks.md

- Checked off the Cursor documentation task with a dated note.
```

## Self-Tests

- Not run (documentation-only change).

## Risks & Follow-ups

- Need to capture Windows/Linux samples to confirm identical key paths.
- Consider backfilling integration tests once production chatdata fixtures are sanitised.
