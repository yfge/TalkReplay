## Summary

Set up GitHub Actions by referencing ai-shifu workflows: CI (lint/test/build), Prettier check, and Docker build on release.

## Code Highlights

- `.github/workflows/ci.yml`: pnpm-based install, lint, test:ci, build.
- `.github/workflows/prettier-check.yml`: runs `pnpm format` on PRs and pushes.
- `.github/workflows/build-on-release.yml`: on release published, build multi-arch Docker image and push to Docker Hub if secrets exist.

## Self-Tests

- Run "Actions" tab on a branch PR – CI & Prettier should run.
- Create a draft release then publish – Docker workflow should build images (requires `DOCKERHUB_USER`/`DOCKERHUB_TOKEN`).

## Touched Files

- .github/workflows/ci.yml
- .github/workflows/prettier-check.yml
- .github/workflows/build-on-release.yml
