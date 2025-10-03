## Summary

Enable automatic release notes generation when creating the draft release.

## Code Highlights

- In `.github/workflows/prepare-release.yml`, set `generate_release_notes: true` on the `actions/create-release` step so GitHub composes release notes from commits and merged PRs between tags.

## Self-Tests

- Run the workflow with a new tag (e.g., `v0.0.3`); open the draft release and verify that GitHub populated the notes automatically.

## Touched Files

- .github/workflows/prepare-release.yml
