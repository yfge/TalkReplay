import { NextResponse } from "next/server";
import { extname } from "node:path";

import { getProviderPaths } from "@/config/providerPaths";
import { decodeSessionId } from "@/lib/session-loader/ids";
import { normalizeProviderRoot } from "@/lib/session-loader/server";

export const runtime = "nodejs";

function mimeFromExt(ext: string): string | null {
  switch (ext.toLowerCase()) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    default:
      return null;
  }
}

async function getAllowedRoots(): Promise<string[]> {
  const paths = getProviderPaths();
  const roots: string[] = [];
  const { path: c } = await normalizeProviderRoot(paths.claude);
  if (c) roots.push(c);
  const { path: x } = await normalizeProviderRoot(paths.codex);
  if (x) roots.push(x);
  const { path: g } = await normalizeProviderRoot(paths.gemini);
  if (g) roots.push(g);
  return roots;
}

function isUnderAnyRoot(filePath: string, roots: string[]): boolean {
  return roots.some((root) => filePath.startsWith(root));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const encoded = url.searchParams.get("p") ?? "";
    if (!encoded) {
      return NextResponse.json({ error: "Missing 'p'" }, { status: 400 });
    }

    let filePath = encoded;
    try {
      filePath = decodeSessionId(encoded);
    } catch {
      // Not base64url; accept raw path only if it resolves under allowed roots
    }

    const ext = extname(filePath);
    const mime = mimeFromExt(ext);
    if (!mime) {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 415 },
      );
    }

    const roots = await getAllowedRoots();
    if (roots.length === 0 || !isUnderAnyRoot(filePath, roots)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const fs = await import("node:fs/promises");
    let data: Buffer;
    try {
      data = await fs.readFile(filePath);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Not found" },
        { status: 404 },
      );
    }

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Cache-Control": "public, max-age=600",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to serve file",
      },
      { status: 500 },
    );
  }
}
