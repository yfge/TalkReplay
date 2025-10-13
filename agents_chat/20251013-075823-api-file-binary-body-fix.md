## Summary

Fix API file route to return a plain Uint8Array body instead of Node Buffer to satisfy the Web Response constructor.

## Code Highlights

- Updated: src/app/api/file/route.ts

```ts
const body = new Uint8Array(data);
return new NextResponse(body, {
  status: 200,
  headers: { "Content-Type": mime },
});
```

## Self-Tests

- pnpm build → success
- Fetch an image/file via /api/file → Content-Type correct, bytes intact
