# Release Process

This project ships through two GitHub Actions workflows:

1. **Prepare Release Draft** (`.github/workflows/prepare-release.yml`)  
   Creates a version bump PR, generates release notes under `docs/releases/`, and opens a draft GitHub release.
2. **Build and Push Docker on Release** (`.github/workflows/build-on-release.yml`)  
   Builds multi-arch Docker images for both GitHub Container Registry and Docker Hub (optional) when a release is published.

## Prerequisites

- Ensure Conventional Commit history is up to date – release notes aggregate commit subjects between tags.
- Optionally configure the following secrets/variables for Docker Hub publishing:
  - `DOCKERHUB_USER`, `DOCKERHUB_TOKEN`
  - `IMAGE_NAME` (repository variable, defaults to `talk-replay`)
- GitHub Container Registry publishing uses the built-in `GITHUB_TOKEN`.

## Step-by-step

1. **Kick off the draft preparation workflow**
   - Navigate to _Actions → Prepare Release Draft → Run workflow_.
   - Provide the new version, e.g. `v0.1.0`.
   - The workflow will:
     - install dependencies via pnpm, lint, and run the test suite;
     - update `package.json` version;
     - generate `docs/releases/<tag>.md` summarising commits since the previous tag;
     - open a PR `release/<tag>` containing the changes;
     - create a draft GitHub release pointing to the PR head commit.

2. **Review and merge**
   - Inspect the generated PR and release notes.
   - Add any additional context to the draft release body if desired.
   - Merge the PR into `main`.

3. **Publish the release**
   - Once the PR is merged, update the draft release (if necessary) and press **Publish**.
   - Publishing triggers the Docker build workflow which pushes:
     - `ghcr.io/<org>/talkreplay:<tag>` and `:latest`;
     - `DOCKERHUB_USER/IMAGE_NAME:<tag>` and `:latest` when credentials are present.

4. **Verify artefacts**
   - Check the “Build and Push Docker on Release” workflow summary for image locations.
   - Pull and smoke test the published images as needed.

## First release checklist

- [ ] Run `Prepare Release Draft` with target version `v0.1.0`.
- [ ] Review the generated PR and ensure `docs/releases/v0.1.0.md` captures highlights.
- [ ] Merge the PR, publish the draft release, and confirm Docker images were pushed.

Document the outcome in the latest `agents_chat` record together with any follow-up tasks.
