## Summary

- Bumped container builds to pnpm 9 so Docker installs honour the lockfile (v9) without regenerating dependencies, disabled Husky hooks during image builds via `HUSKY=0`, and added `--ignore-scripts` to install/prune to prevent prepare hooks from running inside the image.
- Declared `packageManager` in `package.json` and updated pnpm engine requirement; README quick start now notes the pnpm 9 prerequisite.

## Code Highlights

- `Dockerfile` now runs `corepack prepare pnpm@9 --activate` in build/runtime stages.
- `package.json` gains `"packageManager": "pnpm@9.12.0"` and `engines.pnpm >= 9` to keep local installs aligned.
- README quick-start snippet documents the pnpm requirement for developers.

## Self-Tests

- `pnpm test -- --runInBand`
  - Expected: existing Vitest suites pass.
  - Actual: all 4 test files (8 tests) succeeded.

## Risks / Follow-ups

- If pnpm upgrades again, update the `packageManager` field and Dockerfile in lockstep.
- Consider pinning pnpm version in CI to ensure consistent builds.

## Touched Files

- `Dockerfile`
- `package.json`
- `README.md`
