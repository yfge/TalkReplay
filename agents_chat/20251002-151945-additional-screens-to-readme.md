## Summary

Move four additional screenshots from the project root into `docs/assets/`, rename them to neutral names, and include them in both READMEs under a new "More Screens" section.

## Changes

- Moved and renamed:
  - `Screenshot 2025-10-02 at 23.10.14.png` → `docs/assets/extra-1.png`
  - `Screenshot 2025-10-02 at 23.10.29.png` → `docs/assets/extra-2.png`
  - `Screenshot 2025-10-02 at 23.11.14.png` → `docs/assets/extra-3.png`
  - `Screenshot 2025-10-02 at 23.11.33.png` → `docs/assets/extra-4.png`
- Updated sections in:
  - `README.md` (More Screens)
  - `README.zh.md`（更多界面）

## Code Highlights

- Append "More Screens/更多界面" sections with `extra-1..4.png` references; no runtime code changes.

## Self-Tests

```bash
rg -n "extra-1|extra-2|extra-3|extra-4" README.md README.zh.md
```

Expect both READMEs to reference new extra screenshots.

## Notes

If we want descriptive names later (e.g., `provider-setup-dialog.png`), share which image shows which feature and I can rename accordingly.
