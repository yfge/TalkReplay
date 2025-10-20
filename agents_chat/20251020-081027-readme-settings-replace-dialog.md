## Summary

Replaced references to the old "Provider Setup" dialog in README with the current Settings page. Updated first-run guidance and Docker/host instructions to direct users to Settings for configuring provider directories.

## Code Highlights

```md
// README.md

- The first run launches a provider setup dialog...

* On first run, open Settings to configure provider directories...

- Use the in-app Provider Setup dialog to confirm the mapped `/app/data/**`...

* Open Settings to confirm the mapped `/app/data/**`...

- ...point the Provider Setup dialog to any readable directory...

* ...use the Settings page to point to any readable directory...

- [Provider Setup Dialog] screenshot alt text

* [Settings – Provider Paths]
```

## Self-Tests

- Render README and scan the Getting Started / Docker sections to ensure the wording is consistent with the UI.
- Verify the screenshot reference still renders (reuse existing image for now).

## Risks, Blockers, Follow-ups

- Consider replacing the screenshot with one from the Settings page in a future docs refresh.
