## Summary

Move newly provided screenshots (ui1.png, ui2.png, ui3.png) into `docs/assets/` and update both English and Chinese READMEs to reference the latest UI images.

## Changes

- Moved files: `ui1.png`, `ui2.png`, `ui3.png` → `docs/assets/`
- Updated README interface preview sections to show three images vertically.

## Code Highlights

- README references changed to `./docs/assets/app-home.png`, `chat-detail.png`, `project-filter.png`.
- No code; only documentation and assets relocation.

## Self-Tests

Commands:

```bash
rg -n "ui1|ui2|ui3|session-explorer|conversation-detail" README.md README.zh.md
```

Expected: READMEs reference `./docs/assets/ui1.png`, `ui2.png`, `ui3.png`; old `session-explorer.png` and `conversation-detail.png` are no longer referenced.

## Files touched

- README.md
- README.zh.md
- docs/assets/ui1.png
- docs/assets/ui2.png
- docs/assets/ui3.png

## Notes / Follow-up

- If additional screens are needed (e.g., Project filter, detail with images), share them and I will add a short captioned section.
