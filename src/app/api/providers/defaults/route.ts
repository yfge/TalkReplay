"use server";

import { NextResponse } from "next/server";

import { resolveDefaultProviderRoot } from "@/lib/session-loader/server";
import type { ProviderId } from "@/types/providers";

const PROVIDERS: ProviderId[] = ["claude", "codex", "cursor", "gemini"];

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
