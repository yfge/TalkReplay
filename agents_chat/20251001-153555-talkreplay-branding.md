## Summary

- Renamed the application metadata, header banner, and test assertions to TalkReplay so the UI and document title match the project rebrand.
- Updated i18n strings in English and Chinese to reflect the new name and refreshed subtitle copy.

## Code Highlights

```tsx
// src/app/layout.tsx
export const metadata = {
  title: "TalkReplay",
  description:
    "Vibe coding replay hub for Claude and Codex transcripts with filters, stats, and sharing tools.",
};
```

```json
// src/locales/en/common.json
"title": "TalkReplay",
"subtitle": "Replay and curate your Claude and Codex vibe coding sessions."
```

```ts
// src/App.test.tsx
expect(await screen.findByText(/TalkReplay/i)).toBeInTheDocument();
```

## Self-Tests

- `pnpm lint`
- `pnpm test`

## Risks / Follow-ups

- None; confirm browsers with cached translations refresh to the latest bundle.

## References

- src/app/layout.tsx
- src/locales/en/common.json
- src/locales/zh-CN/common.json
- src/App.test.tsx
