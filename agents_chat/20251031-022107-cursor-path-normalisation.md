## Summary

- Investigated why Cursor sessions failed to appear in the UI despite successful ingestion and reproduced the issue by simulating mixed-case workspace metadata.
- Normalised workspace and artifact paths before matching so case discrepancies (macOS/Windows) no longer prevent session pairing, with graceful case-insensitive fallback.
- Added a regression test that mutates the fixture workspace URI casing to guard against future breaks.

## Code Highlights

```ts
// src/lib/providers/cursor.ts#L644
const workspacePrefix =
  workspacePath === "/"
    ? "/"
    : workspacePath.endsWith("/")
      ? workspacePath
      : `${workspacePath}/`;
const workspacePathLower = workspacePath.toLowerCase();
const workspacePrefixLower = workspacePrefix.toLowerCase();
// ... ensure candidate paths are compared with both exact and case-insensitive checks
```

```ts
// src/lib/providers/cursor.test.ts#L96
it("matches artifacts when workspace casing differs from resource paths", async () => {
  const workspaceJsonPath = path.join(
    cursorFixturesRoot,
    "User",
    "workspaceStorage",
    "sample-workspace",
    "workspace.json",
  );
  const original = await readFile(workspaceJsonPath, "utf8");
  try {
    const workspace = JSON.parse(original) as { folder?: string };
    workspace.folder = workspace.folder?.replace(
      "file:///Users",
      "file:///USERS",
    );
    await writeFile(
      workspaceJsonPath,
      `${JSON.stringify(workspace, null, 2)}\n`,
      "utf8",
    );
    const result = await loadCursorSessions(cursorFixturesRoot, {}, new Map());
    expect(result.sessions.length).toBeGreaterThan(0);
  } finally {
    await writeFile(workspaceJsonPath, original, "utf8");
  }
});
```

## Self-Tests

- `pnpm vitest run src/lib/providers/cursor.test.ts`
- `pnpm lint`
- `pnpm test`

## Risks & Follow-Up

- Case-insensitive matching could mask genuinely distinct paths on case-sensitive filesystems, though Cursor paths are unlikely to differ only by case; monitor for edge reports.
- Consider normalising and storing comparer-friendly paths alongside originals to avoid repeated conversions in hot paths.

## References

- `src/lib/providers/cursor.ts`
- `src/lib/providers/cursor.test.ts`
- `tasks.md`
