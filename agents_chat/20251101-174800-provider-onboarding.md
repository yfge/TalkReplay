## Summary

- Added an onboarding dialog that detects common Claude/Codex/Cursor/Gemini directories on first launch and persists completion state in the preferences store.
- Exposed `/api/providers/defaults` to reuse server-side path detection and fall back to platform heuristics when the probe is unavailable.
- Updated locale strings and documentation so the new wizard is reflected in both English and Chinese quick-start guides, and tracked the milestone in `tasks.md`.

## Code Highlights

```tsx
// src/components/preferences/provider-setup-dialog.tsx:29-264
export function ProviderSetupDialog({
  open,
  onClose,
  onCompleted,
}: ProviderSetupDialogProps) {
  const { t } = useTranslation();
  const providerPaths = usePreferencesStore((state) => state.providerPaths);
  const setProviderPath = usePreferencesStore((state) => state.setProviderPath);
  const clearProviderPath = usePreferencesStore(
    (state) => state.clearProviderPath,
  );
  const completeSetup = usePreferencesStore((state) => state.completeSetup);

  // Fetch OS-aware defaults, fall back to heuristics, and keep track of
  // user-edited inputs before committing paths back to the store.
```

```ts
// src/app/api/providers/defaults/route.ts:1-24
export async function GET(): Promise<NextResponse> {
  const entries = await Promise.all(
    PROVIDERS.map(async (provider) => {
      const value = await resolveDefaultProviderRoot(provider);
      return [provider, value] as const;
    }),
  );

  const defaults = Object.fromEntries(entries) as Record<
    ProviderId,
    string | undefined
  >;

  return NextResponse.json({ defaults });
}
```

```ts
// src/store/preferences-store.ts:37-75
hydrateProviderPaths: (paths) =>
  set((state) => {
    if (!paths) {
      return state;
    }
    const next: ProviderPaths = { ...state.providerPaths };
    let didUpdate = false;
    (
      Object.entries(paths) as [ProviderKey, string | undefined][]
    ).forEach(([provider, value]) => {
      if (!value) {
        return;
      }
      const current = next[provider];
      if (typeof current === "string" && current.trim().length > 0) {
        return;
      }
      next[provider] = value;
      didUpdate = true;
    });
    if (!didUpdate) {
      return state;
    }
    return {
      providerPaths: next,
      isSetupComplete: state.isSetupComplete,
    };
  }),
```

## Self-Tests

- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `curl http://localhost:4010/_next/static/chunks/245-24278fc515db6384.js` (after reinstalling CLI pack) → `200`
- Verified onboarding dialog does not loop by completing setup twice in the same session (no React depth errors observed after setState guard adjustments).
- `curl http://localhost:4010/brand/icon-gradient.svg` (after reinstalling CLI pack) → `200`
