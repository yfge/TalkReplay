## Summary

Add a "Prepare Release Draft" workflow for manual version tagging and draft release creation.

## Code Highlights

- `.github/workflows/prepare-release.yml`
  - `workflow_dispatch` with input `version` (e.g., `v1.2.3`).
  - Validates format; bumps `package.json` version; commits; tags and pushes.
  - Creates a draft GitHub Release; publishing it will trigger the Docker build workflow.

## Self-Tests

- Manually run the workflow in the Actions tab with `v0.0.2`.
- Verify: package.json version updated; tag pushed; draft release created.

## Touched Files

- .github/workflows/prepare-release.yml
