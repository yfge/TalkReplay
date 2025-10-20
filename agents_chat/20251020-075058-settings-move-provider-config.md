## Summary

Moved provider directory configuration into the `/settings` page and removed the modal-based Provider Setup dialog. The header now links to `/settings`, and empty-state prompts route users to Settings for configuration. This consolidates preferences per the request.

## Code Highlights

```diff
- src/components/preferences/provider-setup-dialog.tsx (removed)
+ src/app/settings/page.tsx
+   - Adds provider paths form (Claude/Codex/Gemini) with basic path validation
+   - Saves via usePreferencesStore (setProviderPath/clearProviderPath/completeSetup)
+   - Includes Theme/Locale toggles

* src/components/layout/app-shell.tsx
  - Removes onConfigureProviders prop and the modal trigger button
  - Keeps header buttons for Stats and Settings

* src/App.tsx
  - Removes ProviderSetupDialog usage and state
  - Always refreshes sessions when list is empty
  - Passes onConfigureProviders to ChatList as a router push to `/settings`
```

Touched files:

- src/app/settings/page.tsx
- src/components/layout/app-shell.tsx
- src/App.tsx
- (deleted) src/components/preferences/provider-setup-dialog.tsx
- tasks.md

## Self-Tests

Commands:

```bash
pnpm lint
pnpm test:ci
pnpm dev -- --port 3002
```

Manual checks:

- Header shows “Stats” and “Settings” buttons; no Provider dialog button.
- Visiting `/settings` shows provider directory inputs, Save/ Clear per provider, and Theme/Locale toggles.
- Empty chat list shows “Configure providers” button; clicking navigates to `/settings`.
- Loading sessions still works with sample data if paths are empty; after setting paths, refresh shows imported data.

## Risks, Blockers, Follow-ups

- Consider redirecting first-time users to `/settings` if env defaults are absent; currently, sample data loads by default.
- Future: Add server-side path validation (existence check) to improve UX.
- Update README screenshots (if any) that reference the old modal.
