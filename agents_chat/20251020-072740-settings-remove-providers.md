## Summary

Simplified the `/settings` page by removing the provider directories form. Settings now focuses on theme and language; provider directories remain configurable via the header’s “Configure providers” dialog, as hinted by the existing notice string.

## Code Highlights

```tsx
// src/app/settings/page.tsx
- Removed provider paths fields, validation, and save handling
+ Kept LocaleToggle and ThemeToggle, and a short note using providerSetup.notice
```

```md
// tasks update
// tasks.md (1.B – UI & Interaction): adjusted the settings bullet to reflect theme/language only.
```

## Self-Tests

Commands:

```bash
pnpm lint
pnpm test:ci
pnpm dev -- --port 3002
```

Manual checks:

- Open `/settings`: only shows Theme/Locale toggles and a note about configuring providers from the header.
- Header “Configure providers” still opens the Provider Setup dialog.
- Navigation to and from `/settings` and `/stats` continues to work.

## Risks, Blockers, Follow-ups

- If future requirements add more preferences, consider a dedicated preferences section with headings.
- Provider validation is still available in the dialog; no regression expected.
