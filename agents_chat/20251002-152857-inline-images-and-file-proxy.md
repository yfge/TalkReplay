## Summary

Finalize remaining changes: inline image rendering, horizontal overflow fixes, secure `/api/file` proxy, README screenshots refresh, and provider detail fallback.

## Code Highlights

- Chat detail: detect `image_url/url/uri/path/stdout`, render images inline; hide base64 when images exist; add aggressive wrapping.
- File proxy: `GET /api/file?p=` serves images from configured provider roots only.
- Docs: move screenshots to `docs/assets/`, update README(EN/ZH); add extra screens.
- Fallback: load session detail by probing providers when path not under configured roots.

## Self-Tests

- `pnpm test` passes.
- Visual: visit `/chats/<id>` with image tool results → images inline; long texts wrap; no horizontal scroll.
- Proxy: verify `/api/file?p=<base64url>` responds with correct mime.

## Touched Files

- src/components/chats/chat-detail.tsx
- src/app/api/file/route.ts
- README.md, README.zh.md, docs/assets/\*
- src/lib/session-loader/server.ts
