## Summary

- Simplified the header branding by keeping only the gradient icon and rendering the title via gradient text to avoid the stacked icon+wordmark combo.
- Ensured light/dark styling stays consistent without the wordmark assets.

Referenced files: src/components/layout/app-shell.tsx

## Code Highlights

```tsx
<h1 className="text-xl font-semibold text-foreground sm:text-2xl sm:font-bold sm:tracking-tight">
  <span className="sm:bg-gradient-to-r sm:from-[hsl(var(--primary))] sm:to-[hsl(var(--secondary))] sm:bg-clip-text sm:text-transparent">
    {t("header.title")}
  </span>
</h1>
```

## Self-Tests

- `pnpm lint`
- `pnpm exec vitest run`
- `pnpm format`

## Risks / Follow-ups

- Verify contrast of the gradient title text on very narrow viewports; adjust base color if readability drops.
