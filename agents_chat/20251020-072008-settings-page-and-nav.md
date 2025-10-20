## Summary

Added `/settings` page and a persistent header navigation entry to it. The settings page provides a simple form to edit provider directories (Claude, Codex, Gemini) and exposes theme and language toggles, aligning with the spec’s `/settings` route requirement.

## Code Highlights

```tsx
// src/app/settings/page.tsx
// - Reads & writes provider paths via usePreferencesStore
// - Validates Windows-reserved characters and colon usage
// - Saves updates and shows a simple saved indicator
// - Includes LocaleToggle and ThemeToggle
// - Back to chats link
```

```tsx
// src/components/layout/app-shell.tsx
// - Adds header navigation buttons for /stats and /settings
```

```json
// i18n additions
// src/locales/en/common.json: header.settings + settings.* strings
// src/locales/zh-CN/common.json: header.settings + settings.* strings
```

```md
// tasks update
// tasks.md (1.B – UI & Interaction):

- Marked "/settings" page as done
- Marked header nav to "/settings" as done
```

## Self-Tests

Commands:

```bash
pnpm lint
pnpm test:ci
pnpm dev -- --port 3002
```

Manual checks:

- Open `/settings`: page renders with Theme/Locale toggles and provider path inputs.
- Enter valid/invalid paths; invalid shows inline error; Save updates store; shows “Saved”.
- Click “Back to chats” returns to `/`.
- Header shows “Settings” button globally; clicking it opens `/settings`.

Expected vs Actual:

- Expected interactions work; store reflects changes; no runtime errors. Actual: Behaves as expected with sample data.

## Risks, Blockers, Follow-ups

- Validation is basic; consider async directory existence checks server-side in future.
- Could refactor shared validation with ProviderSetupDialog to a common util.
- Add component tests for settings form once finalized.
