## Summary

Remove legacy screenshots and rename the latest UI images with descriptive filenames. Update READMEs to reference the new names.

## Changes

- Removed old images:
  - `docs/assets/session-explorer.png`
  - `docs/assets/conversation-detail.png`
- Renamed new images:
  - `docs/assets/ui1.png` → `docs/assets/app-home.png`
  - `docs/assets/ui2.png` → `docs/assets/chat-detail.png`
  - `docs/assets/ui3.png` → `docs/assets/project-filter.png`
- Updated README previews to use the new filenames.

## Code Highlights

- Replace old image references in both READMEs with `app-home.png`, `chat-detail.png`, `project-filter.png`.

## Self-Tests

```bash
rg -n "ui1|ui2|ui3|session-explorer|conversation-detail" README.md README.zh.md
```

Expected: READMEs reference only `app-home.png`, `chat-detail.png`, `project-filter.png`.

## Touched Files

- README.md
- README.zh.md
- docs/assets/app-home.png
- docs/assets/chat-detail.png
- docs/assets/project-filter.png

## Notes

Additional screenshots present in project root (if any) can be moved on request.
