## Summary

- Fixed Next.js hydration mismatch caused by the client applying persisted Chinese locale before hydration, while the server rendered English defaults.
- Delayed locale switching until after mount and synchronised the document `lang` attribute so server/client markup starts aligned and updates safely post-hydration.

## Code Highlights

- `src/lib/i18n.ts` now keeps initial language at the default during SSR, adds `resolveInitialLocale` and document sync helpers, and updates `changeLocale` to set `document.documentElement.lang`.
- `src/app/providers.tsx` hydrates client locale inside a `useEffect`, calling `changeLocale` only after mount to avoid mismatched initial text nodes.

```tsx
// src/app/providers.tsx
useEffect(() => {
  const locale = resolveInitialLocale();
  if (i18n.language !== locale) {
    changeLocale(locale);
  } else {
    syncDocumentLocale(locale);
  }
}, []);
```

## Self-Tests

- `pnpm test -- --runInBand`
  - Expected: existing unit suites pass.
  - Actual: all vitest suites passed (3/3).

## Risks / Follow-ups

- Locale preference currently persists via `localStorage`; consider promoting to cookies or server-detectable storage to render translated markup during SSR.
- Manual verification on `localhost:3002` recommended to confirm no residual hydration warnings and that locale toggle still updates immediately.

## Touched Files

- `src/app/providers.tsx`
- `src/lib/i18n.ts`
