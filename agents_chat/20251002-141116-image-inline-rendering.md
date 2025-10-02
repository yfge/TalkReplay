## Summary

Fix chats detail page rendering so images referenced in messages are displayed inline instead of showing raw base64/JSON, and improve message card wrapping when encountering very long strings.

Context: On `/chats/<id>`, tool results and some messages can include image references (e.g., `{ type: "input_image", image_url: ... }`) or paths. Previously the UI only rendered raw JSON/base64 in `<pre>`, causing unreadable output and layout issues.

## Code Highlights

## Inline image handling in chat detail

```tsx
// src/components/chats/chat-detail.tsx
// 1) Make <pre> blocks wrap aggressively to avoid overflow
pre: (props) => (
  <pre className="my-3 max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs" {...props} />
),

// 2) Add markdown image styling
img: (props) => (
  <img className="my-2 max-h-[28rem] max-w-full rounded border object-contain" loading="lazy" {...props} />
),

// 3) Extract image URIs from attachments and common tool payload shapes
const imageUris = extractImageUris();

// 4) Serve local file paths via a safe API proxy
const toFileServerUrl = (raw: string) => {
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  const enc = (str: string) => btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `/api/file?p=${enc(raw)}`;
};

// 5) Prefer rendering images when present in tool-result; otherwise fall back to <pre>
{imageUris.length > 0 ? (
  <div className="flex flex-wrap gap-3">
    {imageUris.map((u, i) => (
      <img key={`${messageKey}:img:${i}`} src={toFileServerUrl(u)} className="max-h-[28rem] max-w-full rounded border object-contain" loading="lazy" />
    ))}
  </div>
) : (
  <pre className="whitespace-pre-wrap break-all font-mono text-xs">{resolvedContent}</pre>
)}
```

## New secure file proxy API

```ts
// src/app/api/file/route.ts
export async function GET(request: Request) {
  const encoded = new URL(request.url).searchParams.get("p") ?? "";
  const filePath = safeDecode(encoded); // base64url -> absolute path
  assertAllowedUnderProviderRoots(filePath); // CLAUDE_ROOT/CODEX_ROOT/GEMINI_ROOT
  const mime = mimeFromExt(extname(filePath));
  const data = await fs.readFile(filePath);
  return new NextResponse(data, { headers: { "Content-Type": mime } });
}
```

## Self-Tests

Commands:

```bash
pnpm dev
# Visit /chats/<id> pointing to a session with tool_result containing { type: "input_image", image_url: <path|data|http> }
```

Expected:

- Images render inline with proper containment (no overflow), not as base64/JSON text.
- When only text is present, long content wraps and does not clip cards.
- Markdown images (e.g., `![](url)`) obey `max-w-full` and height cap.

Observed (local):

- Tool result with image paths now show actual images via `/api/file?p=...`.
- Very long strings in `<pre>` wrap due to `break-all` and `max-w-full`.

## Risks / Follow-ups

- The image extraction uses heuristics (`image_url`, `url`, `uri`, `path`, `stdout`) and may miss provider-specific structures; extend when new patterns appear.
- The file proxy is restricted to configured provider roots; ensure `NEXT_PUBLIC_CODEX_ROOT`/`CLAUDE_ROOT` are set to allow local paths.
- Consider moving detection to provider adapters to emit `metadata.attachments` consistently.
- Add API tests around `/api/file` and expand UI tests for image rendering.

## Touched Files

- src/components/chats/chat-detail.tsx
- src/app/api/file/route.ts
